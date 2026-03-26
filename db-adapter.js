// Database adapter that supports both SQLite (local) and Supabase/Postgres (Vercel)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;
let dbType = null;

// Check if we should use Postgres (Supabase) or SQLite
const DATABASE_URL = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const usePostgres = DATABASE_URL && /^postgres(ql)?:\/\//i.test(DATABASE_URL);

function normalizePostgresUrl(url) {
    const s = String(url).trim();
    const isLocal = /localhost|127\.0\.0\.1/i.test(s);
    if (isLocal || /sslmode=/i.test(s)) return s;
    const join = s.includes('?') ? '&' : '?';
    return `${s}${join}sslmode=require`;
}

if (usePostgres) {
    // Use Supabase/Postgres
    dbType = 'postgres';
    const { Pool } = require('pg');
    const connectionString = normalizePostgresUrl(DATABASE_URL);
    const isLocalPg = /localhost|127\.0\.0\.1/i.test(connectionString);
    const pool = new Pool({
        connectionString,
        max: isVercel ? 1 : 10,
        connectionTimeoutMillis: isVercel ? 20000 : 10000,
        idleTimeoutMillis: isVercel ? 60000 : 30000,
        // Managed Postgres (Supabase, Neon, Railway, etc.) almost always requires TLS
        ssl: isLocalPg ? false : { rejectUnauthorized: false }
    });

    // Ensure DDL completes before queries; must reject on failure (do not swallow errors)
    const pgReady = initializePostgresTables(pool).catch((err) => {
        console.error('⚠️  Postgres table init failed:', err.code || '', err.message);
        return Promise.reject(err);
    });

    function preparePgQuery(query) {
        return convertSQLiteToPostgres(query);
    }

    // Create a SQLite-compatible interface for Postgres
    db = {
        pool: pool,
        
        // Convert SQLite query to Postgres and execute
        get: (query, params, callback) => {
            pgReady.then(() => {
                const pgQuery = preparePgQuery(query);
                return pool.query(pgQuery, params || []);
            })
                .then(result => {
                    callback(null, result.rows[0] || null);
                })
                .catch(err => {
                    callback(err, null);
                });
        },
        
        run: (query, params, callback) => {
            pgReady.then(() => {
                const pgQuery = preparePgQuery(query);
                let finalQuery = pgQuery;
                if (finalQuery.trim().toUpperCase().startsWith('INSERT') && !finalQuery.includes('RETURNING')) {
                    finalQuery = finalQuery.replace(/;?\s*$/, '') + ' RETURNING id';
                }
                return pool.query(finalQuery, params || []);
            })
                .then(result => {
                    const mockResult = {
                        lastID: result.rows[0]?.id || 0,
                        changes: result.rowCount || 0,
                        rows: result.rows || []
                    };
                    if (callback) callback(null, mockResult);
                    return mockResult;
                })
                .catch(err => {
                    if (callback) callback(err);
                });
        },
        
        all: (query, params, callback) => {
            pgReady.then(() => {
                const pgQuery = preparePgQuery(query);
                return pool.query(pgQuery, params || []);
            })
                .then(result => {
                    callback(null, result.rows);
                })
                .catch(err => {
                    callback(err, []);
                });
        },
        
        each: (query, params, callback, complete) => {
            pgReady.then(() => {
                const pgQuery = preparePgQuery(query);
                return pool.query(pgQuery, params || []);
            })
                .then(result => {
                    result.rows.forEach((row, index) => {
                        callback(null, row, index);
                    });
                    if (complete) complete(null, result.rows.length);
                })
                .catch(err => {
                    if (complete) complete(err, 0);
                });
        },
        
        close: (callback) => {
            pool.end()
                .then(() => {
                    if (callback) callback(null);
                })
                .catch(err => {
                    if (callback) callback(err);
                });
        }
    };
    
    console.log('✅ Connected to Supabase/Postgres database');
    
} else if (isVercel) {
    // On Vercel but no DATABASE_URL - show error
    console.error('❌ ERROR: DATABASE_URL not set. Please configure Supabase or another Postgres database.');
    console.error('   See SUPABASE_SETUP.md for instructions.');
    
    db = {
        get: (query, params, callback) => {
            const err = new Error('DATABASE_URL not configured. See SUPABASE_SETUP.md');
            if (callback) callback(err, null);
        },
        run: (query, params, callback) => {
            const err = new Error('DATABASE_URL not configured. See SUPABASE_SETUP.md');
            if (callback) callback(err);
            return { lastID: 0, changes: 0 };
        },
        all: (query, params, callback) => {
            const err = new Error('DATABASE_URL not configured. See SUPABASE_SETUP.md');
            if (callback) callback(err, []);
        },
        each: (query, params, callback, complete) => {
            const err = new Error('DATABASE_URL not configured. See SUPABASE_SETUP.md');
            if (complete) complete(err, 0);
        },
        close: (callback) => {
            if (callback) callback(null);
        }
    };
    dbType = 'mock';
    
} else {
    // Local development - use SQLite
    dbType = 'sqlite';
    const dbPath = path.join(__dirname, 'pantry_pal.db');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err);
        } else {
            console.log('✅ Connected to SQLite database');
            initializeSQLiteTables(db);
        }
    });
}

// Replace SQLite ? placeholders with Postgres $1, $2, ... (required by node-pg)
function convertQuestionMarksToPgPlaceholders(query) {
    let n = 0;
    return String(query).replace(/\?/g, () => `$${++n}`);
}

// Convert SQLite syntax to Postgres syntax
function convertSQLiteToPostgres(query) {
    let pgQuery = convertQuestionMarksToPgPlaceholders(query);
    
    // Replace INTEGER PRIMARY KEY AUTOINCREMENT with SERIAL PRIMARY KEY
    pgQuery = pgQuery.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    
    // Replace DATETIME with TIMESTAMP
    pgQuery = pgQuery.replace(/DATETIME/gi, 'TIMESTAMP');
    
    // Replace AUTOINCREMENT with SERIAL (for other cases)
    pgQuery = pgQuery.replace(/AUTOINCREMENT/gi, '');
    
    return pgQuery;
}

// Initialize Postgres tables
async function initializePostgresTables(pool) {
    // Create users table (no UNIQUE(provider, provider_id): blocks multiple email/password rows on some setups)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            name TEXT,
            provider TEXT,
            provider_id TEXT,
            is_admin INTEGER DEFAULT 0,
            email_verified INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Drop legacy composite unique if present (allows many NULL provider rows for password accounts)
    await pool.query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_provider_provider_id_key
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_identity
        ON users (provider, provider_id)
        WHERE provider IS NOT NULL AND provider_id IS NOT NULL
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS verification_codes (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0
        )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email)`);

    console.log('✅ Database tables initialized');
}

// Initialize SQLite tables
function initializeSQLiteTables(db) {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT,
        provider TEXT,
        provider_id TEXT,
        is_admin INTEGER DEFAULT 0,
        email_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_id)
    )`, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('✅ Users table ready');
            // Add columns if they don't exist (for existing databases)
            db.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`, (err) => {});
            db.run(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`, (err) => {});
        }
    });

    // Create verification codes table
    db.run(`CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0
    )`, (err) => {
        if (err) {
            console.error('Error creating verification_codes table:', err);
        } else {
            console.log('✅ Verification codes table ready');
        }
    });
}

module.exports = db;


// Database adapter that supports both SQLite (local) and Supabase/Postgres (Vercel)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;
let dbType = null;

// Check if we should use Postgres (Supabase) or SQLite
const DATABASE_URL = process.env.DATABASE_URL;
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const usePostgres = DATABASE_URL && DATABASE_URL.startsWith('postgresql://');

if (usePostgres) {
    // Use Supabase/Postgres
    dbType = 'postgres';
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false
    });

    // Create a SQLite-compatible interface for Postgres
    db = {
        pool: pool,
        
        // Convert SQLite query to Postgres and execute
        get: (query, params, callback) => {
            const pgQuery = convertSQLiteToPostgres(query);
            pool.query(pgQuery, params || [])
                .then(result => {
                    callback(null, result.rows[0] || null);
                })
                .catch(err => {
                    callback(err, null);
                });
        },
        
        run: (query, params, callback) => {
            const pgQuery = convertSQLiteToPostgres(query);
            // For INSERT queries, add RETURNING id if not present
            let finalQuery = pgQuery;
            if (pgQuery.trim().toUpperCase().startsWith('INSERT') && !pgQuery.includes('RETURNING')) {
                finalQuery = pgQuery.replace(/;?\s*$/, '') + ' RETURNING id';
            }
            
            pool.query(finalQuery, params || [])
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
                    throw err;
                });
        },
        
        all: (query, params, callback) => {
            const pgQuery = convertSQLiteToPostgres(query);
            pool.query(pgQuery, params || [])
                .then(result => {
                    callback(null, result.rows);
                })
                .catch(err => {
                    callback(err, []);
                });
        },
        
        each: (query, params, callback, complete) => {
            const pgQuery = convertSQLiteToPostgres(query);
            pool.query(pgQuery, params || [])
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
    
    // Initialize tables (Postgres uses SERIAL instead of AUTOINCREMENT)
    initializePostgresTables(pool);
    
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

// Convert SQLite syntax to Postgres syntax
function convertSQLiteToPostgres(query) {
    let pgQuery = query;
    
    // Replace SQLite placeholders (?) with Postgres ($1, $2, etc.)
    // This is a simple approach - for production, use a proper query builder
    // But for our use case, we'll handle it in the adapter by using parameterized queries
    
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
    try {
        // Create users table
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(provider, provider_id)
            )
        `);
        
        // Create verification_codes table
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
        
        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email)
        `);
        
        console.log('✅ Database tables initialized');
    } catch (err) {
        console.error('Error initializing tables:', err);
    }
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


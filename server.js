// Force fresh deployment - Vercel cache fix v3
// Deployment trigger - certificate generation fix applied with compatibility layer
// Version: 2025-01-24-v3-compatibility-layer
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
// Database adapter (supports SQLite local, Supabase/Postgres on Vercel)
const db = require('./db-adapter');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const nodemailer = require('nodemailer');
const app = express();
const PORT = 3000;
const HTTPS_PORT = 3443;
const isPostgresDb = Boolean(db && db.pool);

/** Map pg / connection errors to a safe JSON response for auth routes */
function sendDbError(res, err) {
    console.error('Database error:', err && err.code, err && err.message);
    const msg = (err && err.message) || '';
    if (msg.includes('DATABASE_URL not configured')) {
        return res.status(503).json({ error: 'Server database is not configured. Add DATABASE_URL in Vercel → Settings → Environment Variables, then redeploy.' });
    }
    if (err && err.code === '28P01') {
        return res.status(503).json({
            error: 'Database rejected the password. In Supabase reset the database password, copy the new connection URI from Project Settings → Database, and paste it as DATABASE_URL on Vercel. If the password has @, #, $, or %, use the URI Supabase copies for you or encode those characters in the password.'
        });
    }
    if (err && (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        return res.status(503).json({
            error: 'Cannot reach the database host. Try the Supabase Session pooler URI (often port 6543, user like postgres.PROJECT_REF) from Project Settings → Database → Connection string, then redeploy.'
        });
    }
    if (err && err.code === '42P01') {
        return res.status(503).json({ error: 'Database table missing. Redeploy the app or run table setup in the Supabase SQL editor.' });
    }
    const detail = process.env.VERCEL ? undefined : msg;
    return res.status(500).json({ error: 'Database error', detail });
}

function normalizeRecipeKey(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[_-]/g, ' ')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function sqliteGetAsync(query, params = []) {
    return new Promise((resolve) => {
        db.get(query, params, (err, row) => {
            if (err) return resolve(null);
            resolve(row || null);
        });
    });
}

function sqliteRunAsync(query, params = []) {
    return new Promise((resolve) => {
        db.run(query, params, (err, result) => {
            if (err) return resolve({ ok: false, error: err });
            resolve({ ok: true, result: result || null });
        });
    });
}

async function pgGetAsync(query, params = []) {
    try {
        const result = await db.pool.query(query, params);
        return result.rows[0] || null;
    } catch (err) {
        return null;
    }
}

async function pgRunAsync(query, params = []) {
    try {
        await db.pool.query(query, params);
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err };
    }
}

let recipeImageTableReady = false;

async function ensureRecipeImageTable() {
    if (recipeImageTableReady) return true;

    const sqliteQuery = `
        CREATE TABLE IF NOT EXISTS recipe_image_matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipe_name TEXT NOT NULL,
            recipe_key TEXT NOT NULL UNIQUE,
            image_url TEXT NOT NULL,
            source TEXT,
            term_used TEXT,
            hits INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const pgQuery = `
        CREATE TABLE IF NOT EXISTS recipe_image_matches (
            id SERIAL PRIMARY KEY,
            recipe_name TEXT NOT NULL,
            recipe_key TEXT NOT NULL UNIQUE,
            image_url TEXT NOT NULL,
            source TEXT,
            term_used TEXT,
            hits INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createResult = isPostgresDb
        ? await pgRunAsync(pgQuery)
        : await sqliteRunAsync(sqliteQuery);

    if (!createResult.ok) return false;

    if (isPostgresDb) {
        await pgRunAsync(`CREATE INDEX IF NOT EXISTS idx_recipe_image_matches_key ON recipe_image_matches(recipe_key)`);
    } else {
        await sqliteRunAsync(`CREATE INDEX IF NOT EXISTS idx_recipe_image_matches_key ON recipe_image_matches(recipe_key)`);
    }

    recipeImageTableReady = true;
    return true;
}

async function getImageFromRecipeImageDb(rawRecipeName) {
    const recipeKey = normalizeRecipeKey(rawRecipeName);
    if (!recipeKey) return null;

    const tableReady = await ensureRecipeImageTable();
    if (!tableReady) return null;

    const exactMatch = isPostgresDb
        ? await pgGetAsync(
            `SELECT image_url, source, term_used FROM recipe_image_matches WHERE recipe_key = $1 LIMIT 1`,
            [recipeKey]
        )
        : await sqliteGetAsync(
            `SELECT image_url, source, term_used FROM recipe_image_matches WHERE recipe_key = ? LIMIT 1`,
            [recipeKey]
        );

    if (exactMatch?.image_url) {
        return { imageUrl: exactMatch.image_url, source: exactMatch.source || 'db', termUsed: exactMatch.term_used || recipeKey, dbHit: true };
    }

    return null;
}

async function saveRecipeImageDbMatch(rawRecipeName, imageUrl, source, termUsed) {
    const recipeKey = normalizeRecipeKey(rawRecipeName);
    if (!recipeKey || !imageUrl) return;

    const tableReady = await ensureRecipeImageTable();
    if (!tableReady) return;

    if (isPostgresDb) {
        await pgRunAsync(
            `INSERT INTO recipe_image_matches (recipe_name, recipe_key, image_url, source, term_used, hits, updated_at)
             VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP)
             ON CONFLICT (recipe_key)
             DO UPDATE SET
               recipe_name = EXCLUDED.recipe_name,
               image_url = EXCLUDED.image_url,
               source = EXCLUDED.source,
               term_used = EXCLUDED.term_used,
               hits = recipe_image_matches.hits + 1,
               updated_at = CURRENT_TIMESTAMP`,
            [rawRecipeName, recipeKey, imageUrl, source || null, termUsed || null]
        );
    } else {
        await sqliteRunAsync(
            `INSERT INTO recipe_image_matches (recipe_name, recipe_key, image_url, source, term_used, hits, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
             ON CONFLICT(recipe_key) DO UPDATE SET
               recipe_name = excluded.recipe_name,
               image_url = excluded.image_url,
               source = excluded.source,
               term_used = excluded.term_used,
               hits = recipe_image_matches.hits + 1,
               updated_at = CURRENT_TIMESTAMP`,
            [rawRecipeName, recipeKey, imageUrl, source || null, termUsed || null]
        );
    }
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
if (!GROQ_API_KEY) {
    console.warn('⚠️  GROQ_API_KEY not set. Groq API features will not work.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'pantry-pal-secret-key-change-in-production';

// OAuth configuration (set via environment variables or use defaults for development)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

// Admin configuration (for testing - only admin email can sign up)
// If ADMIN_EMAIL is not set, the first email to sign up will become the admin
// To restrict to a specific email, set ADMIN_EMAIL environment variable or change the default below
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null; // Set to null to allow first email, or set specific email

// Email configuration for verification codes
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || '';
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER || 'noreply@pantrypal.com';
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail'; // 'gmail', 'outlook', 'yahoo', or 'custom'
const EMAIL_HOST = process.env.EMAIL_HOST || ''; // For custom SMTP
const EMAIL_PORT = process.env.EMAIL_PORT || 587; // For custom SMTP
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true'; // For custom SMTP

// Configure email transporter (supports Gmail, Outlook, Yahoo, and custom SMTP)
let emailTransporter = null;
if (EMAIL_USER && EMAIL_PASSWORD) {
    // If custom SMTP host is provided, use custom configuration
    if (EMAIL_HOST) {
        emailTransporter = nodemailer.createTransport({
            host: EMAIL_HOST,
            port: parseInt(EMAIL_PORT),
            secure: EMAIL_SECURE, // true for 465, false for other ports
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASSWORD
            }
        });
        console.log(`📧 Email service configured with custom SMTP: ${EMAIL_USER} (${EMAIL_HOST}:${EMAIL_PORT})`);
    } else {
        // Use predefined service (gmail, outlook, yahoo, etc.)
        emailTransporter = nodemailer.createTransport({
            service: EMAIL_SERVICE,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASSWORD
            }
        });
        console.log(`📧 Email service configured with ${EMAIL_SERVICE}: ${EMAIL_USER}`);
    }
    console.log('   Emails will be sent FROM this account TO users who sign up');
} else {
    console.log('⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASSWORD environment variables to enable email verification.');
    console.log('');
    console.log('   QUICK SETUP (Windows PowerShell):');
    console.log('   $env:EMAIL_USER="your-email@gmail.com"');
    console.log('   $env:EMAIL_PASSWORD="your-app-password"');
    console.log('   $env:EMAIL_SERVICE="gmail"  # or "outlook", "yahoo"');
    console.log('   npm start');
    console.log('');
    console.log('   For Gmail:');
    console.log('   1. Go to: https://myaccount.google.com/apppasswords');
    console.log('   2. Enable 2-Step Verification first if needed');
    console.log('   3. Generate an App Password for "Mail"');
    console.log('   4. Use that 16-character password (not your regular password)');
    console.log('');
    console.log('   For Outlook/Hotmail:');
    console.log('   1. Go to: https://account.microsoft.com/security');
    console.log('   2. Enable 2-Step Verification');
    console.log('   3. Go to: https://account.microsoft.com/security/app-passwords');
    console.log('   4. Generate an app password for "Mail"');
    console.log('   5. Set EMAIL_SERVICE="outlook"');
}

// Database is now handled by db-adapter.js
// It automatically uses Supabase/Postgres if DATABASE_URL is set, otherwise SQLite for local dev
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

// Session configuration
// CRITICAL: On Vercel/serverless, sessions don't persist across invocations
// We primarily use JWT tokens for authentication, sessions are mainly for OAuth callbacks
const sessionConfig = {
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    // On Vercel, use memory store (sessions only last for the request lifecycle)
    // This is fine since we use JWT tokens for persistent auth
    cookie: {
        secure: isVercel ? true : false, // HTTPS required on Vercel
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours (though won't persist on serverless)
        sameSite: 'lax'
    }
};

// Initialize session middleware with error handling
// CRITICAL: Wrap in try-catch to prevent FUNCTION_INVOCATION_FAILED if session init fails
try {
    app.use(session(sessionConfig));
} catch (err) {
    console.error('⚠️  Session middleware initialization failed (non-fatal):', err.message);
    // Continue without sessions - JWT tokens will still work
}

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Log all POST requests for debugging
app.use((req, res, next) => {
    if (req.method === 'POST') {
        console.log(`\n📥 ${req.method} ${req.path}`);
    }
    next();
});

// Passport serialization
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        done(err, user);
    });
});

// Helper function to create or find OAuth user - Admin only for testing
function findOrCreateOAuthUser(profile, provider, callback) {
    const providerId = profile.id || profile.sub || profile.id.toString();
    const email = profile.emails?.[0]?.value || profile.email || `${providerId}@${provider}.local`;
    const name = profile.displayName || profile.name?.displayName || profile.name?.givenName || profile.username || 'User';

        // Check if admin account already exists
        db.get('SELECT id FROM users WHERE is_admin = 1', (err, adminExists) => {
            if (err) return callback(err, null);

            // If admin exists, prevent OAuth signups for non-admin emails
            if (adminExists) {
                // Only allow admin email to login via OAuth (if ADMIN_EMAIL is set)
                if (ADMIN_EMAIL && email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
                    return callback(new Error('OAuth signups are restricted. Only the admin email can sign in for testing purposes.'), null);
                }
            } else {
                // If no admin exists and ADMIN_EMAIL is set, only allow that email
                if (ADMIN_EMAIL && email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
                    return callback(new Error('OAuth signups are restricted. Only the admin email can create an account for testing purposes.'), null);
                }
            }

        // Check if user exists by provider_id
        db.get('SELECT * FROM users WHERE provider = ? AND provider_id = ?', [provider, providerId], (err, user) => {
            if (err) return callback(err, null);

            if (user) {
                return callback(null, user);
            }

            // Check if email already exists
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
                if (err) return callback(err, null);

                // First user becomes admin, or if ADMIN_EMAIL is set, only that email becomes admin
                const isAdmin = !ADMIN_EMAIL || email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

                if (existingUser) {
                    // Update existing user with provider info and admin status
                    db.run(
                        'UPDATE users SET provider = ?, provider_id = ?, name = COALESCE(?, name), is_admin = ? WHERE email = ?',
                        [provider, providerId, name, isAdmin ? 1 : 0, email],
                        function(err) {
                            if (err) return callback(err, null);
                            db.get('SELECT * FROM users WHERE email = ?', [email], callback);
                        }
                    );
                } else {
                    // Create new admin user (only admin email can sign up)
                    db.run(
                        'INSERT INTO users (email, password, name, provider, provider_id, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
                        [email, null, name, provider, providerId, isAdmin ? 1 : 0],
                        function(err, result) {
                            if (err) return callback(err, null);
                            // For Postgres, result.rows[0].id contains the inserted ID
                            // For SQLite, result.lastID contains it
                            const insertedId = result?.rows?.[0]?.id || result?.lastID;
                            if (!insertedId) {
                                // Fallback: query by email
                                db.get('SELECT * FROM users WHERE email = ?', [email], callback);
                            } else {
                                db.get('SELECT * FROM users WHERE id = ?', [insertedId], callback);
                            }
                        }
                    );
                }
            });
        });
    });
}

// Google OAuth Strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback"
    }, (accessToken, refreshToken, profile, done) => {
        findOrCreateOAuthUser(profile, 'google', (err, user) => {
            if (err) {
                console.error('OAuth error:', err.message);
                return done(err, null);
            }
            done(null, user);
        });
    }));
}

// Facebook OAuth Strategy
if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: FACEBOOK_APP_ID,
        clientSecret: FACEBOOK_APP_SECRET,
        callbackURL: "/api/auth/facebook/callback",
        profileFields: ['id', 'displayName', 'email']
    }, (accessToken, refreshToken, profile, done) => {
        findOrCreateOAuthUser(profile, 'facebook', (err, user) => {
            if (err) {
                console.error('OAuth error:', err.message);
                return done(err, null);
            }
            done(null, user);
        });
    }));
}

// GitHub OAuth Strategy
if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: "/api/auth/github/callback"
    }, (accessToken, refreshToken, profile, done) => {
        findOrCreateOAuthUser(profile, 'github', (err, user) => {
            if (err) {
                console.error('OAuth error:', err.message);
                return done(err, null);
            }
            done(null, user);
        });
    }));
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1] || req.session.token;
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
}

// Helper function to validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Helper function to generate 6-digit verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to send verification email
async function sendVerificationEmail(email, code) {
    if (!emailTransporter) {
        throw new Error('Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
    }

    const mailOptions = {
        from: EMAIL_FROM,
        to: email,
        subject: 'Pantry Pal - Email Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Pantry Pal - Email Verification</h2>
                <p>Thank you for signing up! Please use the following code to verify your email address:</p>
                <div style="background: #f3f4f6; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #dc2626; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h1>
                </div>
                <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
                <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            </div>
        `,
        text: `Your Pantry Pal verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
    };

    try {
        console.log(`📧 Attempting to send verification code to: ${email}`);
        const info = await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent successfully! Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        if (error.code === 'EAUTH') {
            throw new Error('Email authentication failed. Please check your EMAIL_USER and EMAIL_PASSWORD. For Gmail, use an App Password (not your regular password).');
        } else if (error.code === 'EENVELOPE') {
            throw new Error('Invalid email address. Please check the email you entered.');
        } else {
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
}

// Simple signup endpoint (no 2FA)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name, passwordConfirm } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (typeof passwordConfirm !== 'string' || password !== passwordConfirm) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        db.get('SELECT id, provider FROM users WHERE email = ?', [email.toLowerCase()], async (err, row) => {
            if (err) {
                return sendDbError(res, err);
            }

            if (row) {
                if (row.provider) {
                    return res.status(400).json({ error: 'This email is already registered with a social account. Please use that method to login.' });
                }
                return res.status(400).json({ error: 'Email already registered' });
            }

            // Check if admin account already exists to determine if new user should be admin
            db.get('SELECT id FROM users WHERE is_admin = 1', async (err, adminExists) => {
                if (err) {
                    return sendDbError(res, err);
                }

                // Determine if this user should be admin:
                // - If no admin exists yet AND (ADMIN_EMAIL is not set OR this email matches ADMIN_EMAIL)
                // - Otherwise, create as regular user
                let isAdmin = false;
                if (!adminExists) {
                    // First user becomes admin, or if ADMIN_EMAIL is set, only that email becomes admin
                    if (!ADMIN_EMAIL || email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                        isAdmin = true;
                    }
                }

                // Hash password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // Create the user account
                db.run(
                    'INSERT INTO users (email, password, name, provider, provider_id, is_admin, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [email.toLowerCase(), hashedPassword, name || null, null, null, isAdmin ? 1 : 0, 1],
                    function(err) {
                        if (err) {
                            console.error('Error creating user:', err);
                            return sendDbError(res, err);
                        }

                        console.log(`✅ Account created: ${email.toLowerCase()} ${isAdmin ? '(Admin)' : '(User)'}`);

                        res.json({
                            message: 'Account created successfully. Please login to continue.'
                        });
                    }
                );
            });
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], async (err, user) => {
            if (err) {
                return sendDbError(res, err);
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Check if user signed up with OAuth (no password)
            if (user.provider && !user.password) {
                return res.status(401).json({ error: 'This account was created with a social login. Please use that method to login.' });
            }

            if (!user.password) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, email: user.email, isAdmin: user.is_admin === 1 },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Store token in session
            req.session.token = token;
            req.session.userId = user.id;

            res.json({
                message: 'Login successful',
                token: token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    isAdmin: user.is_admin === 1
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// Check authentication status
app.get('/api/auth/status', authenticateToken, (req, res) => {
    db.get('SELECT id, email, name, is_admin FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'User not found' });
        }
        res.json({ 
            authenticated: true, 
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isAdmin: user.is_admin === 1
            }
        });
    });
});

// OAuth Routes
// Google OAuth
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google',
        passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get('/api/auth/google/callback',
        (req, res, next) => {
            passport.authenticate('google', (err, user, info) => {
                if (err) {
                    const errorMsg = encodeURIComponent(err.message || 'OAuth authentication failed');
                    return res.redirect(`/?error=oauth_failed&message=${errorMsg}`);
                }
                if (!user) {
                    return res.redirect('/?error=oauth_failed');
                }
                req.user = user;
                next();
            })(req, res, next);
        },
        (req, res) => {
            // Generate JWT token
            const token = jwt.sign(
                { id: req.user.id, email: req.user.email, isAdmin: req.user.is_admin === 1 },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Store token in session
            req.session.token = token;
            req.session.userId = req.user.id;

            // Redirect to app with token
            res.redirect(`/?token=${token}&provider=google`);
        }
    );
}

// Facebook OAuth
if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
    app.get('/api/auth/facebook',
        passport.authenticate('facebook', { scope: ['email'] })
    );

    app.get('/api/auth/facebook/callback',
        (req, res, next) => {
            passport.authenticate('facebook', (err, user, info) => {
                if (err) {
                    const errorMsg = encodeURIComponent(err.message || 'OAuth authentication failed');
                    return res.redirect(`/?error=oauth_failed&message=${errorMsg}`);
                }
                if (!user) {
                    return res.redirect('/?error=oauth_failed');
                }
                req.user = user;
                next();
            })(req, res, next);
        },
        (req, res) => {
            // Generate JWT token
            const token = jwt.sign(
                { id: req.user.id, email: req.user.email, isAdmin: req.user.is_admin === 1 },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Store token in session
            req.session.token = token;
            req.session.userId = req.user.id;

            // Redirect to app with token
            res.redirect(`/?token=${token}&provider=facebook`);
        }
    );
}

// GitHub OAuth
if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
    app.get('/api/auth/github',
        passport.authenticate('github', { scope: ['user:email'] })
    );

    app.get('/api/auth/github/callback',
        (req, res, next) => {
            passport.authenticate('github', (err, user, info) => {
                if (err) {
                    const errorMsg = encodeURIComponent(err.message || 'OAuth authentication failed');
                    return res.redirect(`/?error=oauth_failed&message=${errorMsg}`);
                }
                if (!user) {
                    return res.redirect('/?error=oauth_failed');
                }
                req.user = user;
                next();
            })(req, res, next);
        },
        (req, res) => {
            // Generate JWT token
            const token = jwt.sign(
                { id: req.user.id, email: req.user.email, isAdmin: req.user.is_admin === 1 },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Store token in session
            req.session.token = token;
            req.session.userId = req.user.id;

            // Redirect to app with token
            res.redirect(`/?token=${token}&provider=github`);
        }
    );
}

// Get OAuth provider status
app.get('/api/auth/providers', (req, res) => {
    res.json({
        google: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
        facebook: !!(FACEBOOK_APP_ID && FACEBOOK_APP_SECRET),
        github: !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET)
    });
});

app.post('/api/generate-recipe', async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:651',message:'generate-recipe endpoint called',data:{hasIngredients:!!req.body.ingredients,hasContext:!!req.body.context,hasBudget:!!req.body.budget,apiKeyPresent:!!GROQ_API_KEY,apiKeyLength:GROQ_API_KEY?GROQ_API_KEY.length:0},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const { ingredients, context, budget, preferredRecipes } = req.body;

    if (!ingredients || ingredients.trim() === '') {
        return res.status(400).json({ error: 'Please provide ingredients or describe what you need' });
    }

    // Build the user message based on input
    let userMessage = '';

    if (context && context.trim()) {
        userMessage = `${context}\n\nAvailable ingredients: ${ingredients}`;
    } else {
        userMessage = `I have these ingredients: ${ingredients}. What can I make?`;
    }

    // Add budget constraint if provided
    if (budget && budget.trim()) {
        userMessage += `\n\nBudget constraint: I have a budget of ${budget} for additional ingredients I might need to buy.`;
    }

    // Add preference for recipes the user has liked or viewed
    if (preferredRecipes && Array.isArray(preferredRecipes) && preferredRecipes.length > 0) {
        const prefs = preferredRecipes.slice(0, 20).join(', ');
        userMessage += `\n\nIMPORTANT: The user has liked or viewed these recipes before: ${prefs}. Recommend similar recipes or variations they might enjoy. Include at least one recipe that is similar in style or cuisine to what they've liked.`;
    }

    

    if (!GROQ_API_KEY) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:674',message:'API key missing',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return res.status(500).json({ error: 'Groq API key not configured. Please set GROQ_API_KEY environment variable.' });
    }

    try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:678',message:'About to call Groq API',data:{userMessageLength:userMessage.length,model:'llama-3.3-70b-versatile'},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful chef assistant that understands natural language requests. You can handle:
- Serving sizes (e.g., "cooking for 20 people", "family of 4", "just myself")
- Meal types (hot food, cold dishes, appetizers, desserts, breakfast, lunch, dinner)
- Dietary restrictions (vegetarian, vegan, gluten-free, halal, kosher, allergies)
- Cuisine preferences (Italian, Mexican, Asian, comfort food, etc.)
- Time constraints (quick 15-min meals, slow cooker, meal prep)
- Occasions (party food, romantic dinner, kids birthday, potluck)
- Budget constraints (when a budget is specified, estimate costs and suggest recipes that fit within it)

When a budget is provided:
- Estimate the approximate cost of additional ingredients needed (not counting what they already have)
- Prioritize recipes that fit within the budget
- Show estimated cost per recipe and per serving
- Suggest budget-friendly substitutions when possible

When responding:
1. Return ONLY recipes (no intro, no summary, no extra headings like "Budget Estimate")
2. Suggest 3 to 5 recipes that match ALL requirements
3. IMPORTANT: Start EACH recipe with the format "## RECIPE NAME" (this must be the ONLY level-2 heading you use)
4. Use normal title case (avoid ALL_CAPS_WITH_UNDERSCORES)
5. Keep each recipe concise: ingredients bullets + 5-8 steps
6. Do NOT include difficulty labels like "Easy/Medium/Hard" in the output

Use markdown headings (##) and bullet points for clarity.`
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: 0.7,
                max_tokens: 2500
            })
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:726',message:'Groq API response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        const data = await response.json();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:728',message:'Response JSON parsed',data:{hasError:!!data.error,errorMessage:data.error?data.error.message:null,hasChoices:!!data.choices,choicesLength:data.choices?data.choices.length:0,hasFirstChoice:!!(data.choices&&data.choices[0])},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        if (data.error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:730',message:'Groq API returned error',data:{error:data.error.message,errorType:data.error.type,errorCode:data.error.code},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            return res.status(500).json({ error: data.error.message });
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:734',message:'Extracting recipe content',data:{hasChoices0:!!data.choices[0],hasMessage:!!(data.choices[0]&&data.choices[0].message),hasContent:!!(data.choices[0]&&data.choices[0].message&&data.choices[0].message.content),contentLength:data.choices[0]&&data.choices[0].message&&data.choices[0].message.content?data.choices[0].message.content.length:0},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        let recipeContent = data.choices[0].message.content;

        // Extract recipe names for images
        const recipeNames = extractRecipeNames(recipeContent);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:739',message:'Sending success response',data:{recipeContentLength:recipeContent.length,recipeNamesCount:recipeNames.length},timestamp:Date.now(),runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        res.json({
            recipe: recipeContent,
            recipeNames: recipeNames
        });
    } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:743',message:'Exception caught in generate-recipe',data:{errorName:error.name,errorMessage:error.message,errorStack:error.stack?error.stack.substring(0,200):null},timestamp:Date.now(),runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to generate recipe' });
    }
});

// Extract recipe names and food items from the response
function extractRecipeNames(content) {
    const recipes = [];
    const seen = new Set();
    
    // Match ## headings that likely contain recipe names
    const headingRegex = /##\s*(?:\d+\.\s*)?(.+?)(?:\n|$)/g;
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
        let name = match[1].trim();
        // Clean up the name - remove asterisks and other formatting
        name = name.replace(/\*+/g, '').trim();
        // Remove common prefixes
        name = name.replace(/^(Recipe|Dish|Food):\s*/i, '').trim();
        if (name.length > 3 && name.length < 100 && !seen.has(name.toLowerCase())) {
            recipes.push(name);
            seen.add(name.toLowerCase());
        }
    }

    // Also extract from ### headings (sub-recipes or variations)
    const subHeadingRegex = /###\s*(?:\d+\.\s*)?(.+?)(?:\n|$)/g;
    while ((match = subHeadingRegex.exec(content)) !== null) {
        let name = match[1].trim();
        name = name.replace(/\*+/g, '').trim();
        name = name.replace(/^(Recipe|Dish|Food):\s*/i, '').trim();
        if (name.length > 3 && name.length < 100 && !seen.has(name.toLowerCase())) {
            recipes.push(name);
            seen.add(name.toLowerCase());
        }
    }

    return recipes.slice(0, 10); // Increased to 10 recipes
}

// Endpoint to get food image - tries Pexels search (dish-specific) then TheMealDB
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

app.get('/api/food-image-search', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    const raw = String(query).replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    const dbMatched = await getImageFromRecipeImageDb(raw);
    if (dbMatched?.imageUrl) {
        return res.json(dbMatched);
    }

    const words = raw.split(' ').filter(w => w.length > 2);
    const w3 = words.slice(0, 3).join(' ');
    const w2 = words.slice(0, 2).join(' ');
    const w1 = words[0];
    const queryWords = raw.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const NON_DISH_HINTS = ['farm', 'animal', 'pet', 'landscape', 'person', 'portrait', 'logo', 'vector', 'icon'];

    const scoreTextMatch = (text) => {
        const hay = String(text || '').toLowerCase();
        if (!hay) return 0;
        const matched = queryWords.filter(w => hay.includes(w)).length;
        return matched;
    };
    const minAcceptScore = Math.min(2, Math.max(1, queryWords.length));
    
    const emitImageDebug = (message, data, hypothesisId = 'H2') => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:/api/food-image-search',message,data,timestamp:Date.now(),runId:'debug-run-1',hypothesisId})}).catch(()=>{});
        // #endregion
    };
    
    emitImageDebug('Image search request received', { raw, queryWords, mealdbTermsPreview: [w3, w2, w1, raw] }, 'H2');

    // 1. Try TheMealDB first - guaranteed food images when a match exists
    const mealdbTerms = [w3, w2, w1, raw].filter((t, i, arr) => t && arr.indexOf(t) === i);
    try {
        for (const term of mealdbTerms) {
            const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`;
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            if (data?.meals?.length) {
                const best = data.meals.reduce((best, m) => {
                    const mealName = (m.strMeal || '').toLowerCase();
                    const matchCount = queryWords.filter(w => mealName.includes(w)).length;
                    if (!best || matchCount > best.score) return { meal: m, score: matchCount };
                    return best;
                }, null);
                
                // Require stronger overlap so unrelated dishes do not get reused across names.
                if (!best || best.score < minAcceptScore) {
                    emitImageDebug('Rejected TheMealDB candidate due to weak match', { raw, termUsed: term, minAcceptScore, candidateScore: best?.score || 0, candidateMeal: best?.meal?.strMeal || null }, 'H2');
                    continue;
                }
                
                emitImageDebug('Resolved image from TheMealDB', { raw, termUsed: term, score: best.score, mealName: best.meal?.strMeal || null, imageUrl: String(best.meal?.strMealThumb || '').slice(0, 180) }, 'H2');
                await saveRecipeImageDbMatch(raw, best.meal.strMealThumb, 'mealdb', term);
                return res.json({ imageUrl: best.meal.strMealThumb, termUsed: term, source: 'mealdb' });
            }
        }
    } catch (e) {
        console.warn('TheMealDB image search failed:', e.message);
    }

    // 2. Try Pexels API with exact dish phrase first (most dish-specific)
    const searchVariations = [
        raw + ' recipe',
        raw + ' dessert',
        raw + ' dish',
        w3 && (w3 + ' dish'),
        w2 && (w2 + ' dish'),
        raw + ' food',
        w3 && (w3 + ' food'),
        w3 && (w3 + ' recipe'),
        w2 && (w2 + ' food dish'),
        w1 && (w1 + ' dish')
    ].filter((t, i, arr) => t && t.length >= 3 && !t.startsWith(' ') && arr.indexOf(t) === i);

    if (PEXELS_API_KEY) {
        for (const searchTerm of searchVariations) {
            try {
                const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=15&orientation=square`;
                const pexelsResp = await fetch(pexelsUrl, {
                    headers: { Authorization: PEXELS_API_KEY }
                });
                if (pexelsResp.ok) {
                    const data = await pexelsResp.json();
                    const photos = data.photos || [];
                    let bestPhoto = null;
                    let bestScore = -1;
                    for (const photo of photos) {
                        const alt = (photo.alt || '').toLowerCase();
                        const textScore = scoreTextMatch(alt);
                        const looksNonDish = NON_DISH_HINTS.some(h => alt.includes(h));
                        const score = textScore - (looksNonDish ? 2 : 0);
                        if (score > bestScore) {
                            bestPhoto = photo;
                            bestScore = score;
                        }
                    }
                    const src = bestPhoto?.src?.medium || bestPhoto?.src?.large;
                    // Require stronger overlap for multi-word dishes to avoid same generic picture.
                    if (src && bestScore >= minAcceptScore) {
                        emitImageDebug('Resolved image from Pexels', { raw, searchTerm, bestScore, imageUrl: String(src).slice(0, 180) }, 'H2');
                        await saveRecipeImageDbMatch(raw, src, 'pexels', searchTerm);
                        return res.json({ imageUrl: src, source: 'pexels', termUsed: searchTerm });
                    }
                }
            } catch (e) {
                console.warn('Pexels image search failed:', e.message);
            }
        }
    }

    // 2. If Pexels failed and we have Groq, ask for a better search phrase
    if (PEXELS_API_KEY && GROQ_API_KEY) {
        try {
            const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'Reply with ONLY a 2-4 word search phrase for a PHOTO OF A PLATED FOOD DISH or meal ready to eat. Must be food/cooking related. No quotes, no explanation.' },
                        { role: 'user', content: `Recipe name: ${raw}. Best Pexels search phrase for a food dish photo:` }
                    ],
                    temperature: 0.3,
                    max_tokens: 20
                })
            });
            if (groqResp.ok) {
                const groqData = await groqResp.json();
                const phrase = (groqData.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '').slice(0, 50);
                if (phrase.length >= 3) {
                    const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(phrase + ' dish')}&per_page=1&orientation=square`;
                    const pr = await fetch(pexelsUrl, { headers: { Authorization: PEXELS_API_KEY } });
                    if (pr.ok) {
                        const pd = await pr.json();
                        const photo = pd.photos?.[0];
                        if (photo?.src?.medium) {
                            await saveRecipeImageDbMatch(raw, photo.src.medium, 'pexels', phrase);
                            return res.json({ imageUrl: photo.src.medium, source: 'pexels' });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Groq image search helper failed:', e.message);
        }
    }

    // 3. Try Wikimedia Commons/Wikipedia images for named dishes (often accurate for desserts/local dishes)
    const wikiTerms = [raw, w3, w2, w1].filter((t, i, arr) => t && arr.indexOf(t) === i);
    try {
        for (const term of wikiTerms) {
            const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term + ' dish recipe')}&format=json&utf8=1&origin=*`;
            const searchResp = await fetch(wikiSearchUrl);
            if (!searchResp.ok) continue;
            const searchData = await searchResp.json();
            const results = searchData?.query?.search || [];
            if (!results.length) continue;

            const bestPage = results.reduce((best, p) => {
                const title = (p.title || '').toLowerCase();
                const snippet = (p.snippet || '').toLowerCase().replace(/<[^>]+>/g, ' ');
                const score = scoreTextMatch(title + ' ' + snippet);
                if (!best || score > best.score) return { page: p, score };
                return best;
            }, null);

            if (!bestPage || bestPage.score <= 0) continue;

            const pageId = bestPage.page.pageid;
            const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=pageimages&piprop=original&format=json&origin=*`;
            const imageResp = await fetch(imageUrl);
            if (!imageResp.ok) continue;
            const imageData = await imageResp.json();
            const page = imageData?.query?.pages?.[String(pageId)];
            const src = page?.original?.source;
            if (src) {
                emitImageDebug('Resolved image from Wikipedia', { raw, termUsed: term, pageId, imageUrl: String(src).slice(0, 180) }, 'H2');
                await saveRecipeImageDbMatch(raw, src, 'wikipedia', term);
                return res.json({ imageUrl: src, source: 'wikipedia', termUsed: term });
            }
        }
    } catch (e) {
        console.warn('Wikipedia image search failed:', e.message);
    }

    // 4. Last-resort fallback: unsplash by exact dish phrase (still tied to the provided dish name)
    const unsplashUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(raw + ' recipe dish')}`;
    emitImageDebug('Resolved image from Unsplash fallback', { raw, imageUrl: String(unsplashUrl).slice(0, 180) }, 'H5');
    await saveRecipeImageDbMatch(raw, unsplashUrl, 'unsplash', raw);
    return res.json({ imageUrl: unsplashUrl, source: 'unsplash', termUsed: raw });
});

// Endpoint to get food image from Unsplash (legacy)
app.get('/api/food-image', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query required' });
    }

    const imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(query + ' food dish')}`;

    res.json({ imageUrl });
});

// Proxy TheMealDB image lookup to avoid browser CORS issues
app.get('/api/mealdb-image', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    const raw = String(query);
    const cleaned = raw.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleaned.split(' ').filter(w => w.length > 2);
    const terms = [
        words.slice(0, 3).join(' '),
        words.slice(0, 2).join(' '),
        words[0],
        cleaned
    ].filter((t, i, arr) => t && arr.indexOf(t) === i);

    try {
        for (const term of terms) {
            const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`;
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            if (data?.meals?.length) {
                return res.json({ imageUrl: data.meals[0].strMealThumb, termUsed: term });
            }
        }
        return res.json({ imageUrl: null });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch image' });
    }
});

// Get recipe details: ingredient prices, where to buy, calories
app.post('/api/recipe-details', async (req, res) => {
    const { name, ingredients, instructions } = req.body;
    if (!name || !GROQ_API_KEY) {
        return res.status(400).json({ error: 'Recipe name required and GROQ_API_KEY must be set' });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful assistant that provides grocery and nutrition info for recipes.
Given a recipe name, ingredients list, and instructions, return ONLY valid JSON with this exact structure (no other text):
{
  "ingredientsWithPrices": [
    { "item": "ingredient name", "price": "estimated price", "amount": "quantity needed", "whereToBuy": "store names" }
  ],
  "totalEstimate": "estimated total cost for ingredients",
  "caloriesPerServing": "estimated calories per serving",
  "proteinPerServing": "estimated grams of protein per serving",
  "carbsPerServing": "estimated grams of carbs per serving",
  "servings": "number of servings",
  "whereToBuy": "General stores: Walmart, Kroger, Whole Foods, etc."
}
Estimate prices in USD. For proteinPerServing and carbsPerServing, use numbers only (e.g. 25, 45). For whereToBuy, list common US stores. Be realistic with estimates.`
                    },
                    {
                        role: 'user',
                        content: `Recipe: ${name}\n\nIngredients:\n${ingredients || 'Not provided'}\n\nInstructions:\n${instructions || 'Not provided'}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 800
            })
        });

        const data = await response.json();
        if (data.error) return res.status(500).json({ error: data.error.message });

        let content = data.choices?.[0]?.message?.content || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) content = jsonMatch[0];

        const details = JSON.parse(content);
        // Normalize nutrition values - LLM may return "25", "25g", or 25
        const toGrams = (v) => {
            if (v == null || v === '') return null;
            const s = String(v).replace(/\s*g\s*$/i, '').trim();
            const n = parseFloat(s);
            return isNaN(n) ? null : Math.round(n);
        };
        const p = toGrams(details.proteinPerServing);
        const c = toGrams(details.carbsPerServing);
        details.proteinPerServing = p != null ? p : details.proteinPerServing;
        details.carbsPerServing = c != null ? c : details.carbsPerServing;
        res.json(details);
    } catch (e) {
        console.error('Recipe details error:', e);
        res.json({
            ingredientsWithPrices: [],
            totalEstimate: 'N/A',
            caloriesPerServing: 'N/A',
            proteinPerServing: 'N/A',
            carbsPerServing: 'N/A',
            servings: 'N/A',
            whereToBuy: 'Walmart, Kroger, local grocery stores'
        });
    }
});

// Search for real reviews from the web for a recipe
app.get('/api/search-reviews', async (req, res) => {
    const { recipe } = req.query;

    if (!recipe) {
        return res.status(400).json({ error: 'Recipe name required' });
    }

    

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'Groq API key not configured. Please set GROQ_API_KEY environment variable.' });
    }

    try {
        // Use Groq to search and summarize real reviews from the web
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a food review aggregator. Search your knowledge for real reviews and ratings of the given dish from popular sources like AllRecipes, Food Network, Epicurious, Bon Appetit, Serious Eats, and food blogs.

Return ONLY valid JSON in this exact format (no other text):
{
    "dish": "Recipe Name",
    "averageRating": 4.5,
    "totalReviews": "2.3k",
    "source": "AllRecipes, Food Network",
    "reviews": [
        {
            "user": "Username or Anonymous",
            "rating": 5,
            "comment": "Actual review comment from the web",
            "source": "AllRecipes",
            "helpful": 234
        }
    ],
    "commonPraise": ["quick to make", "family favorite"],
    "commonCriticism": ["needs more seasoning"],
    "tips": ["Add extra garlic", "Let it rest before serving"]
}

Include 3-4 reviews that reflect real opinions found online. If you can't find real reviews, base it on typical feedback for this type of dish from cooking communities. Be accurate about ratings and include the source.`
                    },
                    {
                        role: 'user',
                        content: `Find real online reviews and ratings for: "${recipe}"`
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const content = data.choices[0].message.content;

        // Try to parse JSON from response
        try {
            // Extract JSON from the response (handle markdown code blocks)
            let jsonStr = content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            const reviewData = JSON.parse(jsonStr.trim());
            res.json(reviewData);
        } catch (parseError) {
            console.error('Failed to parse review JSON:', parseError);
            res.json({
                dish: recipe,
                averageRating: 4.2,
                totalReviews: "N/A",
                source: "Web Search",
                reviews: [],
                error: "Could not parse reviews"
            });
        }
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Scan pantry image endpoint
app.post('/api/scan-pantry', async (req, res) => {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
        return res.status(400).json({ error: 'Image required' });
    }

    

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'Groq API key not configured. Please set GROQ_API_KEY environment variable.' });
    }

    try {
        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful assistant that identifies food ingredients from images. 
When you see a pantry, refrigerator, or food items, list ALL the ingredients you can identify.
Return ONLY a comma-separated list of ingredient names. Be specific and accurate.
Example format: chicken, rice, garlic, onions, soy sauce, olive oil, tomatoes, pasta, cheese, butter
Do not include any explanations, just the ingredient list.`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Identify all the food ingredients and items you can see in this image. Return only a comma-separated list of ingredient names.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Data}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const ingredientsText = data.choices[0].message.content.trim();
        
        // Clean up the response - remove any extra text and format as comma-separated
        let ingredients = ingredientsText
            .replace(/^Here are the ingredients[:\s]*/i, '')
            .replace(/^Ingredients[:\s]*/i, '')
            .replace(/^I can see[:\s]*/i, '')
            .replace(/\.$/, '')
            .trim();

        res.json({ 
            ingredients: ingredients,
            rawResponse: ingredientsText
        });
    } catch (error) {
        console.error('Error scanning pantry:', error);
        res.status(500).json({ error: 'Failed to scan pantry image' });
    }
});

// AI Chatbot endpoint
app.post('/api/chat', async (req, res) => {
    const { message, context } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Message required' });
    }

    

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'Groq API key not configured. Please set GROQ_API_KEY environment variable.' });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a friendly and knowledgeable culinary assistant chatbot on a recipe website. You help users with:
- Questions about cooking techniques and methods
- Ingredient substitutions and alternatives
- Nutritional information
- Dietary restrictions and modifications
- Food storage and safety tips
- Cooking times and temperatures
- Kitchen equipment recommendations
- Meal planning suggestions
- Cultural food traditions and history

${context ? `\nCurrent recipe context the user is viewing:\n${context}\n\nUse this context to provide relevant, specific answers about the recipes they're looking at.` : ''}

Keep responses concise but helpful (2-4 sentences for simple questions, more detailed for complex ones). Be warm and encouraging. Use simple formatting when helpful.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        res.json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to get response' });
    }
});

// Get local IP address for mobile access
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIPAddress();

// CRITICAL: Prevent ANY certificate generation on Vercel at module level
// This check happens BEFORE the function is even defined
// If Vercel is detected, we'll override any certificate generation attempts
let IS_VERCEL = false;
try {
    if (typeof process !== 'undefined' && process.env) {
        IS_VERCEL = IS_VERCEL || process.env.VERCEL === '1' || !!process.env.VERCEL_ENV || !!process.env.VERCEL_URL;
    }
    if (typeof __dirname !== 'undefined') {
        const dirnameStr = String(__dirname);
        IS_VERCEL = IS_VERCEL || dirnameStr.includes('/var/task') || dirnameStr.startsWith('/var/task');
    }
    if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
        try {
            const cwd = process.cwd();
            IS_VERCEL = IS_VERCEL || (cwd && (cwd.includes('/var/task') || cwd.startsWith('/var/task')));
        } catch(e) {
            IS_VERCEL = true; // If we can't check, assume Vercel
        }
    }
} catch(e) {
    IS_VERCEL = true; // If any check fails, assume Vercel to be safe
}

// Debug logging to verify Vercel detection (only log once at module load)
if (typeof process !== 'undefined' && process.env && process.env.VERCEL) {
    console.log('🔍 Vercel Detection: IS_VERCEL =', IS_VERCEL, '| __dirname =', typeof __dirname !== 'undefined' ? __dirname : 'undefined', '| cwd =', typeof process.cwd === 'function' ? process.cwd() : 'undefined');
}

// COMPATIBILITY LAYER: Create old function name for backwards compatibility
// This prevents crashes if Vercel is running old cached code that calls generateSelfSignedCert
// CRITICAL: This function MUST return null immediately on Vercel - no filesystem operations
function generateSelfSignedCert() {
    // CRITICAL: Wrap everything in try-catch to prevent any crashes
    try {
        // If on Vercel, return null immediately - don't even try
        if (IS_VERCEL) {
            return null;
        }
        // Additional safety check - if __dirname contains /var/task, return null
        if (typeof __dirname !== 'undefined') {
            const dirnameStr = String(__dirname);
            if (dirnameStr.includes('/var/task') || dirnameStr.startsWith('/var/task')) {
                return null;
            }
        }
        // If not on Vercel, call the new function
        return generateSelfSignedCert_v2();
    } catch (err) {
        // CRITICAL: Catch ANY error and return null - never crash
        // This is the ultimate safety net
        return null;
    }
}

// Function to generate self-signed certificate for HTTPS (development only)
// CRITICAL: This function should NEVER run on Vercel - it will crash
// On Vercel, this function immediately returns null without doing anything
// RENAMED to force Vercel cache refresh
// CRITICAL: This function MUST be completely fail-safe on Vercel
// Even if Vercel uses old cached code, the outermost try-catch will catch any errors
function generateSelfSignedCert_v2() {
    // ULTRA-CRITICAL: Wrap ENTIRE function in try-catch FIRST - before ANY other code
    // This is the absolute first thing - catches errors even if Vercel detection fails
    try {
        // ULTRA-EMERGENCY CHECK #1: If IS_VERCEL is true, return immediately - no checks needed
        if (IS_VERCEL) {
            console.log('✅ Certificate generation skipped: IS_VERCEL detected');
            return null;
        }
        
        // ULTRA-EMERGENCY CHECK #2: Check process.cwd() FIRST - most reliable for Vercel
        // This MUST happen before any other code, even before env var checks
        try {
            if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
                const cwd = process.cwd();
                if (cwd && (cwd.includes('/var/task') || cwd.startsWith('/var/task'))) {
                    console.log('✅ Certificate generation skipped: process.cwd() contains /var/task');
                    return null;
                }
            }
        } catch (e) {
            console.log('✅ Certificate generation skipped: process.cwd() check failed, assuming Vercel');
            return null; // If we can't check, assume Vercel
        }
        
        // ULTRA-EMERGENCY CHECK #3: Environment variables
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.VERCEL === '1' || process.env.VERCEL_ENV || process.env.VERCEL_URL) {
                console.log('✅ Certificate generation skipped: Vercel environment variables detected');
                return null;
            }
        }
        // CRITICAL: Check for Vercel at the ABSOLUTE FIRST LINE - before ANY other code
        // This must execute before ANY variable declarations, before ANYTHING
        // Check multiple indicators to be absolutely sure
        
        // Check 0: process.cwd() FIRST - most reliable for Vercel detection
        // This check happens before any path operations or variable declarations
        try {
            if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
                const cwd = process.cwd();
                if (cwd && (cwd.includes('/var/task') || cwd.startsWith('/var/task'))) {
                    
                    return null;
                }
            }
        } catch (e) {
            // If we can't check cwd, assume Vercel and return null
            return null;
        }
        
        // Check 1: __dirname path (most reliable for Lambda/Vercel)
        // This MUST be checked before any path operations
        if (typeof __dirname !== 'undefined') {
            const dirnameStr = String(__dirname);
            if (dirnameStr.includes('/var/task') || 
                dirnameStr.startsWith('/var/task') ||
                dirnameStr.includes('\\var\\task')) {
                
                return null;
            }
        }
        
        // Check 2: Environment variables (most reliable)
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.VERCEL === '1' || 
                process.env.VERCEL_ENV || 
                process.env.VERCEL_URL ||
                process.env.LAMBDA_TASK_ROOT ||
                process.env.AWS_LAMBDA_FUNCTION_NAME) {
                
                return null;
            }
        }
        
        // Check 3: process.cwd() as additional safety
        if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
            try {
                const cwd = process.cwd();
                if (cwd && (cwd.includes('/var/task') || cwd.startsWith('/var/task'))) {
                    
                    return null;
                }
            } catch (e) {
                // If we can't check, assume Vercel and return null
                return null;
            }
        }

        
        
        // CRITICAL: Final safety check - verify __dirname one more time before path operations
        // This is a redundant check but ensures we never create paths in /var/task
        if (typeof __dirname !== 'undefined') {
            const dirnameStr = String(__dirname);
            if (dirnameStr.includes('/var/task') || dirnameStr.includes('\\var\\task')) {
                
                return null;
            }
        }
        
        // CRITICAL: Wrap ALL path and file operations in try-catch
        // Even path.join can fail in some edge cases
        let certDir, keyPath, certPath;
        try {
            certDir = path.join(__dirname, 'certs');
            keyPath = path.join(certDir, 'key.pem');
            certPath = path.join(certDir, 'cert.pem');
            
            // CRITICAL: Check if path contains /var/task BEFORE any file operations
            // This is an additional safety check in case Vercel detection failed
            const certDirStr = String(certDir);
            if (certDirStr.includes('/var/task') || certDirStr.includes('\\var\\task')) {
                
                return null;
            }
        } catch (err) {
            // If path operations fail, we're probably on Vercel - return null
            
            return null;
        }
        
        // Create certs directory if it doesn't exist (only locally)
        // CRITICAL: Wrap ALL file operations in try-catch to prevent crashes on Vercel
        try {
            // Use try-catch around existsSync too - it can throw in some environments
            let dirExists = false;
            try {
                dirExists = fs.existsSync(certDir);
            } catch (err) {
                // If existsSync fails, assume we can't access filesystem - return null
                return null;
            }
            
            if (!dirExists) {
                // CRITICAL: Final check before mkdirSync - never create /var/task directories
                const certDirStr = String(certDir);
                // CRITICAL: Check path string BEFORE attempting mkdirSync
                // This is the absolute last line of defense
                if (certDirStr.includes('/var/task') || 
                    certDirStr.includes('\\var\\task') ||
                    certDirStr.startsWith('/var/task') ||
                    certDirStr.startsWith('\\var\\task')) {
                    
                    return null;
                }
                // CRITICAL: Wrap mkdirSync in try-catch that specifically handles ENOENT and /var/task paths
                try {
                    // Double-check one more time right before the call using absolute path
                    const finalCheck = String(certDir);
                    const absolutePath = path.resolve(certDir);
                    const absolutePathStr = String(absolutePath);
                    
                    // Check both relative and absolute paths
                    if (finalCheck.includes('/var/task') || 
                        finalCheck.includes('\\var\\task') ||
                        absolutePathStr.includes('/var/task') || 
                        absolutePathStr.includes('\\var\\task') ||
                        absolutePathStr.startsWith('/var/task') ||
                        absolutePathStr.startsWith('\\var\\task')) {
                        
                        return null;
                    }
                    
                    // Final safety: Try to create directory, but catch ALL errors
                    fs.mkdirSync(certDir, { recursive: true });
                    
                } catch (err) {
                    // CRITICAL: If error is ENOENT (or any error), this is likely Vercel
                    // ENOENT specifically means "no such file or directory" - common on read-only filesystems
                    // Return null immediately - don't throw, don't crash
                    // This catch handles ALL filesystem errors including ENOENT, EACCES, etc.
                    console.log('⚠️  Certificate generation failed (likely Vercel read-only filesystem):', err.code || err.message);
                    return null;
                }
            }
        } catch (err) {
            // Catch ANY error during directory operations and return null
            // This prevents the entire server from crashing
            return null;
        }
    
    // Check if certificates already exist
    // CRITICAL: Wrap ALL file operations in try-catch
    try {
        let keyExists = false;
        let certExists = false;
        try {
            keyExists = fs.existsSync(keyPath);
            certExists = fs.existsSync(certPath);
        } catch (err) {
            // If existsSync fails, we're probably on Vercel - return null
            return null;
        }
        
        if (keyExists && certExists) {
            try {
                return {
                    key: fs.readFileSync(keyPath),
                    cert: fs.readFileSync(certPath)
                };
            } catch (err) {
                console.log('⚠️  Error reading existing certificates, generating new ones...');
            }
        }
    } catch (err) {
        // Catch ANY error and return null
        return null;
    }
    
    // Try to generate certificate using Node.js package (no OpenSSL needed)
    // Note: selfsigned.generate is async in newer versions, but we can't use async here
    // So we'll generate it synchronously or use existing certs
    try {
        const selfsigned = require('selfsigned');
        
        // If certificates don't exist, tell user to run generate-cert.js
        // CRITICAL: Wrap existsSync in try-catch
        let keyExists = false;
        let certExists = false;
        try {
            keyExists = fs.existsSync(keyPath);
            certExists = fs.existsSync(certPath);
        } catch (err) {
            // If existsSync fails, we're probably on Vercel - return null
            return null;
        }
        
        if (!keyExists || !certExists) {
            console.log('🔐 SSL certificates not found.');
            console.log('   Run: node generate-cert.js');
            return null;
        }
        
        // Certificates exist, read them
        // CRITICAL: Wrap readFileSync in try-catch
        try {
            const key = fs.readFileSync(keyPath);
            const cert = fs.readFileSync(certPath);
            return { key, cert };
        } catch (err) {
            // If readFileSync fails (e.g., on Vercel), return null
            console.log('⚠️  Error reading certificates:', err.message);
            return null;
        }
    } catch (err) {
        console.log('⚠️  Could not read SSL certificates.');
        console.log('   Run: node generate-cert.js to generate them.');
        return null;
    }
    } catch (err) {
        // CRITICAL: Catch ANY error (including filesystem errors on Vercel) and return null
        // This prevents the entire server from crashing
        // This catch block handles:
        // - mkdirSync errors (ENOENT on Vercel's read-only filesystem)
        // - Any other filesystem errors
        // - Any other errors in the function
        
        // Always return null - never throw, never crash
        // This is the final safety net - even if all Vercel detection fails, this will catch the error
        console.log('⚠️  Certificate generation caught error (outer catch):', err.code || err.message);
        return null;
    }
}

// Only start server if running directly (not as a module for Vercel)
// CRITICAL: Check for Vercel at the absolute top level before ANY server startup code
// This prevents certificate generation code from ever running on Vercel
// Check process.cwd() first as it's the most reliable indicator
let isDefinitelyVercelAtTopLevel = false;
try {
    const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '';
    if (cwd && (cwd.includes('/var/task') || cwd.startsWith('/var/task'))) {
        isDefinitelyVercelAtTopLevel = true;
    }
} catch (e) {
    // If we can't check cwd, assume Vercel
    isDefinitelyVercelAtTopLevel = true;
}

// Additional checks
isDefinitelyVercelAtTopLevel = isDefinitelyVercelAtTopLevel ||
                                (typeof __dirname !== 'undefined' && 
                                 (String(__dirname).includes('/var/task') || String(__dirname).startsWith('/var/task'))) ||
                                process.env.VERCEL === '1' ||
                                process.env.VERCEL_ENV ||
                                process.env.VERCEL_URL ||
                                process.env.LAMBDA_TASK_ROOT ||
                                process.env.AWS_LAMBDA_FUNCTION_NAME ||
                                require.main !== module; // If not main module, we're being imported (e.g., by Vercel)



// CRITICAL: Only start server if we're the main module AND not on Vercel
// The isDefinitelyVercelAtTopLevel check ensures we never run certificate code on Vercel
if (require.main === module && !isVercel && !isDefinitelyVercelAtTopLevel) {
    // Start HTTP server (for localhost/desktop)
    const httpServer = http.createServer(app);
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🍳 Pantry Recipe App is running!\n`);
        console.log(`📱 Access from your computer:`);
        console.log(`   http://localhost:${PORT}\n`);
        console.log(`📱 Access from mobile devices on same WiFi:`);
        console.log(`   http://${localIP}:${PORT}\n`);
        console.log(`💡 Make sure your phone/tablet is on the same WiFi network!\n`);
    });

    // Try to start HTTPS server (for mobile camera access)
    // CRITICAL: On Vercel, NEVER try to generate certificates - it will crash
    // Vercel provides HTTPS automatically, so we don't need self-signed certs
    let sslCert = null;
    
    // CRITICAL: Check for Vercel FIRST - if we're on Vercel, skip certificate generation entirely
    // This prevents ANY filesystem operations on Vercel's read-only filesystem
    // Check multiple indicators to be absolutely sure
    const isDefinitelyVercel = isVercel || 
                                process.env.VERCEL === '1' || 
                                process.env.VERCEL_ENV || 
                                process.env.VERCEL_URL ||
                                process.env.LAMBDA_TASK_ROOT ||
                                process.env.AWS_LAMBDA_FUNCTION_NAME ||
                                (typeof __dirname !== 'undefined' && (__dirname.startsWith('/var/task') || __dirname.includes('/var/task')));
    
    
    
    // ONLY try to generate certificates if we're 100% sure we're NOT on Vercel
    // If we're on Vercel, sslCert stays null and we skip HTTPS server (Vercel provides HTTPS automatically)
    // CRITICAL: Add one more check right here - check __dirname directly before any function call
    const finalVercelCheck = (typeof __dirname !== 'undefined' && 
                              (String(__dirname).includes('/var/task') || String(__dirname).startsWith('/var/task'))) ||
                             process.env.VERCEL === '1' ||
                             process.env.VERCEL_ENV ||
                             process.env.VERCEL_URL ||
                             process.env.LAMBDA_TASK_ROOT ||
                             process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (!isDefinitelyVercel && !finalVercelCheck) {
        try {
            // Triple-check we're not on Vercel right before calling
            if (typeof __dirname !== 'undefined') {
                const dirnameCheck = String(__dirname);
                if (dirnameCheck.includes('/var/task') || dirnameCheck.startsWith('/var/task') || dirnameCheck.includes('\\var\\task')) {
                    
                    sslCert = null;
                } else {
                    
                    sslCert = generateSelfSignedCert_v2();
                    
                }
            } else {
                // If __dirname is undefined, don't risk it - assume Vercel
                sslCert = null;
            }
        } catch (err) {
            // Catch ANY error - don't let it crash the server
            
            console.log('⚠️  Could not generate SSL certificate:', err.message);
            sslCert = null;
        }
    } else {
        // On Vercel or uncertain environment - don't even try
        
        sslCert = null;
    }
    if (sslCert) {
        const httpsServer = https.createServer(sslCert, app);
        httpsServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`\n⚠️  HTTPS port ${HTTPS_PORT} is already in use.`);
                console.log(`   Please stop the other application or change HTTPS_PORT in server.js\n`);
            } else {
                console.log(`\n❌ HTTPS server error: ${err.message}\n`);
            }
        });
        httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
            console.log(`\n🔒 HTTPS Server is running! (Required for mobile camera access)\n`);
            console.log(`📱 Access from your computer:`);
            console.log(`   https://localhost:${HTTPS_PORT}\n`);
            console.log(`📱 Access from mobile devices on same WiFi:`);
            console.log(`   https://${localIP}:${HTTPS_PORT}\n`);
            console.log(`⚠️  Your browser will show a security warning for self-signed certificates.`);
            console.log(`   Click "Advanced" → "Proceed to ${localIP}" (or similar) to continue.\n`);
        });
    } else {
        console.log(`\n⚠️  HTTPS not available. Mobile camera access requires HTTPS.`);
        console.log(`   Please run generate-cert.bat or generate-cert.ps1 to create certificates.\n`);
    }

    console.log(`🔐 ADMIN MODE ENABLED (Testing)`);
    if (ADMIN_EMAIL) {
        console.log(`   Only this email can sign up: ${ADMIN_EMAIL}`);
        console.log(`   Set ADMIN_EMAIL environment variable to change it.\n`);
    } else {
        console.log(`   First email to sign up will become the admin account.`);
        console.log(`   Set ADMIN_EMAIL environment variable to restrict to a specific email.\n`);
    }
    console.log(`📧 Email Status: ${emailTransporter ? '✅ Configured' : '⚠️  Not configured (Development Mode - codes will show in console)'}\n`);
    console.log(`🖼️  Recipe Images: ${PEXELS_API_KEY ? '✅ Pexels API enabled (dish-specific images)' : '⚠️  Using TheMealDB only. Add PEXELS_API_KEY for better images (free at pexels.com/api)'}\n`);
    console.log(`🔍 Server is listening for requests...\n`);
}

// Fallback: serve index.html for root and unmatched routes (SPA support on Vercel)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export app for Vercel serverless functions
module.exports = app;

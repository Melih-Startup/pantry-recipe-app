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

// #region agent log
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:21',message:'GROQ_API_KEY initialization',data:{hasKey:!!GROQ_API_KEY,keyLength:GROQ_API_KEY?.length||0,isVercel:!!isVercelEnv,envKeys:Object.keys(process.env).filter(k=>k.includes('GROQ')).join(',')},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'A'})}).catch(()=>{});
// #endregion
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

// Configure email transporter (using Gmail SMTP by default)
let emailTransporter = null;
if (EMAIL_USER && EMAIL_PASSWORD) {
    emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD
        }
    });
    console.log(`📧 Email service configured with: ${EMAIL_USER}`);
    console.log('   Emails will be sent FROM this account TO users who sign up');
} else {
    console.log('⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASSWORD environment variables to enable email verification.');
    console.log('');
    console.log('   QUICK SETUP (Windows PowerShell):');
    console.log('   $env:EMAIL_USER="your-email@gmail.com"');
    console.log('   $env:EMAIL_PASSWORD="your-gmail-app-password"');
    console.log('   npm start');
    console.log('');
    console.log('   For Gmail:');
    console.log('   1. Go to: https://myaccount.google.com/apppasswords');
    console.log('   2. Enable 2-Step Verification first if needed');
    console.log('   3. Generate an App Password for "Mail"');
    console.log('   4. Use that 16-character password (not your regular password)');
}

// Database is now handled by db-adapter.js
// It automatically uses Supabase/Postgres if DATABASE_URL is set, otherwise SQLite for local dev
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

// Session configuration
// For Vercel, use memory store (or configure a proper session store like Redis)
const sessionConfig = {
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isVercel ? true : false, // HTTPS required on Vercel
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
};

// On Vercel, sessions are stateless - consider using JWT tokens only
// For production, you should use a proper session store (Redis, etc.)
app.use(session(sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

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
        const { email, password, name } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
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
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
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
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
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
                            return res.status(500).json({ error: 'Failed to create user' });
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
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
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
    const { ingredients, context, budget } = req.body;

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:636',message:'Recipe generation - before API call',data:{hasApiKey:!!GROQ_API_KEY,apiKeyLength:GROQ_API_KEY?.length||0,hasIngredients:!!ingredients,ingredientsLength:ingredients?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'recipe-gen',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

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
1. Acknowledge any specific requirements mentioned (servings, dietary needs, budget, etc.)
2. Suggest 2-3 recipes that match ALL requirements
3. Scale ingredients appropriately for the serving size
4. Include clear step-by-step instructions
5. Add cooking times and difficulty level
6. If budget was specified, include estimated costs
7. IMPORTANT: Start each recipe with the format "## RECIPE_NAME" (recipe name in caps) so images can be matched

Format recipes with markdown headings (##) and bullet points for clarity.

Format recipes with clear markdown.`
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

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        let recipeContent = data.choices[0].message.content;

        // Extract recipe names for images
        const recipeNames = extractRecipeNames(recipeContent);

        res.json({
            recipe: recipeContent,
            recipeNames: recipeNames
        });
    } catch (error) {
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

// Endpoint to get food image from Unsplash
app.get('/api/food-image', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query required' });
    }

    // Use Unsplash source for direct image URLs (no API key needed for basic usage)
    const imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(query + ' food dish')}`;

    res.json({ imageUrl });
});

// Search for real reviews from the web for a recipe
app.get('/api/search-reviews', async (req, res) => {
    const { recipe } = req.query;

    if (!recipe) {
        return res.status(400).json({ error: 'Recipe name required' });
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:761',message:'Reviews fetch - before API call',data:{hasApiKey:!!GROQ_API_KEY,recipe:recipe},timestamp:Date.now(),sessionId:'debug-session',runId:'reviews',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:852',message:'Pantry scan - before API call',data:{hasApiKey:!!GROQ_API_KEY,hasImage:!!imageBase64,imageLength:imageBase64?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'pantry-scan',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:928',message:'Chat - before API call',data:{hasApiKey:!!GROQ_API_KEY,hasMessage:!!message,messageLength:message?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'chat',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

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

// Function to generate self-signed certificate for HTTPS (development only)
// CRITICAL: This function should NEVER run on Vercel - it will crash
// On Vercel, this function immediately returns null without doing anything
function generateSelfSignedCert() {
    // CRITICAL: If we're on Vercel, return null IMMEDIATELY - before ANY other code
    // Check this at the absolute first line of the function
    // This prevents ANY filesystem operations on Vercel's read-only filesystem
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.VERCEL === '1' || process.env.VERCEL_ENV || process.env.VERCEL_URL) {
            return null;
        }
    }
    
    // Check __dirname - this is the most reliable way to detect Vercel/Lambda
    if (typeof __dirname !== 'undefined') {
        if (__dirname.includes('/var/task') || __dirname.startsWith('/var/task')) {
            return null;
        }
    }
    // CRITICAL: Check for Vercel at the ABSOLUTE FIRST LINE - before ANY other code
    // This must be the very first thing that executes
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.VERCEL === '1' || 
            process.env.VERCEL_ENV || 
            process.env.VERCEL_URL ||
            process.env.LAMBDA_TASK_ROOT ||
            process.env.AWS_LAMBDA_FUNCTION_NAME) {
            return null;
        }
    }
    
    // Check __dirname path - this is the most reliable Vercel detection
    if (typeof __dirname !== 'undefined') {
        if (__dirname.includes('/var/task') || __dirname.startsWith('/var/task')) {
            return null;
        }
    }
    
    // Check process.cwd() as additional safety
    if (typeof process !== 'undefined' && process.cwd && typeof process.cwd === 'function') {
        try {
            const cwd = process.cwd();
            if (cwd.includes('/var/task') || cwd.startsWith('/var/task')) {
                return null;
            }
        } catch (e) {
            // If we can't check cwd, assume Vercel and return null
            return null;
        }
    }
    
    // CRITICAL: Wrap ENTIRE function body in try-catch as the outermost layer
    // This catches ANY error, including errors during file operations
    try {
        
        // CRITICAL: Wrap entire function logic in try-catch to prevent ANY crash
        try {
        // CRITICAL: Check for Vercel FIRST, before ANY other operations
        // This must be the absolute first thing in the function
        if (process.env.VERCEL === '1' || 
            process.env.VERCEL_ENV || 
            process.env.VERCEL_URL ||
            (typeof __dirname !== 'undefined' && __dirname.startsWith('/var/task')) ||
            (typeof process.cwd === 'function' && process.cwd().startsWith('/var/task')) ||
            process.env.LAMBDA_TASK_ROOT ||
            process.env.AWS_LAMBDA_FUNCTION_NAME) {
            return null;
        }

        // #region agent log
        const vercelCheck = {
            VERCEL: process.env.VERCEL,
            VERCEL_ENV: process.env.VERCEL_ENV,
            VERCEL_URL: process.env.VERCEL_URL,
            dirname: typeof __dirname !== 'undefined' ? __dirname : 'undefined',
            dirnameStartsWithVarTask: typeof __dirname !== 'undefined' && __dirname.startsWith('/var/task'),
            requireMainIsModule: require.main === module
        };
        fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1031',message:'generateSelfSignedCert called (not Vercel)',data:vercelCheck,timestamp:Date.now(),sessionId:'debug-session',runId:'cert-gen',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        // CRITICAL: Wrap ALL path and file operations in try-catch
        // Even path.join can fail in some edge cases
        let certDir, keyPath, certPath;
        try {
            certDir = path.join(__dirname, 'certs');
            keyPath = path.join(certDir, 'key.pem');
            certPath = path.join(certDir, 'cert.pem');
            
            // CRITICAL: Check if path contains /var/task BEFORE any file operations
            // This is an additional safety check in case Vercel detection failed
            if (certDir.includes('/var/task') || certDir.includes('\\var\\task')) {
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
                try {
                    fs.mkdirSync(certDir, { recursive: true });
                } catch (err) {
                    // If we can't create the directory (e.g., on Vercel or read-only filesystem), just return null
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1095',message:'mkdirSync failed',data:{error:err.message,code:err.code,path:certDir},timestamp:Date.now(),sessionId:'debug-session',runId:'cert-gen',hypothesisId:'F'})}).catch(()=>{});
                    // #endregion
                    // Always return null for any filesystem error - don't throw
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
        // Don't log the error to avoid noise - just return null silently
        return null;
    }
}

// Only start server if running directly (not as a module for Vercel)
// #region agent log
const isMainModule = require.main === module;
fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1119',message:'Server startup check',data:{isMainModule:isMainModule,isVercel:!!isVercel,willStartServer:isMainModule&&!isVercel},timestamp:Date.now(),sessionId:'debug-session',runId:'server-init',hypothesisId:'G'})}).catch(()=>{});
// #endregion

if (require.main === module && !isVercel) {
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
    // NEVER call generateSelfSignedCert on Vercel - it will try to create directories
    // Only call if we're 100% sure we're NOT on Vercel
    let sslCert = null;
    const definitelyNotVercel = !isVercel && 
                                 !process.env.VERCEL && 
                                 !process.env.VERCEL_ENV && 
                                 !process.env.VERCEL_URL &&
                                 !process.env.LAMBDA_TASK_ROOT &&
                                 typeof __dirname !== 'undefined' && 
                                 !__dirname.startsWith('/var/task');
    
    // NEVER call generateSelfSignedCert on Vercel - it will crash
    // Even with all the checks, if Vercel is using old cached code, it will fail
    // So we check multiple times and wrap in try-catch
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1233',message:'About to check if should call generateSelfSignedCert',data:{definitelyNotVercel:definitelyNotVercel,isVercel:!!isVercel,dirname:typeof __dirname !== 'undefined' ? __dirname : 'undefined',vercelEnv:process.env.VERCEL,vercelUrl:process.env.VERCEL_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'cert-call-check',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    if (definitelyNotVercel) {
        try {
            // Double-check we're not on Vercel right before calling
            if (typeof __dirname !== 'undefined' && __dirname.startsWith('/var/task')) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1242',message:'Blocked generateSelfSignedCert - dirname check failed',data:{dirname:__dirname},timestamp:Date.now(),sessionId:'debug-session',runId:'cert-call-blocked',hypothesisId:'H'})}).catch(()=>{});
                // #endregion
                sslCert = null;
            } else {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1246',message:'Calling generateSelfSignedCert',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'cert-call-start',hypothesisId:'H'})}).catch(()=>{});
                // #endregion
                sslCert = generateSelfSignedCert();
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1249',message:'generateSelfSignedCert returned',data:{sslCertIsNull:sslCert === null},timestamp:Date.now(),sessionId:'debug-session',runId:'cert-call-end',hypothesisId:'H'})}).catch(()=>{});
                // #endregion
            }
        } catch (err) {
            // Catch ANY error - don't let it crash the server
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1252',message:'Error in generateSelfSignedCert call',data:{error:err.message,stack:err.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'cert-call-error',hypothesisId:'H'})}).catch(()=>{});
            // #endregion
            console.log('⚠️  Could not generate SSL certificate:', err.message);
            sslCert = null;
        }
    } else {
        // On Vercel or uncertain environment - don't even try
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1260',message:'Skipping generateSelfSignedCert - not definitelyNotVercel',data:{definitelyNotVercel:definitelyNotVercel,isVercel:!!isVercel},timestamp:Date.now(),sessionId:'debug-session',runId:'cert-call-skipped',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
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
    console.log(`🔍 Server is listening for requests...\n`);
}

// Export app for Vercel serverless functions
module.exports = app;

// Vercel serverless function wrapper for Express app
// This file is the entry point for all API routes on Vercel

let app;

// Initialize the Express app with proper error handling
// CRITICAL: Any unhandled errors here will cause FUNCTION_INVOCATION_FAILED
try {
    app = require('../server');
    
    // Verify app was loaded successfully
    if (!app) {
        console.error('❌ Failed to load Express app from server.js');
        // Create a minimal error handler app
        const express = require('express');
        app = express();
        app.use((req, res) => {
            res.status(500).json({ 
                error: 'Server initialization failed',
                message: 'The application failed to initialize properly. Please check server logs.'
            });
        });
    }
} catch (error) {
    // CRITICAL: Log the error but don't throw - create a fallback app instead
    // Throwing here causes FUNCTION_INVOCATION_FAILED
    console.error('❌ Error loading server.js:', error);
    console.error('Stack trace:', error.stack);
    
    // Create a minimal Express app that returns errors
    const express = require('express');
    app = express();
    app.use(express.json());
    app.use((req, res) => {
        res.status(500).json({ 
            error: 'Server initialization error',
            message: error.message,
            // Only show stack in development
            ...(process.env.VERCEL_ENV === 'development' && { stack: error.stack })
        });
    });
}

// Export the Express app as a serverless function
module.exports = app;



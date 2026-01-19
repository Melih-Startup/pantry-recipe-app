// Vercel serverless function wrapper for Express app
// #region agent log
try {
    fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/index.js:2',message:'Serverless function initialization start',data:{hasGroqKey:!!process.env.GROQ_API_KEY,isVercel:!!process.env.VERCEL,envKeys:Object.keys(process.env).filter(k=>k.includes('GROQ')||k.includes('DATABASE')).join(',')},timestamp:Date.now(),sessionId:'debug-session',runId:'serverless-init',hypothesisId:'A'})}).catch(()=>{});
} catch(e) {}
// #endregion

let app;
try {
    app = require('../server');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/index.js:10',message:'Serverless function initialization success',data:{appLoaded:!!app},timestamp:Date.now(),sessionId:'debug-session',runId:'serverless-init',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
} catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36eea993-0762-4eaf-843c-80adc53f3a96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/index.js:13',message:'Serverless function initialization error',data:{error:error.message,stack:error.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'serverless-init',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw error;
}

// Export the Express app as a serverless function
module.exports = app;



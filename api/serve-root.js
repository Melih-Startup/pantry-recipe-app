const fs = require('fs');
const path = require('path');

/** Stream homepage without loading the full Express app (vercel.json routes `/` here first) */
module.exports = (req, res) => {
    const candidates = [
        path.join(__dirname, '..', 'public', 'index.html'),
        path.join(process.cwd(), 'public', 'index.html')
    ];
    let htmlPath = candidates[0];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                htmlPath = p;
                break;
            }
        } catch (e) {
            // ignore
        }
    }
    if (!fs.existsSync(htmlPath)) {
        res.status(500).type('text/plain').send('Missing public/index.html');
        return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.createReadStream(htmlPath).pipe(res);
};

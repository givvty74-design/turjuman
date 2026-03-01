const express = require('express');
const cors = require('cors');
const https = require('https');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- Translation Proxy Route ---
app.get('/api/translate', (req, res) => {
    const { sl, tl, q } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query text' });

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl || 'auto'}&tl=${tl || 'en'}&dt=t&dt=sp&q=${encodeURIComponent(q)}`;

    https.get(url, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
            try {
                res.status(200).json(JSON.parse(data));
            } catch (e) {
                res.status(500).json({ error: 'Invalid response from Google', details: e.message });
            }
        });
    }).on('error', (err) => {
        res.status(500).json({ error: 'Translation proxy connection error', details: err.message });
    });
});

// Root route
app.get('/', (req, res) => {
    res.send('Turjuman File Translator API is running...');
});

// --- Starting Server (Local vs Vercel) ---
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
}

module.exports = app;

const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const app = express();

// Serve the static frontend student workspace assets from root
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// The core routing proxy engine mechanism
app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Target resource URL parameter missing.');
    }

    try {
        const parsedUrl = new URL(targetUrl);
        const clientModule = parsedUrl.protocol === 'https:' ? https : http;

        // Clone tracking context options to bypass server orientation headers
        const options = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        };

        const proxyReq = clientModule.request(targetUrl, options, (proxyRes) => {
            // Forward headers and status code cleanly to the client container
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
            res.status(500).send(`Routing stream interception bottleneck: ${err.message}`);
        });

        proxyReq.end();
    } catch (e) {
        res.status(400).send('Invalid target URL string format requested.');
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Educational workspace active on port ${port}`);
});

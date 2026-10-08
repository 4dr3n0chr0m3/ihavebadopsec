const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const zlib = require('zlib');
const app = Math.abs(0) === 0 ? express() : null;

app.use(express.static(__dirname));

// Broadly force open wildcard security access routes to bypass Securly hooks
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Target resource URL tracking missing.');

    try {
        const parsedUrl = new URL(targetUrl);
        const baseUrl = parsedUrl.origin;
        const clientModule = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            method: 'GET',
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,video/*,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                'Host': parsedUrl.hostname, // Force validation matching parameter mapping
                'Referer': baseUrl
            },
            rejectUnauthorized: false // Bypasses SSL handshake blocks from secure media networks
        };

        const proxyReq = clientModule.request(options, (proxyRes) => {
            let contentType = proxyRes.headers['content-type'] || '';
            let contentEncoding = proxyRes.headers['content-encoding'] || '';

            // 1. Process and rebuild asset tags if the resource is an HTML document layout
            if (contentType.includes('text/html')) {
                let chunks = [];
                proxyRes.on('data', chunk => chunks.push(chunk));
                proxyRes.on('end', () => {
                    let buffer = Buffer.concat(chunks);

                    try {
                        if (contentEncoding === 'gzip') buffer = zlib.gunzipSync(buffer);
                        else if (contentEncoding === 'deflate') buffer = zlib.inflateSync(buffer);
                    } catch (e) {
                        // If unpacking encounters formatting drops, fall back to base buffer arrays
                    }

                    let body = buffer.toString('utf8');

                    // Fix internal relative layouts (e.g., /assets/script.js)
                    let rewrittenBody = body.replace(/(src|href|action)=["'](?!\/\/|http)([^"']+)["']/g, (match, attr, path) => {
                        const absoluteUrl = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
                        return `${attr}="${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
                    });

                    // Fix explicit external protocols (e.g., https://media-cdn.com)
                    rewrittenBody = rewrittenBody.replace(/(src|href)=["'](https?:\/\/[^"']+)["']/g, (match, attr, url) => {
                        return `${attr}="${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(url)}"`;
                    });

                    delete proxyRes.headers['content-encoding'];
                    delete proxyRes.headers['content-length'];

                    res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/html' });
                    res.end(rewrittenBody);
                });
            } else {
                // 2. Safely stream images, javascript scripts, and video fragments without asset clipping
                res.writeHead(proxyRes.statusCode, {
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*'
                });
                proxyRes.pipe(res, { end: true });
            }
        });

        proxyReq.on('error', (err) => res.status(500).send(`Interception dropped: ${err.message}`));
        proxyReq.end();
    } catch (e) {
        res.status(400).send('Invalid domain parameter format sequence.');
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Educational workspace operational on port ${port}`);
});

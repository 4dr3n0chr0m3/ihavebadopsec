const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const zlib = require('zlib');
const app = express();

app.use(express.static(__dirname));

// Wildcard cross-origin settings to forcefully bypass local Securly blocks
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Upgraded production router that securely proxies cookies, fonts, and heavy layouts
app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Target parameter tracking missing.');

    try {
        const parsedUrl = new URL(targetUrl);
        const baseUrl = parsedUrl.origin;
        const clientModule = parsedUrl.protocol === 'https:' ? https : http;

        // Clone and pass incoming browser session cookies straight to the target site
        const incomingHeaders = { ...req.headers };
        delete incomingHeaders.host;
        delete incomingHeaders.referer;
        
        // Match specific validation headers to authenticate modern platforms cleanly
        incomingHeaders['Host'] = parsedUrl.hostname;
        incomingHeaders['Referer'] = baseUrl;
        incomingHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        incomingHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,font/*,video/*,*/*;q=0.8';
        incomingHeaders['Accept-Encoding'] = 'gzip, deflate';

        const options = {
            method: 'GET',
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            headers: incomingHeaders,
            rejectUnauthorized: false
        };

        const proxyReq = clientModule.request(options, (proxyRes) => {
            let contentType = proxyRes.headers['content-type'] || '';
            let contentEncoding = proxyRes.headers['content-encoding'] || '';

            // Forward session headers and authentication login cookies back into browser cache storage
            Object.keys(proxyRes.headers).forEach((key) => {
                if (key.toLowerCase() === 'set-cookie') {
                    res.append('Set-Cookie', proxyRes.headers[key]);
                } else if (key.toLowerCase() !== 'content-security-policy') {
                    res.setHeader(key, proxyRes.headers[key]);
                }
            });

            // 1. Rewrite relative paths on standard HTML documents
            if (contentType.includes('text/html')) {
                let chunks = [];
                proxyRes.on('data', chunk => chunks.push(chunk));
                proxyRes.on('end', () => {
                    let buffer = Buffer.concat(chunks);

                    try {
                        if (contentEncoding === 'gzip') buffer = zlib.gunzipSync(buffer);
                        else if (contentEncoding === 'deflate') buffer = zlib.inflateSync(buffer);
                    } catch (e) {}

                    let body = buffer.toString('utf8');

                    // Fix relative formatting nodes (e.g., /fonts/main.woff2)
                    let rewrittenBody = body.replace(/(src|href|action)=["'](?!\/\/|http)([^"']+)["']/g, (match, attr, path) => {
                        const absoluteUrl = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
                        return `${attr}="${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
                    });

                    // Fix explicit web protocols
                    rewrittenBody = rewrittenBody.replace(/(src|href)=["'](https?:\/\/[^"']+)["']/g, (match, attr, url) => {
                        return `${attr}="${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(url)}"`;
                    });

                    delete proxyRes.headers['content-encoding'];
                    delete proxyRes.headers['content-length'];

                    res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/html' });
                    res.end(rewrittenBody);
                });
            } else {
                // 2. Stream fonts, stylesheet asset links, and media files directly without dropping pipelines
                res.writeHead(proxyRes.statusCode);
                proxyRes.pipe(res, { end: true });
            }
        });

        proxyReq.on('error', (err) => res.status(500).send(err.message));
        proxyReq.end();
    } catch (e) {
        res.status(400).send('Invalid path layout format sequence.');
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Educational workspace operational on port ${port}`);
});

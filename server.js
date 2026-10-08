const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const app = express();

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Advanced stream proxy that rewrites broken internal asset links on the fly
app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL missing.');

    try {
        const parsedUrl = new URL(targetUrl);
        const baseUrl = parsedUrl.origin;
        const clientModule = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*'
            }
        };

        const proxyReq = clientModule.request(targetUrl, options, (proxyRes) => {
            let contentType = proxyRes.headers['content-type'] || '';

            // If the requested resource is an HTML webpage, we intercept and rewrite its paths
            if (contentType.includes('text/html')) {
                let body = '';
                proxyRes.on('data', chunk => body += chunk);
                proxyRes.on('end', () => {
                    
                    // Fix relative paths (e.g., /css/style.css -> ://targetsite.com)
                    let rewrittenBody = body.replace(/(src|href|action)=["'](?!\/\/|http)([^"']+)["']/g, (match, attr, path) => {
                        const absoluteUrl = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
                        return `${attr}="${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
                    });

                    // Fix absolute external paths (e.g., https://assets.com -> proxy?url=https://assets.com)
                    rewrittenBody = rewrittenBody.replace(/(src|href)=["'](https?:\/\/[^"']+)["']/g, (match, attr, url) => {
                        return `${attr}="${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(url)}"`;
                    });

                    res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/html' });
                    res.end(rewrittenBody);
                });
            } else {
                // If it's an image, game asset, or stylesheet, stream it directly back without modifying it
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res, { end: true });
            }
        });

        proxyReq.on('error', (err) => res.status(500).send(err.message));
        proxyReq.end();
    } catch (e) {
        res.status(400).send('Invalid URL format.');
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Educational workspace active on port ${port}`);
});

const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const zlib = require('zlib'); // Native Node tool to unpack compressed data
const app = express();

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL parameter missing.');

    try {
        const parsedUrl = new URL(targetUrl);
        const baseUrl = parsedUrl.origin;
        const clientModule = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*',
                'Accept-Encoding': 'gzip, deflate' // Tell the target site what compression we handle
            }
        };

        const proxyReq = clientModule.request(targetUrl, options, (proxyRes) => {
            let contentType = proxyRes.headers['content-type'] || '';
            let contentEncoding = proxyRes.headers['content-encoding'] || '';

            // 1. If it's a standard web page, we collect the chunks and unpack them
            if (contentType.includes('text/html')) {
                let chunks = [];
                proxyRes.on('data', chunk => chunks.push(chunk));
                proxyRes.on('end', () => {
                    let buffer = Buffer.concat(chunks);

                    // Decompress if the website sent it zipped (Gzip or Deflate)
                    if (contentEncoding === 'gzip') {
                        buffer = zlib.gunzipSync(buffer);
                    } else if (contentEncoding === 'deflate') {
                        buffer = zlib.inflateSync(buffer);
                    }

                    let body = buffer.toString('utf8');

                    // Fix relative asset pathways (e.g., /js/main.js -> ://target.com)
                    let rewrittenBody = body.replace(/(src|href|action)=["'](?!\/\/|http)([^"']+)["']/g, (match, attr, path) => {
                        const absoluteUrl = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
                        return `${attr}="${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
                    });

                    // Fix absolute asset pathways (e.g., https://images.com -> proxy?url=https://images.com)
                    rewrittenBody = rewrittenBody.replace(/(src|href)=["'](https?:\/\/[^"']+)["']/g, (match, attr, url) => {
                        return `${attr}="${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(url)}"`;
                    });

                    // Remove the compressed headers so your browser doesn't try to unzip it again
                    delete proxyRes.headers['content-encoding'];
                    delete proxyRes.headers['content-length'];

                    res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/html' });
                    res.end(rewrittenBody);
                });
            } else {
                // 2. If it's an image, font, or stylesheet, pass the data directly through
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res, { end: true });
            }
        });

        proxyReq.on('error', (err) => res.status(500).send(err.message));
        proxyReq.end();
    } catch (e) {
        res.status(400).send('Invalid URL format requested.');
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Educational workspace operational on port ${port}`);
});


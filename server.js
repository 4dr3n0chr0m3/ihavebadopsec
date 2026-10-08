const http = require('http');
const fs = require('fs');
const path = require('path');
const { RammerheadResponders, RammerheadSessionFileCache } = require('@rubynetwork/rammerhead');

// Establish a clean standalone directory storage engine for dynamic cookie parsing
const sessionCache = new RammerheadSessionFileCache();

const server = http.createServer((req, res) => {
    // 1. Manually check and route Rammerhead network session events
    if (req.url.startsWith('/rammer/')) {
        const result = RammerheadResponders.handle(req, res, sessionCache, '/rammer/');
        if (result) return;
    }

    // 2. Route default root traffic directly to your frontend index.html layer
    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading dashboard files.');
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    // 3. Throw a plain placeholder catch if an unknown route is triggered
    res.writeHead(404);
    res.end('Not Found');
});

// Bind active pipeline upgrades directly into the sessionCache (Crucial for Roblox assets)
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/rammer/')) {
        RammerheadResponders.upgrade(req, socket, head, sessionCache, '/rammer/');
    } else {
        socket.end();
    }
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Educational workspace active on port ${port}`);
});

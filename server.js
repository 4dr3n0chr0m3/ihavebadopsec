const express = require('express');
const http = require('http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = http.createServer(app);
const bare = createBareServer('/bare/');

// 1. Mount the internal Ultraviolet folder assets
app.use('/uv/', express.static(uvPath));

// 2. Serve static portal files (index.html, sw.js, uv.config.js) from your root
app.use(express.static(__dirname));

// 3. Handle the Bare server intercept routing flow before Express endpoints
app.use((req, res, next) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        next();
    }
});

// 4. Default home page route configuration fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 5. Connect active WebSockets cleanly (Crucial for Roblox background connections)
server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, socket, head);
    } else {
        socket.end();
    }
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Educational workspace operational on port ${port}`);
});

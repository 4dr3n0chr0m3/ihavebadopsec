const express = require('express');
const http = require('http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = http.createServer(app);
const bare = createBareServer('/bare/');

// 1. Force mount the internal Ultraviolet build files to the exact paths needed by index.html
app.use('/uv/', express.static(uvPath));

// 2. Serve your personal files (index.html, sw.js, uv.config.js) from the repository root
app.use(express.static(__dirname));

// 3. Explicitly catch any fallback attempts to the base application route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. Handle internal network events through the Bare server layer
server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        app(req, res); // Seamlessly hands control back to Express for routing
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, socket, head);
    } else {
        socket.end();
    }
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Educational platform actively running on port ${port}`);
});

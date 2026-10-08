const express = require('express');
const http = require('http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');

const app = express();
const server = http.createServer(app);
const bare = createBareServer('/bare/');

// 1. Serve frontend website dashboard files (index.html, sw.js, etc.)
app.use(express.static(__dirname));

// 2. Mount the Ultraviolet core asset folders securely
app.use('/uv/', express.static(uvPath));

// 3. Fallback catch for standard page routing requests
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// 4. Handle internal system network events through the Bare server layer
server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        app(req, res); // Passes standard site pages cleanly back to Express
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
    console.log(`Educational platform running on port ${port}`);
});

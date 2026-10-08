const express = require('express');
const http = require('http');
const path = require('path');
const Rammerhead = require('@rubynetwork/rammerhead');

const app = express();
const server = http.createServer(app);

// Initialize the standalone Rammerhead proxy logic layer
const rh = new Rammerhead({
    bindingAddress: '0.0.0.0',
    logging: false,
    reverseProxy: true
});

// Attach Rammerhead's native engine to its folder routes
app.use('/rammer/', rh.getMiddleware());

// Serve your local files (index.html) from the root folder
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Bind WebSockets directly into Rammerhead (This keeps Roblox from breaking)
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/rammer/')) {
        rh.upgrade(req, socket, head);
    } else {
        socket.end();
    }
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Educational workspace operational on port ${port}`);
});

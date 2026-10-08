const express = require('express');
const http = require('http');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Serve the frontend student dashboard files
app.use(express.static(__dirname));

// Mount the Ultraviolet proxy engine core assets securely
app.use('/uv/', express.static(uvPath));

// Handle the internal routing configurations
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Educational platform actively running on port ${port}`);
});

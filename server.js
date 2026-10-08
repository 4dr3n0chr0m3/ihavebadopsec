const express = require('express');
const http = require('http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');

const app = express();
const server = http.createServer(app);
const bare = createBareServer('/bare/');

// Serve the frontend student dashboard files
app.use(express.static(__dirname));

// Mount the Ultraviolet proxy engine core assets securely
app.use('/uv/', express.static(uvPath));

// Route request flows through the Bare server instance or Express fallback
app.use((req, res) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        res.status(404).send('Not Found');
    }
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Educational platform actively running on port ${port}`);
});

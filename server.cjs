const { spawn } = require('child_process');
const path = require('path');
const express = require('express');
const { fileURLToPath } = require('url');

// Get the directory where the binary is located
const BINARY_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;

// Function to start Vite server in production mode
function startViteServer() {
    const app = express();
    // Serve the built Vite app from the bundled dist directory
    app.use(express.static(path.join(BINARY_DIR, 'dist')));

    app.listen(5173, () => {
        console.log('Vite app running at http://localhost:5173');
    });
}

// Function to start Bun Express server
async function startBunServer() {
    // Import the server code directly
    const serverPath = path.join(BINARY_DIR, 'server-bundle.js');
    try {
        require(serverPath);
    } catch (error) {
        console.error('Failed to start Bun server:', error);
    }
}

// Start both servers
startViteServer();
startBunServer();
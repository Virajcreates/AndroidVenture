// Simple HTTP + WebSocket server for receiving frames and broadcasting to web clients
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');

const HTTP_PORT = 9000; // Avoid collision with static server on 8080
const WS_PORT = 8081;

// HTTP server to receive uploads
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

let latestFrame = null;

app.post('/upload', (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing image (base64) in body' });
    }
    latestFrame = image;
    // Broadcast to all WS clients
    broadcast({ type: 'frame', image });
    return res.json({ success: true });
  } catch (e) {
    console.error('Upload error:', e);
    return res.status(500).json({ success: false, error: String(e) });
  }
});

const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP upload server listening on http://0.0.0.0:${HTTP_PORT}`);
  console.log('POST base64 frames to /upload with JSON body: { "image": "data:image/png;base64,..." }');
  console.log('Server accessible at:');
  console.log(`  - http://localhost:${HTTP_PORT}`);
  console.log(`  - http://192.168.1.3:${HTTP_PORT}`);
});

// WebSocket server to push frames to viewers
const wss = new WebSocket.Server({ port: WS_PORT, host: '0.0.0.0' }, () => {
  console.log(`WebSocket server listening on ws://0.0.0.0:${WS_PORT}`);
});

function broadcast(payload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', ws => {
  console.log('WebSocket client connected');
  ws.send(JSON.stringify({ type: 'hello', message: 'connected' }));
  // If we have the last frame, send it immediately
  if (latestFrame) {
    ws.send(JSON.stringify({ type: 'frame', image: latestFrame }));
  }

  ws.on('message', msg => {
    try {
      const data = JSON.parse(String(msg));
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on('close', () => console.log('WebSocket client disconnected'));
});

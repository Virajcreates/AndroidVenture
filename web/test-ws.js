const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8081';
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('Client connected to', WS_URL);
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', (msg) => {
  try {
    const data = JSON.parse(String(msg));
    if (data.type === 'hello') {
      console.log('Server says hello:', data);
    } else if (data.type === 'frame') {
      console.log('Received frame message, length:', data.image.length);
      // Print a short preview of the data URL
      console.log(data.image.slice(0, 60) + '...');
      process.exit(0);
    } else {
      console.log('Other message:', data);
    }
  } catch (e) {
    console.log('Raw message:', String(msg));
  }
});

ws.on('close', () => console.log('Client disconnected'));
ws.on('error', (err) => console.error('WS error:', err));

const WebSocket = require('ws');

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

let motors = {};

function broadcast(message) {
  const data = JSON.stringify(message);
  server.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

server.on('connection', ws => {
  console.log('Client connected');
  ws.send(JSON.stringify({ type: 'init', data: motors }));

  ws.on('message', message => {
    try {
      const parsed = JSON.parse(message);
      console.log('Received:', parsed);

      if (parsed.type === 'addMotor') {
        const category = (parsed.category || '').trim();
        const text = (parsed.text || '').trim();
        if (!category || !text) {
          return;
        }
        if (!motors[category]) {
          motors[category] = [];
        }
        motors[category].push(text);
        broadcast({ type: 'update', data: motors });
      } else if (parsed.type === 'reset') {
        motors = {};
        broadcast({ type: 'update', data: motors });
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log(`WebSocket server running on ws://0.0.0.0:${PORT}`);

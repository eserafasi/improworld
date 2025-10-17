const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const SESSION_PASSWORD = process.env.SHOW_PASSWORD || process.env.SESSION_PASSWORD || 'test';
const RATE_LIMIT_MS = 2000;
const MAX_LENGTH = 140;

const publicDir = path.join(__dirname, 'public');
const clients = new Set();

const blocklist = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'cunt',
  'pussy'
];

let inspirations = [];

const server = http.createServer((req, res) => {
  const rawUrl = req.url.split('?')[0];
  const url = rawUrl === '/' ? '/index.html' : rawUrl;
  const safePath = path.normalize(url).replace(/^\/+/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.html'
      ? 'text/html; charset=utf-8'
      : 'text/plain; charset=utf-8';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.on('upgrade', (req, socket) => {
  if (req.headers['upgrade']?.toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
  socket.setNoDelay(true);

  const client = {
    socket,
    buffer: Buffer.alloc(0),
    isAuthenticated: false,
    lastSubmission: 0
  };

  clients.add(client);
  send(client, { type: 'connected' });

  socket.on('data', data => handleSocketData(client, data));
  socket.on('close', () => {
    clients.delete(client);
  });
  socket.on('error', () => {
    clients.delete(client);
  });
});

function handleSocketData(client, data) {
  client.buffer = Buffer.concat([client.buffer, data]);

  try {
    while (true) {
      const frame = decodeFrame(client.buffer);
      if (!frame) {
        break;
      }

      client.buffer = client.buffer.slice(frame.length);

      switch (frame.opcode) {
        case 0x1: {
          const payload = frame.payload.toString('utf8');
          handleMessage(client, payload);
          break;
        }
        case 0x8: {
          client.socket.end();
          clients.delete(client);
          return;
        }
        case 0x9: {
          sendFrame(client.socket, frame.payload, 0xA);
          break;
        }
        default:
          break;
      }
    }
  } catch (error) {
    client.socket.destroy();
    clients.delete(client);
  }
}

function decodeFrame(buffer) {
  if (buffer.length < 2) return null;

  const firstByte = buffer[0];
  const secondByte = buffer[1];

  const fin = (firstByte & 0x80) !== 0;
  const opcode = firstByte & 0x0f;
  const masked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (!fin) {
    return null;
  }

  if (!masked) {
    throw new Error('Received unmasked frame from client.');
  }

  if (payloadLength === 126) {
    if (buffer.length < offset + 2) return null;
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    if (buffer.length < offset + 8) return null;
    const high = buffer.readUInt32BE(offset);
    const low = buffer.readUInt32BE(offset + 4);
    if (high !== 0) {
      throw new Error('Payload too large');
    }
    payloadLength = low;
    offset += 8;
  }

  let maskingKey = null;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    maskingKey = buffer.subarray(offset, offset + 4);
    offset += 4;
  }

  if (buffer.length < offset + payloadLength) return null;

  let payload = buffer.subarray(offset, offset + payloadLength);
  if (masked && maskingKey) {
    payload = Buffer.from(payload.map((byte, index) => byte ^ maskingKey[index % 4]));
  }

  return {
    opcode,
    payload,
    length: offset + payloadLength
  };
}

function sendFrame(socket, payload, opcode = 0x1) {
  if (!socket.writable) return;

  const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const payloadLength = payloadBuffer.length;
  let headerLength = 2;

  if (payloadLength >= 126 && payloadLength < 65536) {
    headerLength += 2;
  } else if (payloadLength >= 65536) {
    headerLength += 8;
  }

  const frame = Buffer.alloc(headerLength + payloadLength);
  frame[0] = 0x80 | (opcode & 0x0f);

  if (payloadLength < 126) {
    frame[1] = payloadLength;
    payloadBuffer.copy(frame, 2);
  } else if (payloadLength < 65536) {
    frame[1] = 126;
    frame.writeUInt16BE(payloadLength, 2);
    payloadBuffer.copy(frame, 4);
  } else {
    frame[1] = 127;
    frame.writeUInt32BE(0, 2);
    frame.writeUInt32BE(payloadLength, 6);
    payloadBuffer.copy(frame, 10);
  }

  socket.write(frame);
}

function send(client, payload) {
  try {
    sendFrame(client.socket, Buffer.from(JSON.stringify(payload)));
  } catch (error) {
    client.socket.destroy();
    clients.delete(client);
  }
}

function broadcastList() {
  for (const client of clients) {
    if (client.isAuthenticated) {
      send(client, { type: 'list', inspirations });
    }
  }
}

function sanitizeInput(text) {
  const normalized = text.trim();
  if (!normalized) {
    return { ok: false, reason: 'Empty inspiration is not allowed.' };
  }

  if (normalized.length > MAX_LENGTH) {
    return { ok: false, reason: `Inspiration must be ${MAX_LENGTH} characters or fewer.` };
  }

  const lower = normalized.toLowerCase();
  for (const word of blocklist) {
    const pattern = new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(lower)) {
      return { ok: false, reason: 'That word is not allowed.' };
    }
  }

  return { ok: true, value: normalized };
}

function handleMessage(client, raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch (err) {
    send(client, { type: 'error', message: 'Invalid message format.' });
    return;
  }

  switch (message.type) {
    case 'auth': {
      if (typeof message.password !== 'string') {
        send(client, { type: 'error', message: 'Password is required.' });
        return;
      }

      if (message.password === SESSION_PASSWORD) {
        client.isAuthenticated = true;
        send(client, { type: 'auth-ok', inspirations });
      } else {
        send(client, { type: 'error', message: 'Incorrect password.' });
      }
      break;
    }
    case 'submit': {
      if (!client.isAuthenticated) {
        send(client, { type: 'error', message: 'Authenticate first.' });
        return;
      }

      const now = Date.now();
      if (now - client.lastSubmission < RATE_LIMIT_MS) {
        send(client, { type: 'error', message: 'Please wait a moment before submitting again.' });
        return;
      }

      if (typeof message.text !== 'string') {
        send(client, { type: 'error', message: 'Text is required.' });
        return;
      }

      const result = sanitizeInput(message.text);
      if (!result.ok) {
        send(client, { type: 'error', message: result.reason });
        return;
      }

      const inspiration = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: result.value,
        timestamp: new Date().toISOString()
      };

      inspirations = [inspiration, ...inspirations];
      client.lastSubmission = now;
      broadcastList();
      send(client, { type: 'submit-ok', inspiration });
      break;
    }
    case 'delete': {
      if (!client.isAuthenticated) {
        send(client, { type: 'error', message: 'Authenticate first.' });
        return;
      }

      if (typeof message.id !== 'string') {
        send(client, { type: 'error', message: 'Inspiration ID required.' });
        return;
      }

      const beforeLength = inspirations.length;
      inspirations = inspirations.filter(item => item.id !== message.id);
      if (inspirations.length !== beforeLength) {
        broadcastList();
      }
      break;
    }
    case 'clear': {
      if (!client.isAuthenticated) {
        send(client, { type: 'error', message: 'Authenticate first.' });
        return;
      }

      inspirations = [];
      broadcastList();
      break;
    }
    default:
      send(client, { type: 'error', message: 'Unknown message type.' });
  }
}

server.listen(PORT, HOST, () => {
  console.log(`Inspiration collector server listening on http://${HOST}:${PORT}`);
});

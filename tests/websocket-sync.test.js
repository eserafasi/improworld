/*
© 2025 Impro World
This file is part of this project and is licensed under the GNU General Public License v3.0.
See the LICENSE file for more details.
*/

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createInspirationServer } = require('../server');

const DEFAULT_TIMEOUT = 5000;
const messageQueues = new WeakMap();

function waitForEvent(target, type, timeout = DEFAULT_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${type}`));
    }, timeout);

    function cleanup() {
      clearTimeout(timer);
      target.removeEventListener(type, onType);
      target.removeEventListener('error', onError);
      target.removeEventListener('close', onClose);
    }

    function onType(event) {
      cleanup();
      resolve(event);
    }

    function onError(event) {
      cleanup();
      const error = event?.error instanceof Error ? event.error : new Error('WebSocket error');
      reject(error);
    }

    function onClose() {
      cleanup();
      reject(new Error(`WebSocket closed before ${type}`));
    }

    target.addEventListener(type, onType, { once: true });
    if (type !== 'error') {
      target.addEventListener('error', onError, { once: true });
    }
    if (type !== 'close') {
      target.addEventListener('close', onClose, { once: true });
    }
  });
}

function ensureMessageQueue(ws) {
  if (messageQueues.has(ws)) {
    return messageQueues.get(ws);
  }

  const queue = [];
  const pending = [];

  function removePending(token) {
    const index = pending.indexOf(token);
    if (index !== -1) {
      pending.splice(index, 1);
    }
  }

  function rejectAll(error) {
    while (pending.length) {
      const token = pending.shift();
      token.reject(error);
    }
  }

  function resolveNext(data) {
    if (pending.length) {
      const token = pending.shift();
      token.resolve(data);
    } else {
      queue.push(data);
    }
  }

  function cleanup(error = new Error('WebSocket listener removed')) {
    ws.removeEventListener('message', onMessage);
    ws.removeEventListener('close', onClose);
    ws.removeEventListener('error', onError);
    queue.length = 0;
    rejectAll(error);
    messageQueues.delete(ws);
  }

  function onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      resolveNext(data);
    } catch (error) {
      cleanup(error);
    }
  }

  function onClose() {
    cleanup(new Error('WebSocket closed before delivering message'));
  }

  function onError(event) {
    const error = event?.error instanceof Error ? event.error : new Error('WebSocket error');
    cleanup(error);
  }

  ws.addEventListener('message', onMessage);
  ws.addEventListener('close', onClose);
  ws.addEventListener('error', onError);

  const entry = { queue, pending, removePending, cleanup };
  messageQueues.set(ws, entry);
  return entry;
}

function waitForMessage(ws, timeout = DEFAULT_TIMEOUT) {
  const entry = ensureMessageQueue(ws);
  if (entry.queue.length) {
    return Promise.resolve(entry.queue.shift());
  }

  return new Promise((resolve, reject) => {
    const token = {
      resolve(value) {
        clearTimeout(timer);
        entry.removePending(token);
        resolve(value);
      },
      reject(error) {
        clearTimeout(timer);
        entry.removePending(token);
        reject(error);
      },
    };

    const timer = setTimeout(() => {
      entry.removePending(token);
      reject(new Error('Timed out waiting for message'));
    }, timeout);

    entry.pending.push(token);
  });
}

async function waitForType(ws, type, timeout = DEFAULT_TIMEOUT) {
  const deadline = Date.now() + timeout;
  while (Date.now() <= deadline) {
    const remaining = Math.max(0, deadline - Date.now());
    const message = await waitForMessage(ws, remaining || 1);
    if (message?.type === type) {
      return message;
    }
  }
  throw new Error(`Timed out waiting for message of type ${type}`);
}

async function closeSocket(ws) {
  if (!ws) return;
  if (ws.readyState === WebSocket.CLOSED) return;

  if (ws.readyState === WebSocket.CONNECTING) {
    try {
      await waitForEvent(ws, 'open', 1000);
    } catch (_) {
      // ignore
    }
  }

  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.close();
    } catch (_) {
      // ignore
    }
  }

  if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.OPEN) {
    try {
      await waitForEvent(ws, 'close', 1000);
    } catch (_) {
      // ignore
    }
  }

  const entry = messageQueues.get(ws);
  if (entry) {
    entry.cleanup();
  }
}

function formatHostForUrl(host) {
  return host.includes(':') ? `[${host}]` : host;
}

test(
  'two authenticated clients share inspirations via WebSocket',
  { timeout: DEFAULT_TIMEOUT * 3 },
  async (t) => {
    const log = (message) => t.diagnostic(message);
    const server = createInspirationServer({ host: '127.0.0.1', password: 'test' });
    const { port, host } = await server.start(0, '127.0.0.1');
    const wsUrl = `ws://${formatHostForUrl(host)}:${port}/socket`;

    const wsA = new WebSocket(wsUrl);
    const wsB = new WebSocket(wsUrl);

    ensureMessageQueue(wsA);
    ensureMessageQueue(wsB);

    try {
      log('waiting for sockets to open');
      await Promise.all([waitForEvent(wsA, 'open'), waitForEvent(wsB, 'open')]);
      log('sockets open, awaiting connected messages');
      await Promise.all([waitForType(wsA, 'connected'), waitForType(wsB, 'connected')]);

      log('sending auth messages');
      wsA.send(JSON.stringify({ type: 'auth', password: 'test' }));
      wsB.send(JSON.stringify({ type: 'auth', password: 'test' }));

      log('waiting for auth-ok responses');
      const authA = await waitForType(wsA, 'auth-ok');
      const authB = await waitForType(wsB, 'auth-ok');

      assert.equal(authA.inspirations.length, 0);
      assert.equal(authB.inspirations.length, 0);

      log('submitting first inspiration from client A');
      wsA.send(JSON.stringify({ type: 'submit', text: 'Primera chispa' }));

      const firstListA = await waitForType(wsA, 'list');
      assert.equal(firstListA.inspirations[0]?.text, 'Primera chispa');

      const submitOkA = await waitForType(wsA, 'submit-ok');
      assert.equal(submitOkA.inspiration.text, 'Primera chispa');

      log('awaiting broadcast of first inspiration to client B');
      const firstListB = await waitForType(wsB, 'list');
      assert.equal(firstListB.inspirations[0]?.text, 'Primera chispa');

      log('client B submitting second inspiration');
      wsB.send(JSON.stringify({ type: 'submit', text: 'Segunda idea' }));

      const secondListB = await waitForType(wsB, 'list');
      assert.equal(secondListB.inspirations[0]?.text, 'Segunda idea');
      assert.equal(secondListB.inspirations[1]?.text, 'Primera chispa');

      const submitOkB = await waitForType(wsB, 'submit-ok');
      assert.equal(submitOkB.inspiration.text, 'Segunda idea');

      log('checking update broadcast reaches client A');
      const updateListA = await waitForType(wsA, 'list');
      assert.equal(updateListA.inspirations[0]?.text, 'Segunda idea');
      assert.equal(updateListA.inspirations[1]?.text, 'Primera chispa');
    } finally {
      await Promise.all([closeSocket(wsA), closeSocket(wsB)]);
      await server.stop();
    }
  },
);

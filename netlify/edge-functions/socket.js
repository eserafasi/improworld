/*
© 2025 Impro World
This file is part of this project and is licensed under the GNU General Public License v3.0.
See the LICENSE file for more details.
*/

const RATE_LIMIT_MS = 2000;
const MAX_LENGTH = 140;
const BLOCKLIST = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "cunt",
  "pussy",
];

const clients = new Set();
let inspirations = [];

function getPassword() {
  return (
    Deno.env.get("SHOW_PASSWORD") ||
    Deno.env.get("SESSION_PASSWORD") ||
    "test"
  );
}

function sanitizeInput(text) {
  const normalized = text.trim();
  if (!normalized) {
    return { ok: false, reason: "Empty inspiration is not allowed." };
  }

  if (normalized.length > MAX_LENGTH) {
    return {
      ok: false,
      reason: `Inspiration must be ${MAX_LENGTH} characters or fewer.`,
    };
  }

  const lower = normalized.toLowerCase();
  for (const word of BLOCKLIST) {
    const pattern = new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    if (pattern.test(lower)) {
      return { ok: false, reason: "That word is not allowed." };
    }
  }

  return { ok: true, value: normalized };
}

function send(client, payload) {
  try {
    client.socket.send(JSON.stringify(payload));
  } catch (_error) {
    try {
      client.socket.close();
    } catch (_) {
      // ignore
    }
    clients.delete(client);
  }
}

function broadcastList() {
  for (const client of clients) {
    if (client.isAuthenticated) {
      send(client, { type: "list", inspirations });
    }
  }
}

function handleMessage(client, raw, password) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch (_error) {
    send(client, { type: "error", message: "Invalid message format." });
    return;
  }

  switch (message.type) {
    case "auth": {
      if (typeof message.password !== "string") {
        send(client, { type: "error", message: "Password is required." });
        return;
      }

      if (message.password === password) {
        client.isAuthenticated = true;
        send(client, { type: "auth-ok", inspirations });
      } else {
        send(client, { type: "error", message: "Incorrect password." });
      }
      break;
    }
    case "submit": {
      if (!client.isAuthenticated) {
        send(client, { type: "error", message: "Authenticate first." });
        return;
      }

      const now = Date.now();
      if (now - client.lastSubmission < RATE_LIMIT_MS) {
        send(client, {
          type: "error",
          message: "Please wait a moment before submitting again.",
        });
        return;
      }

      if (typeof message.text !== "string") {
        send(client, { type: "error", message: "Text is required." });
        return;
      }

      const result = sanitizeInput(message.text);
      if (!result.ok) {
        send(client, { type: "error", message: result.reason });
        return;
      }

      const inspiration = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: result.value,
        timestamp: new Date().toISOString(),
      };

      inspirations = [inspiration, ...inspirations];
      client.lastSubmission = now;
      broadcastList();
      send(client, { type: "submit-ok", inspiration });
      break;
    }
    case "delete": {
      if (!client.isAuthenticated) {
        send(client, { type: "error", message: "Authenticate first." });
        return;
      }

      if (typeof message.id !== "string") {
        send(client, { type: "error", message: "Inspiration ID required." });
        return;
      }

      const beforeLength = inspirations.length;
      inspirations = inspirations.filter((item) => item.id !== message.id);
      if (inspirations.length !== beforeLength) {
        broadcastList();
      }
      break;
    }
    case "clear": {
      if (!client.isAuthenticated) {
        send(client, { type: "error", message: "Authenticate first." });
        return;
      }

      inspirations = [];
      broadcastList();
      break;
    }
    default: {
      send(client, { type: "error", message: "Unknown message type." });
    }
  }
}

export default function handler(request) {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade.", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(request);
  const password = getPassword();
  const client = {
    socket,
    buffer: "",
    isAuthenticated: false,
    lastSubmission: 0,
  };

  socket.onopen = () => {
    clients.add(client);
    send(client, { type: "connected" });
  };

  socket.onmessage = (event) => {
    handleMessage(client, event.data, password);
  };

  socket.onclose = () => {
    clients.delete(client);
  };

  socket.onerror = () => {
    clients.delete(client);
  };

  return response;
}

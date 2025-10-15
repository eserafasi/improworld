// Utilidades compartidas para coordinar la sala entre el modo "crear" y "sacar".
// Utilizamos PeerJS sobre WebRTC para replicar el comportamiento de un WebSocket
// sin necesidad de desplegar un servidor propio. El servidor público de PeerJS se
// usa únicamente como canal de señalización: todos los datos de la sesión viven
// en la memoria del navegador anfitrión y se propagan por canales P2P.

const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
];

const PEER_OPTIONS = {
  // Servidor de señalización proporcionado por PeerJS (no almacena la sesión).
  host: "0.peerjs.com",
  port: 443,
  secure: true,
  config: { iceServers: ICE_SERVERS },
  debug: 0,
};

const FALLBACK_CATEGORY = "Sin categoría";

function ensurePeerAvailable() {
  if (typeof window === "undefined" || typeof window.Peer === "undefined") {
    throw new Error(
      "PeerJS no está disponible. Asegúrate de cargar la librería antes de inicializar la sesión."
    );
  }
}

function createEmitter() {
  const listeners = new Map();
  return {
    on(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(handler);
      return () => {
        listeners.get(event)?.delete(handler);
      };
    },
    emit(event, payload) {
      listeners.get(event)?.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error("Error en listener", event, error);
        }
      });
    },
    clear() {
      listeners.clear();
    },
  };
}

export function normalizeSessionId(raw) {
  const trimmed = (raw || "").trim().toLowerCase();
  if (!trimmed) {
    return "";
  }
  return trimmed
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-]+|[-]+$/g, "");
}

function sanitizeCategory(category) {
  const clean = (category || "").trim();
  return clean || FALLBACK_CATEGORY;
}

function buildSummary(motors) {
  const counts = new Map();
  motors.forEach((motor) => {
    const key = sanitizeCategory(motor.category);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return {
    total: motors.length,
    categories: Array.from(counts.entries()).map(([name, count]) => ({ name, count })),
  };
}

function createMotor(text, category) {
  return {
    id: `motor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    category: (category || "").trim(),
    createdAt: new Date().toISOString(),
  };
}

function cloneMotor(motor) {
  return { ...motor };
}

function formatPeerError(error) {
  if (!error) {
    return "Ocurrió un error desconocido.";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error.type === "unavailable-id") {
    return "Ese identificador ya está en uso. Prueba con otro.";
  }
  if (error.type === "peer-unavailable") {
    return "No se encontró una sesión con ese identificador.";
  }
  if (error.message) {
    return error.message;
  }
  return "Ocurrió un error al usar la red P2P.";
}

function connectionIsOpen(conn) {
  return conn && conn.open;
}

export function createHostSession() {
  ensurePeerAvailable();
  const emitter = createEmitter();
  let peer = null;
  let sessionId = "";
  let normalizedId = "";
  const connections = new Map();
  const state = {
    motors: [],
    lastDrawn: null,
  };

  function isConnected() {
    return Boolean(peer && !peer.destroyed && peer.open);
  }

  function notifyState() {
    const summary = buildSummary(state.motors);
    emitter.emit("state", {
      motors: state.motors.map((motor) => cloneMotor(motor)),
      summary,
      lastDrawn: state.lastDrawn ? cloneMotor(state.lastDrawn) : null,
    });
    return summary;
  }

  function sendToConnection(conn, payload) {
    if (connectionIsOpen(conn)) {
      conn.send(payload);
    }
  }

  function broadcast(payload) {
    connections.forEach((conn) => {
      sendToConnection(conn, payload);
    });
  }

  function handleDrawRequest(conn, message) {
    const requestedCategory = message.category ? message.category.trim() : "";
    const sanitized = sanitizeCategory(requestedCategory);
    const source = requestedCategory
      ? state.motors.filter((motor) => sanitizeCategory(motor.category) === sanitized)
      : state.motors;
    if (!source.length) {
      sendToConnection(conn, {
        type: "draw_failed",
        reason: requestedCategory
          ? `No hay motores disponibles en la categoría "${sanitized}".`
          : "No hay motores disponibles todavía.",
      });
      return;
    }
    const chosen = cloneMotor(source[Math.floor(Math.random() * source.length)]);
    state.lastDrawn = chosen;
    const summary = notifyState();
    const payload = { type: "drawn", motor: chosen, summary };
    broadcast(payload);
    emitter.emit("drawn", payload);
  }

  function handleConnection(conn) {
    connections.set(conn.peer, conn);
    emitter.emit("peer-count", connections.size);
    conn.on("open", () => {
      sendToConnection(conn, {
        type: "init",
        motors: state.motors.map((motor) => cloneMotor(motor)),
        summary: buildSummary(state.motors),
        lastDrawn: state.lastDrawn ? cloneMotor(state.lastDrawn) : null,
      });
    });
    conn.on("data", (message) => {
      if (!message || typeof message !== "object") {
        return;
      }
      if (message.type === "draw") {
        handleDrawRequest(conn, message);
      } else if (message.type === "request_init") {
        sendToConnection(conn, {
          type: "init",
          motors: state.motors.map((motor) => cloneMotor(motor)),
          summary: buildSummary(state.motors),
          lastDrawn: state.lastDrawn ? cloneMotor(state.lastDrawn) : null,
        });
      }
    });
    const cleanup = () => {
      connections.delete(conn.peer);
      emitter.emit("peer-count", connections.size);
    };
    conn.on("close", cleanup);
    conn.on("error", (error) => {
      emitter.emit("peer-error", { peerId: conn.peer, error, message: formatPeerError(error) });
    });
  }

  function connect(targetSession) {
    const normalized = normalizeSessionId(targetSession);
    if (!normalized) {
      return Promise.reject(
        new Error("El identificador debe contener letras, números, guiones o guiones bajos.")
      );
    }
    disconnect();
    sessionId = targetSession.trim();
    normalizedId = normalized;
    let settled = false;
    try {
      peer = new window.Peer(normalized, PEER_OPTIONS);
    } catch (error) {
      return Promise.reject(error);
    }
    return new Promise((resolve, reject) => {
      peer.on("open", () => {
        settled = true;
        emitter.emit("connected", { sessionId, normalizedId, peerId: normalized });
        notifyState();
        resolve({ sessionId, normalizedId, peerId: normalized });
      });
      peer.on("connection", handleConnection);
      peer.on("close", () => {
        emitter.emit("disconnected");
      });
      peer.on("disconnected", () => {
        emitter.emit("error", new Error("La conexión con la red P2P se interrumpió."));
        emitter.emit("disconnected");
      });
      peer.on("error", (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
        emitter.emit("error", error);
      });
    });
  }

  function disconnect() {
    connections.forEach((conn) => {
      try {
        conn.close();
      } catch (error) {
        console.warn("No se pudo cerrar la conexión", error);
      }
    });
    connections.clear();
    if (peer) {
      try {
        peer.destroy();
      } catch (error) {
        console.warn("No se pudo destruir el peer", error);
      }
    }
    peer = null;
    emitter.emit("disconnected");
  }

  function addMotor(text, category) {
    if (!isConnected()) {
      throw new Error("Conecta la sesión antes de agregar motores.");
    }
    const cleanText = (text || "").trim();
    if (!cleanText) {
      throw new Error("El texto del motor es obligatorio.");
    }
    const cleanCategory = (category || "").trim();
    const motor = createMotor(cleanText, cleanCategory);
    state.motors.push(motor);
    const summary = notifyState();
    const payload = { type: "motor_added", motor: cloneMotor(motor), summary };
    broadcast(payload);
    emitter.emit("motor-added", payload);
    return motor;
  }

  function reset() {
    if (!isConnected()) {
      throw new Error("Conecta la sesión antes de vaciarla.");
    }
    state.motors = [];
    state.lastDrawn = null;
    const summary = notifyState();
    const payload = { type: "reset", summary };
    broadcast(payload);
    emitter.emit("reset", payload);
  }

  return {
    connect,
    disconnect,
    addMotor,
    reset,
    isConnected,
    getSessionId() {
      return sessionId;
    },
    getNormalizedId() {
      return normalizedId;
    },
    on: emitter.on,
  };
}

export function createDrawClient() {
  ensurePeerAvailable();
  const emitter = createEmitter();
  let peer = null;
  let connection = null;
  let sessionId = "";
  let normalizedId = "";
  const state = {
    motors: [],
    summary: { total: 0, categories: [] },
    lastDrawn: null,
  };

  function cleanupPeer() {
    if (connection) {
      try {
        connection.close();
      } catch (error) {
        console.warn("No se pudo cerrar la conexión", error);
      }
    }
    connection = null;
    if (peer) {
      try {
        peer.destroy();
      } catch (error) {
        console.warn("No se pudo destruir el peer", error);
      }
    }
    peer = null;
  }

  function isConnected() {
    return Boolean(connection && connectionIsOpen(connection));
  }

  function updateState({ motors, summary, lastDrawn }) {
    if (Array.isArray(motors)) {
      state.motors = motors.map((motor) => cloneMotor(motor));
    }
    if (summary) {
      state.summary = summary;
    }
    if (lastDrawn !== undefined) {
      state.lastDrawn = lastDrawn ? cloneMotor(lastDrawn) : null;
    }
    emitter.emit("state", { ...state, summary: state.summary });
  }

  function handleMessage(message) {
    if (!message || typeof message !== "object") {
      return;
    }
    if (message.type === "init") {
      updateState({
        motors: message.motors || [],
        summary: message.summary || buildSummary([]),
        lastDrawn: message.lastDrawn || null,
      });
      emitter.emit("connected", { sessionId, normalizedId });
    } else if (message.type === "motor_added") {
      state.motors.push(cloneMotor(message.motor));
      state.summary = message.summary || buildSummary(state.motors);
      emitter.emit("motor-added", { motor: cloneMotor(message.motor), summary: state.summary });
      emitter.emit("state", { ...state });
    } else if (message.type === "drawn") {
      state.lastDrawn = message.motor ? cloneMotor(message.motor) : null;
      if (message.summary) {
        state.summary = message.summary;
      }
      emitter.emit("drawn", { motor: state.lastDrawn, summary: state.summary });
      emitter.emit("state", { ...state });
    } else if (message.type === "reset") {
      state.motors = [];
      state.summary = message.summary || { total: 0, categories: [] };
      state.lastDrawn = null;
      emitter.emit("reset", { summary: state.summary });
      emitter.emit("state", { ...state });
    } else if (message.type === "draw_failed") {
      emitter.emit("error", new Error(message.reason || "No fue posible obtener un motor."));
    }
  }

  function connect(targetSession) {
    const normalized = normalizeSessionId(targetSession);
    if (!normalized) {
      return Promise.reject(
        new Error("Escribe un identificador válido (letras, números, guiones o guiones bajos).")
      );
    }
    cleanupPeer();
    sessionId = targetSession.trim();
    normalizedId = normalized;
    let settled = false;
    try {
      peer = new window.Peer(undefined, PEER_OPTIONS);
    } catch (error) {
      return Promise.reject(error);
    }
    return new Promise((resolve, reject) => {
      peer.on("open", () => {
        try {
          connection = peer.connect(normalized);
        } catch (error) {
          settled = true;
          reject(error);
          return;
        }
        if (!connection) {
          settled = true;
          reject(new Error("No se pudo crear la conexión con la sesión."));
          return;
        }
        connection.on("open", () => {
          settled = true;
          connection.send({ type: "request_init" });
          resolve({ sessionId, normalizedId });
        });
        connection.on("data", handleMessage);
        connection.on("close", () => {
          emitter.emit("disconnected");
        });
        connection.on("error", (error) => {
          if (!settled) {
            settled = true;
            reject(error);
          }
          emitter.emit("error", error);
        });
      });
      peer.on("error", (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
        emitter.emit("error", error);
      });
      peer.on("disconnected", () => {
        emitter.emit("disconnected");
      });
      peer.on("close", () => {
        emitter.emit("disconnected");
      });
    });
  }

  function disconnect() {
    cleanupPeer();
    emitter.emit("disconnected");
  }

  function draw(category) {
    if (!isConnected()) {
      throw new Error("Necesitas estar conectado para sacar un motor.");
    }
    connection.send({ type: "draw", category: (category || "").trim() });
  }

  return {
    connect,
    disconnect,
    draw,
    isConnected,
    getSessionId() {
      return sessionId;
    },
    getNormalizedId() {
      return normalizedId;
    },
    on: emitter.on,
  };
}

export { FALLBACK_CATEGORY };

// ── WEBSOCKET MANAGER ───────────────────────────────────────────
// Singleton — one connection shared across the entire app.
// Any file can call WS.send() without knowing connection details.

const WS = (() => {

  // ── PRIVATE STATE ─────────────────────────────────────────────
  let socket        = null;
  let reconnectTimer= null;
  let isConnecting  = false;
  let callbacks     = {};
  let messageQueue  = []; // messages sent before connection opens

  // The laptop's IP and port — read from URL so she just changes the URL
  // e.g. http://192.168.1.5:8080 → ws://192.168.1.5:8765
  function getWSUrl() {
    const host = window.location.hostname;
    const port = 8765; // must match WS_PORT in server/config.py
    return `ws://${host}:${port}`;
  }

  // ── CONNECT ───────────────────────────────────────────────────
  function connect() {
    if (isConnecting) return;
    isConnecting = true;

    if (callbacks.onConnecting) callbacks.onConnecting();

    try {
      socket = new WebSocket(getWSUrl());
    } catch (e) {
      console.error('WebSocket failed to create:', e);
      scheduleReconnect();
      return;
    }

    // ── ON OPEN ─────────────────────────────────────────────────
    socket.addEventListener('open', () => {
      console.log('✓ TouchBroke connected to laptop');
      isConnecting = false;
      clearTimeout(reconnectTimer);

      if (callbacks.onConnect) callbacks.onConnect();

      // Flush any messages that were queued before connection opened
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        socket.send(JSON.stringify(msg));
      }
    });

    // ── ON MESSAGE ───────────────────────────────────────────────
    // Every message from the laptop arrives here as a raw string
    // We parse it to JSON and pass to app.js's handleServerMessage
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (callbacks.onMessage) callbacks.onMessage(data);
      } catch (e) {
        console.error('Failed to parse message:', event.data);
      }
    });

    // ── ON CLOSE ─────────────────────────────────────────────────
    socket.addEventListener('close', (event) => {
      console.log('WebSocket closed. Code:', event.code);
      isConnecting = false;
      socket = null;

      if (callbacks.onDisconnect) callbacks.onDisconnect();

      // Don't reconnect if closed cleanly (code 1000)
      if (event.code !== 1000) {
        scheduleReconnect();
      }
    });

    // ── ON ERROR ─────────────────────────────────────────────────
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      // close event will fire after error, which triggers reconnect
    });
  }

  // ── RECONNECT ─────────────────────────────────────────────────
  // Waits 3 seconds then tries again — keeps trying forever
  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...');
      connect();
    }, 3000);
  }

  // ── SEND ──────────────────────────────────────────────────────
  // Called by every panel and component to send a tap event
  // to the laptop. If not connected yet, queues the message.
  function send(data) {
    const message = JSON.stringify(data);

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    } else {
      // Queue it — will be flushed once connection opens
      messageQueue.push(data);
      console.warn('WS not connected. Queued:', data);
    }
  }

  // ── INIT ──────────────────────────────────────────────────────
  // Called once from app.js with the callback functions
  function init(cbs) {
    callbacks = cbs;
    connect();
  }

  // ── PUBLIC API ────────────────────────────────────────────────
  // This is all other files see — init() once, send() anywhere
  return { init, send };

})();

export { WS };
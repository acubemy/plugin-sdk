/*
 * acubemy Plugin SDK v1 — include via
 * <script src="https://cdn.jsdelivr.net/gh/acubemy/plugin-sdk@1/v1.js"></script>
 * and use the global `acubemy`. See https://github.com/acubemy/plugin-sdk for the full API.
 * Mirrors frontend/src/plugins/protocol.ts in the acubemy app.
 */
(function () {
  if (window.acubemy) return;

  var PROTOCOL_VERSION = 1;
  var FACES = "URFDLB";
  var SOLVED = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

  var listeners = { move: [], gyro: [], state: [], device: [], ready: [] };
  var state = {
    ready: false,
    permissions: [],
    device: { connected: false, deviceName: null, hasGyro: false },
    facelets: SOLVED,
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
  };

  function emit(name, payload) {
    listeners[name].forEach(function (fn) {
      try {
        fn(payload);
      } catch (e) {
        console.error("[acubemy sdk] listener for '" + name + "' threw", e);
      }
    });
  }

  function on(name, fn) {
    listeners[name].push(fn);
    return function off() {
      listeners[name] = listeners[name].filter(function (x) { return x !== fn; });
    };
  }

  function send(message) {
    window.parent.postMessage(message, "*");
  }

  // Lets acubemy show why a plugin failed to start, e.g. a missing file or a
  // syntax error. Capture phase also catches failed <script>/<link> loads.
  function reportError(message) {
    if (window.parent !== window) send({ type: "acubemy:error", message: String(message).slice(0, 500) });
  }
  window.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      if (target && target !== window && (target.src || target.href)) {
        reportError("Failed to load " + (target.src || target.href));
      } else {
        reportError(event.message || "Unknown error");
      }
    },
    true
  );
  window.addEventListener("unhandledrejection", function (event) {
    reportError(event.reason && event.reason.message ? event.reason.message : event.reason);
  });

  function parseMove(move) {
    return { face: move[0], prime: move.indexOf("'") !== -1, double: move.indexOf("2") !== -1 };
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    var msg = event.data;
    if (!msg || typeof msg.type !== "string") return;
    switch (msg.type) {
      case "acubemy:init":
        state.ready = true;
        state.permissions = msg.permissions;
        state.device = msg.device;
        if (msg.facelets) state.facelets = msg.facelets;
        emit("device", state.device);
        emit("state", state.facelets);
        emit("ready", { permissions: state.permissions, device: state.device });
        break;
      case "acubemy:device":
        state.device = msg.device;
        emit("device", state.device);
        break;
      case "acubemy:move":
        var parsed = parseMove(msg.move);
        emit("move", { move: msg.move, face: parsed.face, prime: parsed.prime, timestamp: msg.timestamp });
        if (msg.facelets && msg.facelets !== state.facelets) {
          state.facelets = msg.facelets;
          emit("state", state.facelets);
        }
        break;
      case "acubemy:gyro":
        state.quaternion = msg.quaternion;
        emit("gyro", msg.quaternion);
        break;
      case "acubemy:state":
        if (msg.facelets === state.facelets) return;
        state.facelets = msg.facelets;
        emit("state", state.facelets);
        break;
    }
  });

  // Keyboard fallback so plugins are playable without a cube while developing
  // (only when not embedded in acubemy).
  var KEY_MOVES = { u: "U", r: "R", f: "F", d: "D", l: "L", b: "B" };
  if (window.parent === window) {
    window.addEventListener("keydown", function (e) {
      var face = KEY_MOVES[e.key.toLowerCase()];
      if (!face) return;
      var move = face + (e.shiftKey ? "'" : "");
      emit("move", { move: move, face: face, prime: e.shiftKey, timestamp: performance.now() });
    });
  }

  window.acubemy = {
    version: PROTOCOL_VERSION,
    FACES: FACES,
    SOLVED_FACELETS: SOLVED,
    /** fn({ permissions, device }) — fires once the host has connected. */
    onReady: function (fn) {
      if (state.ready) fn({ permissions: state.permissions, device: state.device });
      return on("ready", fn);
    },
    /** fn({ move: "R'", face: "R", prime: true, timestamp }) — one call per quarter turn. */
    onMove: function (fn) { return on("move", fn); },
    /** fn({ x, y, z, w }) — cube orientation, Three.js frame (Y up) after calibration. */
    onGyro: function (fn) { return on("gyro", fn); },
    /** fn(facelets) — 54-char Kociemba string (URFDLB), e.g. for rendering stickers. */
    onStateChange: function (fn) { return on("state", fn); },
    /** fn({ connected, deviceName, hasGyro }) */
    onDeviceChange: function (fn) { return on("device", fn); },
    getDevice: function () { return state.device; },
    getFacelets: function () { return state.facelets; },
    getQuaternion: function () { return state.quaternion; },
    isSolved: function () { return state.facelets === SOLVED; },
    /** Treat the current physical orientation as "white up, green front". */
    calibrateGyro: function () { send({ type: "acubemy:calibrateGyro" }); },
  };

  // The frame can load before the host page has hydrated and started
  // listening, so repeat the handshake until the host answers.
  function handshake() {
    if (state.ready || window.parent === window) return;
    send({ type: "acubemy:ready", protocolVersion: PROTOCOL_VERSION });
    setTimeout(handshake, 250);
  }
  handshake();
})();

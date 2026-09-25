# acubemy Plugin SDK (v1)

Build games and tools for Bluetooth smart cubes. acubemy handles the connection
to all supported cubes (GAN, MoYu, QiYi, GoCube, Giiker, …); your plugin just
gets clean events.

A plugin is **a static website in a public GitHub repo**: HTML, CSS, JS,
images, any framework, any library from a CDN. acubemy loads it in a sandboxed
iframe and streams cube events into it.

The fastest start is the template: [acubemy/plugin-template](https://github.com/acubemy/plugin-template).

## Minimal plugin

`index.html`:

```html
<!doctype html>
<html>
<body>
  <h1 id="out">Turn your cube</h1>
  <script src="https://cdn.jsdelivr.net/gh/acubemy/plugin-sdk@1/v1.js"></script>
  <script>
    acubemy.onMove(({ move }) => {
      document.getElementById("out").textContent = move;
    });
  </script>
</body>
</html>
```

`acubemy-plugin.json` (in the repo root):

```json
{
  "sdk": 1,
  "id": "my-game",
  "name": "My Game",
  "author": "your name",
  "version": "1.0.0",
  "description": "One or two sentences.",
  "entry": "index.html",
  "permissions": ["moves", "gyro"]
}
```

`entry` is a path relative to the repo root. Everything else in the repo is
reachable with normal relative paths (`<link href="style.css">`,
`<script type="module" src="src/main.js">`, `import "./world.js"`,
`fetch("levels/1.json")`).

## Developing and testing

Open acubemy → **Games & Plugins → Developer mode**. There are three ways to
load your plugin:

1. **Local server (recommended).** Run `npx serve --cors .` in your plugin
   folder and enter its URL (`http://localhost:3000`). The server must send
   CORS headers because the sandboxed frame has no origin of its own: without
   them, module scripts and `fetch` fail. Any static server with a CORS option
   works, e.g. `npx http-server --cors`.
2. **Single HTML file.** Drop one `.html` file onto the developer panel. No
   setup, great for a file an AI assistant just wrote for you. For more than
   one file, use a local server.
3. **GitHub branch.** Push to a branch and enter `owner/repo@branch`. Every
   reload picks up your latest commit. Use this to test on a phone or tablet.

Without acubemy around (page opened directly in the browser) the SDK simulates
cube turns with the keys `U R F D L B` (Shift = counter-clockwise).

## Publishing

Push the repo to GitHub (public). Users install it on acubemy under
**Games & Plugins** by pasting the repo URL. acubemy pins the exact commit it
installed, so a later push does not change what users run until they update.
Tag releases (`v1.0.0`) and link to `https://github.com/owner/repo/tree/v1.0.0`
to share one exact version.

Plugins by anyone other than acubemy are shown as **third-party**: acubemy
does not review them and takes no responsibility for them.

## API — global `acubemy`

| Call | Description |
| --- | --- |
| `onReady(fn)` | `fn({ permissions, device })` once the host is connected. |
| `onMove(fn)` | `fn({ move, face, prime, timestamp })` per **quarter turn**. `move` is e.g. `"R'"`, `face` one of `U R F D L B`. Half turns arrive as two quarter turns. |
| `onGyro(fn)` | `fn({ x, y, z, w })` — orientation quaternion, ~20–60 Hz. Same frame as Three.js: Y up, +Z = green (front), +X = red (right) after calibration. Only cubes with gyro sensors send it. |
| `onStateChange(fn)` | `fn(facelets)` — 54-char Kociemba string, 9 stickers per face in `URFDLB` order, row-major. Letters name the face whose center color the sticker has (U white, R red, F green, D yellow, L orange, B blue). |
| `onDeviceChange(fn)` | `fn({ connected, deviceName, hasGyro })` |
| `getDevice()` / `getFacelets()` / `getQuaternion()` | Latest values. |
| `isSolved()` | `true` if the cube is solved. |
| `calibrateGyro()` | Treat the current physical orientation as "white up, green front". Show a button for it. |
| `SOLVED_FACELETS` | The solved facelets string. |

Every `on…` returns an unsubscribe function.

### Using the gyro with Three.js

```js
acubemy.onGyro((q) => myCube.quaternion.set(q.x, q.y, q.z, q.w));

// Tilt as a joystick: horizontal part of the cube's up vector.
const up = new THREE.Vector3(0, 1, 0).applyQuaternion(myCube.quaternion);
velocity.x += up.x * speed;
velocity.z += up.z * speed;
```

## Sandbox rules

- The iframe has an opaque origin: no cookies, no `localStorage`, no access
  to acubemy accounts, solves or the user's profile.
- No popups, no navigating the acubemy page, no camera, microphone or location.
- Load libraries from CDNs that send CORS headers (jsDelivr, unpkg, esm.sh).
- Web workers must be created from a `Blob`, not from a file URL.
- Only the permissions your manifest declares are forwarded
  (`moves`, `gyro`, `state`).
- Uncaught errors and files that fail to load are reported to acubemy, so the
  install check can tell users why a plugin doesn't start.

## Examples

- [acubemy/cube-roller](https://github.com/acubemy/cube-roller) — physics game: the virtual cube follows your cube's orientation, layer turns push it around.
- [acubemy/cube-beats](https://github.com/acubemy/cube-beats) — rhythm game that only needs the `moves` permission, with music generated by the Web Audio API.

## License

MIT

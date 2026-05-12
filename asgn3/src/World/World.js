// ─── Shaders ────────────────────────────────────────────────────────────────
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying   vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4      u_FragColor;
  uniform sampler2D u_Sampler0;  // dirt/stone wall
  uniform sampler2D u_Sampler1;  // grass top
  uniform sampler2D u_Sampler2;  // sky
  uniform sampler2D u_Sampler3;  // wood planks
  uniform int       u_whichTexture;
  void main() {
    if (u_whichTexture == -1) {
      gl_FragColor = u_FragColor;
    } else if (u_whichTexture == 0) {
      gl_FragColor = u_FragColor * texture2D(u_Sampler0, v_UV);
    } else if (u_whichTexture == 1) {
      gl_FragColor = u_FragColor * texture2D(u_Sampler1, v_UV);
    } else if (u_whichTexture == 2) {
      gl_FragColor = u_FragColor * texture2D(u_Sampler2, v_UV);
    } else if (u_whichTexture == 3) {
      gl_FragColor = u_FragColor * texture2D(u_Sampler3, v_UV);
    } else {
      gl_FragColor = u_FragColor;
    }
  }`;

// ─── Globals ─────────────────────────────────────────────────────────────────
let canvas, gl;
let a_Position, a_UV;
let u_FragColor, u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_whichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3;

let camera;
let keys = {};
let lastTime = 0;
let mouseLastX = null, mouseLastY = null;
let isPointerLocked = false;

// 32×32 map: value = wall height (0=open, 1–4=walls)
// 0=open, 1-4 wall heights; negative = tree base
const g_map = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,0,0,0,2],
  [2,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,0,0,2],
  [2,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];

// ─── Texture generation ──────────────────────────────────────────────────────
function makeTex(drawFn, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  drawFn(ctx, size);
  return c;
}

function texDirt(ctx, sz) {
  ctx.fillStyle = '#8B6340'; ctx.fillRect(0, 0, sz, sz);
  const rng = mulberry32(42);
  for (let i = 0; i < 300; i++) {
    const x = rng() * sz, y = rng() * sz, w = rng() * 10 + 4, h = rng() * 10 + 4;
    const v = Math.floor(rng() * 40 - 20);
    ctx.fillStyle = `rgb(${139+v},${99+v},${64+v})`;
    ctx.fillRect(x, y, w, h);
  }
  // stone flecks
  for (let i = 0; i < 30; i++) {
    const x = rng() * sz, y = rng() * sz;
    ctx.fillStyle = `rgba(180,170,160,0.5)`;
    ctx.fillRect(x, y, 4, 4);
  }
}

function texGrass(ctx, sz) {
  ctx.fillStyle = '#5D8A3C'; ctx.fillRect(0, 0, sz, sz);
  const rng = mulberry32(7);
  for (let i = 0; i < 200; i++) {
    const x = rng() * sz, y = rng() * sz;
    const v = Math.floor(rng() * 30 - 15);
    ctx.fillStyle = `rgb(${93+v},${138+v},${60+v})`;
    ctx.fillRect(x, y, rng()*6+2, rng()*6+2);
  }
}

function texSky(ctx, sz) {
  const grad = ctx.createLinearGradient(0, 0, 0, sz);
  grad.addColorStop(0, '#1a78c2');
  grad.addColorStop(1, '#87ceeb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, sz, sz);
  // clouds
  const rng = mulberry32(99);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 5; i++) {
    const cx = rng() * sz, cy = rng() * sz * 0.5;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.arc(cx + j * 14, cy, 12 + rng()*8, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

function texWood(ctx, sz) {
  ctx.fillStyle = '#A0703A'; ctx.fillRect(0, 0, sz, sz);
  const rng = mulberry32(13);
  // plank lines
  for (let y = 0; y < sz; y += sz/4) {
    ctx.strokeStyle = '#7A5022';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sz, y); ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const xOff = (i % 2 === 0) ? 0 : sz/8;
    for (let x = xOff; x < sz; x += sz/4) {
      ctx.strokeStyle = '#7A5022';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, i*(sz/4)); ctx.lineTo(x, (i+1)*(sz/4)); ctx.stroke();
    }
  }
  for (let i = 0; i < 80; i++) {
    const x = rng()*sz, y = rng()*sz, v = Math.floor(rng()*20-10);
    ctx.fillStyle = `rgba(${160+v},${112+v},${58+v},0.3)`;
    ctx.fillRect(x, y, rng()*8+2, 2);
  }
}

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function loadTextureFromCanvas(unit, drawFn) {
  const cvs = makeTex(drawFn, 128);
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cvs);
  gl.generateMipmap(gl.TEXTURE_2D);
}

// ─── Setup ───────────────────────────────────────────────────────────────────
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) { console.error('WebGL not available'); return; }
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Failed to init shaders');
    return;
  }
  a_Position       = gl.getAttribLocation(gl.program,  'a_Position');
  a_UV             = gl.getAttribLocation(gl.program,  'a_UV');
  u_FragColor      = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix    = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix     = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_whichTexture   = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_Sampler0       = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1       = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2       = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3       = gl.getUniformLocation(gl.program, 'u_Sampler3');

  gl.uniform1i(u_Sampler0, 0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);
  gl.uniform1i(u_Sampler3, 3);
}

// ─── Input ────────────────────────────────────────────────────────────────────
function addInputListeners() {
  document.addEventListener('keydown', e => { keys[e.code] = true;  handleKeyAction(e.code); });
  document.addEventListener('keyup',   e => { keys[e.code] = false; });

  canvas.addEventListener('click', () => { canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = (document.pointerLockElement === canvas);
  });

  document.addEventListener('mousemove', e => {
    if (!isPointerLocked) return;
    const dx = e.movementX, dy = e.movementY;
    if (Math.abs(dx) > 0) camera.panLeft(-dx * 0.15);
    if (Math.abs(dy) > 0) camera.panUp  (-dy * 0.10);
  });
}

function handleKeyAction(code) {
  if (code === 'KeyF') addBlockAhead();
  if (code === 'KeyG') deleteBlockAhead();
}

function processKeys() {
  if (keys['KeyW'] || keys['ArrowUp'])    camera.moveForward();
  if (keys['KeyS'] || keys['ArrowDown'])  camera.moveBackwards();
  if (keys['KeyA'] || keys['ArrowLeft'])  camera.moveLeft();
  if (keys['KeyD'] || keys['ArrowRight']) camera.moveRight();
  if (keys['KeyQ']) camera.panLeft();
  if (keys['KeyE']) camera.panRight();
}

// ─── Block add/delete (Minecraft-lite) ───────────────────────────────────────
function getCellInFront() {
  const e = camera.eye.elements;
  const f = camera._forward().elements;
  const tx = Math.floor(e[0] + f[0] * 1.5);
  const tz = Math.floor(e[2] + f[2] * 1.5);
  if (tx < 0 || tx >= 32 || tz < 0 || tz >= 32) return null;
  return { x: tx, z: tz };
}

function addBlockAhead() {
  const cell = getCellInFront();
  if (!cell) return;
  g_map[cell.z][cell.x] = Math.min((g_map[cell.z][cell.x] || 0) + 1, 4);
}

function deleteBlockAhead() {
  const cell = getCellInFront();
  if (!cell) return;
  g_map[cell.z][cell.x] = Math.max((g_map[cell.z][cell.x] || 0) - 1, 0);
}

// ─── Rendering ───────────────────────────────────────────────────────────────
function renderAllShapes() {
  gl.clearColor(0.53, 0.81, 0.92, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix,       false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  drawSky();
  drawGround();
  drawWorld();
}

function drawSky() {
  const sky = new Cube();
  sky.textureNum = 2;
  sky.color = [1, 1, 1, 1];
  sky.matrix.setTranslate(-500, -500, -500);
  sky.matrix.scale(1000, 1000, 1000);
  gl.disable(gl.CULL_FACE);
  sky.render();
  gl.enable(gl.CULL_FACE);
}

function drawGround() {
  const ground = new Cube();
  ground.textureNum = 1;
  ground.color = [1, 1, 1, 1];
  ground.matrix.setTranslate(-1, -0.01, -1);
  ground.matrix.scale(34, 0.02, 34);
  ground.render();
}

function drawWorld() {
  for (let z = 0; z < 32; z++) {
    for (let x = 0; x < 32; x++) {
      const h = g_map[z][x];
      if (!h) continue;
      for (let y = 0; y < h; y++) {
        const cube = new Cube();
        // Top layer gets grass texture for height-1 walls, wood for height 3+, dirt for rest
        if (y === h - 1 && h === 1) {
          cube.textureNum = 1; // grass top
          cube.color = [1, 1, 1, 1];
        } else if (h >= 3) {
          cube.textureNum = 3; // wood planks
          cube.color = [1, 1, 1, 1];
        } else {
          cube.textureNum = 0; // dirt/stone
          cube.color = [1, 1, 1, 1];
        }
        cube.matrix.setTranslate(x, y, z);
        cube.render();
      }
    }
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────
function tick(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  processKeys();
  renderAllShapes();

  requestAnimationFrame(tick);
}

// ─── Entry ────────────────────────────────────────────────────────────────────
function main() {
  setupWebGL();
  connectVariablesToGLSL();

  loadTextureFromCanvas(0, texDirt);
  loadTextureFromCanvas(1, texGrass);
  loadTextureFromCanvas(2, texSky);
  loadTextureFromCanvas(3, texWood);

  camera = new Camera();
  camera.eye.elements[0] = 16;
  camera.eye.elements[1] = 1.7;
  camera.eye.elements[2] = 20;
  camera.at.elements[0]  = 16;
  camera.at.elements[1]  = 1.7;
  camera.at.elements[2]  = 19;
  camera._updateView();

  addInputListeners();
  requestAnimationFrame(tick);
}

window.onload = main;

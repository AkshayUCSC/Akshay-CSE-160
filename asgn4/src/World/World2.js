// World.js — Assignment 4: Phong Lighting

// ─── Shaders ────────────────────────────────────────────────────────────────
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;

  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_WorldPos;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_NormalMatrix;

  void main() {
    v_WorldPos  = u_ModelMatrix * a_Position;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * v_WorldPos;
    v_UV        = a_UV;
    v_Normal    = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0)));
  }`;

var FSHADER_SOURCE = `
  precision mediump float;

  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_WorldPos;

  uniform vec4      u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform int       u_whichTexture;

  uniform int   u_LightingOn;
  uniform int   u_ShowNormals;
  uniform int   u_PointLightOn;
  uniform vec3  u_LightPos;
  uniform vec3  u_LightColor;
  uniform vec3  u_EyePos;

  uniform int   u_SpotOn;
  uniform vec3  u_SpotPos;
  uniform vec3  u_SpotDir;
  uniform float u_SpotCutoff;

  void main() {
    // Normal visualisation mode
    if (u_ShowNormals == 1) {
      gl_FragColor = vec4(normalize(v_Normal) * 0.5 + 0.5, 1.0);
      return;
    }

    // Base colour / texture
    vec4 baseColor;
    if      (u_whichTexture == -1) { baseColor = u_FragColor; }
    else if (u_whichTexture ==  0) { baseColor = u_FragColor * texture2D(u_Sampler0, v_UV); }
    else if (u_whichTexture ==  1) { baseColor = u_FragColor * texture2D(u_Sampler1, v_UV); }
    else if (u_whichTexture ==  2) { baseColor = u_FragColor * texture2D(u_Sampler2, v_UV); }
    else if (u_whichTexture ==  3) { baseColor = u_FragColor * texture2D(u_Sampler3, v_UV); }
    else                           { baseColor = u_FragColor; }

    if (u_LightingOn == 0) {
      gl_FragColor = baseColor;
      return;
    }

    vec3 N        = normalize(v_Normal);
    vec3 worldPos = v_WorldPos.xyz;
    vec3 V        = normalize(u_EyePos - worldPos);

    // Ambient base
    float ka = 0.3;
    vec3 lighting = vec3(ka);

    // Point light — Phong diffuse + specular
    if (u_PointLightOn == 1) {
      vec3  L    = normalize(u_LightPos - worldPos);
      vec3  R    = reflect(-L, N);
      float diff = max(dot(N, L), 0.0);
      float spec = pow(max(dot(R, V), 0.0), 32.0);
      lighting  += u_LightColor * (0.7 * diff + 0.5 * spec);
    }

    // Spot light — cone check then Phong
    if (u_SpotOn == 1) {
      vec3  fragToSpot = normalize(u_SpotPos - worldPos);
      float cosAngle   = dot(normalize(u_SpotDir), -fragToSpot);
      if (cosAngle > u_SpotCutoff) {
        float factor = (cosAngle - u_SpotCutoff) / (1.0 - u_SpotCutoff);
        vec3  SR     = reflect(-fragToSpot, N);
        float sDiff  = max(dot(N, fragToSpot), 0.0);
        float sSpec  = pow(max(dot(SR, V), 0.0), 32.0);
        lighting    += vec3(1.0, 0.85, 0.4) * factor * (0.7 * sDiff + 0.5 * sSpec);
      }
    }

    gl_FragColor = vec4(clamp(baseColor.rgb * lighting, 0.0, 1.0), baseColor.a);
  }`;

// ─── Globals ─────────────────────────────────────────────────────────────────
let canvas, gl;
let a_Position, a_UV, a_Normal;
let u_FragColor, u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_whichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3;
let u_LightingOn, u_ShowNormals, u_PointLightOn;
let u_LightPos, u_LightColor, u_EyePos;
let u_SpotOn, u_SpotPos, u_SpotDir, u_SpotCutoff;

let camera;
let keys = {};
let lastTime = 0;
let isPointerLocked = false;

// Scene objects (initialized once in main to avoid per-frame GPU buffer creation)
let g_sphere1, g_sphere2, g_gem;

// Lighting state
let g_lightingOn    = 1;
let g_showNormals   = 0;
let g_pointLightOn  = 1;
let g_spotOn        = 1;
let g_animOn        = 1;
let g_lightAngle    = 0;    // degrees, drives orbit animation
let g_lightPos      = [16, 10, 16];
let g_lightColor    = [1, 1, 1];

// Spot light fixed position + direction (points at world centre, ground level)
const SPOT_POS = [24, 12, 8];
const SPOT_DIR = (function() {
  const dx = 16 - SPOT_POS[0], dy = 0 - SPOT_POS[1], dz = 22 - SPOT_POS[2];
  const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
  return [dx/len, dy/len, dz/len];
})();
const SPOT_CUTOFF = Math.cos(28 * Math.PI / 180);

// 32×32 map (value = wall height; 0 = open)
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

// ─── Texture helpers ─────────────────────────────────────────────────────────
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeTex(drawFn, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  drawFn(c.getContext('2d'), size);
  return c;
}

function texDirt(ctx, sz) {
  ctx.fillStyle = '#8B6340'; ctx.fillRect(0, 0, sz, sz);
  const rng = mulberry32(42);
  for (let i = 0; i < 300; i++) {
    const v = Math.floor(rng() * 40 - 20);
    ctx.fillStyle = `rgb(${139+v},${99+v},${64+v})`;
    ctx.fillRect(rng()*sz, rng()*sz, rng()*10+4, rng()*10+4);
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = 'rgba(180,170,160,0.5)';
    ctx.fillRect(rng()*sz, rng()*sz, 4, 4);
  }
}

function texGrass(ctx, sz) {
  ctx.fillStyle = '#5D8A3C'; ctx.fillRect(0, 0, sz, sz);
  const rng = mulberry32(7);
  for (let i = 0; i < 200; i++) {
    const v = Math.floor(rng() * 30 - 15);
    ctx.fillStyle = `rgb(${93+v},${138+v},${60+v})`;
    ctx.fillRect(rng()*sz, rng()*sz, rng()*6+2, rng()*6+2);
  }
}

function texSky(ctx, sz) {
  const g = ctx.createLinearGradient(0, 0, 0, sz);
  g.addColorStop(0, '#1a78c2'); g.addColorStop(1, '#87ceeb');
  ctx.fillStyle = g; ctx.fillRect(0, 0, sz, sz);
  const rng = mulberry32(99);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 5; i++) {
    const cx = rng()*sz, cy = rng()*sz*0.5;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath(); ctx.arc(cx+j*14, cy, 12+rng()*8, 0, Math.PI*2); ctx.fill();
    }
  }
}

function texWood(ctx, sz) {
  ctx.fillStyle = '#A0703A'; ctx.fillRect(0, 0, sz, sz);
  const rng = mulberry32(13);
  for (let y = 0; y < sz; y += sz/4) {
    ctx.strokeStyle = '#7A5022'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(sz,y); ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const xOff = (i%2===0) ? 0 : sz/8;
    for (let x = xOff; x < sz; x += sz/4) {
      ctx.strokeStyle = '#7A5022'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x,i*(sz/4)); ctx.lineTo(x,(i+1)*(sz/4)); ctx.stroke();
    }
  }
  for (let i = 0; i < 80; i++) {
    const v = Math.floor(rng()*20-10);
    ctx.fillStyle = `rgba(${160+v},${112+v},${58+v},0.3)`;
    ctx.fillRect(rng()*sz, rng()*sz, rng()*8+2, 2);
  }
}

function loadTextureFromCanvas(unit, drawFn) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, makeTex(drawFn));
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
    console.error('Failed to init shaders'); return;
  }
  a_Position          = gl.getAttribLocation(gl.program,  'a_Position');
  a_UV                = gl.getAttribLocation(gl.program,  'a_UV');
  a_Normal            = gl.getAttribLocation(gl.program,  'a_Normal');

  u_FragColor         = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix       = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_NormalMatrix      = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_ViewMatrix        = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix  = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_whichTexture      = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_Sampler0          = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1          = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2          = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3          = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_LightingOn        = gl.getUniformLocation(gl.program, 'u_LightingOn');
  u_ShowNormals       = gl.getUniformLocation(gl.program, 'u_ShowNormals');
  u_PointLightOn      = gl.getUniformLocation(gl.program, 'u_PointLightOn');
  u_LightPos          = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_LightColor        = gl.getUniformLocation(gl.program, 'u_LightColor');
  u_EyePos            = gl.getUniformLocation(gl.program, 'u_EyePos');
  u_SpotOn            = gl.getUniformLocation(gl.program, 'u_SpotOn');
  u_SpotPos           = gl.getUniformLocation(gl.program, 'u_SpotPos');
  u_SpotDir           = gl.getUniformLocation(gl.program, 'u_SpotDir');
  u_SpotCutoff        = gl.getUniformLocation(gl.program, 'u_SpotCutoff');

  gl.uniform1i(u_Sampler0, 0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);
  gl.uniform1i(u_Sampler3, 3);

  // Spot light constants (never change)
  gl.uniform3fv(u_SpotPos,     new Float32Array(SPOT_POS));
  gl.uniform3fv(u_SpotDir,     new Float32Array(SPOT_DIR));
  gl.uniform1f(u_SpotCutoff,   SPOT_CUTOFF);
}

// ─── UI ──────────────────────────────────────────────────────────────────────
function setupUI() {
  const btnLighting = document.getElementById('btnLighting');
  const btnPoint    = document.getElementById('btnPoint');
  const btnNormals  = document.getElementById('btnNormals');
  const btnSpot     = document.getElementById('btnSpot');
  const btnAnim     = document.getElementById('btnAnim');

  btnLighting.addEventListener('click', () => {
    g_lightingOn = 1 - g_lightingOn;
    btnLighting.textContent = 'Lighting: ' + (g_lightingOn ? 'ON' : 'OFF');
    btnLighting.classList.toggle('active', !!g_lightingOn);
  });
  btnPoint.addEventListener('click', () => {
    g_pointLightOn = 1 - g_pointLightOn;
    btnPoint.textContent = 'Point Light: ' + (g_pointLightOn ? 'ON' : 'OFF');
    btnPoint.classList.toggle('active', !!g_pointLightOn);
  });
  btnNormals.addEventListener('click', () => {
    g_showNormals = 1 - g_showNormals;
    btnNormals.textContent = 'Normals: ' + (g_showNormals ? 'ON' : 'OFF');
    btnNormals.classList.toggle('active', !!g_showNormals);
  });
  btnSpot.addEventListener('click', () => {
    g_spotOn = 1 - g_spotOn;
    btnSpot.textContent = 'Spot Light: ' + (g_spotOn ? 'ON' : 'OFF');
    btnSpot.classList.toggle('active', !!g_spotOn);
  });
  btnAnim.addEventListener('click', () => {
    g_animOn = 1 - g_animOn;
    btnAnim.textContent = 'Anim: ' + (g_animOn ? 'ON' : 'OFF');
    btnAnim.classList.toggle('active', !!g_animOn);
  });

  document.getElementById('lightAngle').addEventListener('input', function() {
    g_lightAngle = +this.value;
  });
  document.getElementById('lightR').addEventListener('input', updateLightColor);
  document.getElementById('lightG').addEventListener('input', updateLightColor);
  document.getElementById('lightB').addEventListener('input', updateLightColor);
}

function updateLightColor() {
  g_lightColor[0] = document.getElementById('lightR').value / 255;
  g_lightColor[1] = document.getElementById('lightG').value / 255;
  g_lightColor[2] = document.getElementById('lightB').value / 255;
}

// ─── Input ───────────────────────────────────────────────────────────────────
function addInputListeners() {
  document.addEventListener('keydown', e => { keys[e.code] = true;  handleKeyAction(e.code); });
  document.addEventListener('keyup',   e => { keys[e.code] = false; });
  canvas.addEventListener('click', () => canvas.requestPointerLock());
  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = (document.pointerLockElement === canvas);
  });
  document.addEventListener('mousemove', e => {
    if (!isPointerLocked) return;
    if (Math.abs(e.movementX) > 0) camera.panLeft(-e.movementX * 0.15);
    if (Math.abs(e.movementY) > 0) camera.panUp  (-e.movementY * 0.10);
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

// ─── Block add/delete ────────────────────────────────────────────────────────
function getCellInFront() {
  const e = camera.eye.elements, f = camera._forward().elements;
  const tx = Math.floor(e[0] + f[0] * 1.5), tz = Math.floor(e[2] + f[2] * 1.5);
  if (tx < 0 || tx >= 32 || tz < 0 || tz >= 32) return null;
  return { x: tx, z: tz };
}

function addBlockAhead() {
  const cell = getCellInFront(); if (!cell) return;
  g_map[cell.z][cell.x] = Math.min((g_map[cell.z][cell.x] || 0) + 1, 4);
}

function deleteBlockAhead() {
  const cell = getCellInFront(); if (!cell) return;
  g_map[cell.z][cell.x] = Math.max((g_map[cell.z][cell.x] || 0) - 1, 0);
}

// ─── Rendering ───────────────────────────────────────────────────────────────
function updateLightPosition(dt) {
  if (g_animOn) {
    g_lightAngle = (g_lightAngle + 40 * dt) % 360;
    document.getElementById('lightAngle').value = Math.floor(g_lightAngle);
  }
  const rad   = g_lightAngle * Math.PI / 180;
  const ht    = +document.getElementById('lightHeight').value;
  g_lightPos  = [16 + 8 * Math.cos(rad), ht, 22 + 8 * Math.sin(rad)];
}

function setLightingUniforms() {
  const e = camera.eye.elements;
  gl.uniform3f(u_EyePos,      e[0], e[1], e[2]);
  gl.uniform3fv(u_LightPos,   new Float32Array(g_lightPos));
  gl.uniform3fv(u_LightColor, new Float32Array(g_lightColor));
  gl.uniform1i(u_LightingOn,   g_lightingOn);
  gl.uniform1i(u_ShowNormals,  g_showNormals);
  gl.uniform1i(u_PointLightOn, g_pointLightOn);
  gl.uniform1i(u_SpotOn,       g_spotOn);
}

function renderAllShapes(dt) {
  gl.clearColor(0.53, 0.81, 0.92, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix,        false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix,  false, camera.projectionMatrix.elements);

  updateLightPosition(dt);
  setLightingUniforms();

  drawSky();
  drawGround();
  drawWorld();
  drawSpheres();
  drawGemModel();
  drawLightMarker();
  drawSpotMarker();
}

// Temporarily disable lighting for objects that should not be shaded
function withLightingOff(fn) {
  gl.uniform1i(u_LightingOn,  0);
  gl.uniform1i(u_ShowNormals, 0);
  fn();
  gl.uniform1i(u_LightingOn,  g_lightingOn);
  gl.uniform1i(u_ShowNormals, g_showNormals);
}

function drawSky() {
  withLightingOff(() => {
    const sky = new Cube();
    sky.textureNum = 2;
    sky.color = [1, 1, 1, 1];
    sky.matrix.setTranslate(-500, -500, -500);
    sky.matrix.scale(1000, 1000, 1000);
    gl.disable(gl.CULL_FACE);
    sky.render();
    gl.enable(gl.CULL_FACE);
  });
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
        if (y === h - 1 && h === 1)   { cube.textureNum = 1; }
        else if (h >= 3)               { cube.textureNum = 3; }
        else                           { cube.textureNum = 0; }
        cube.color = [1, 1, 1, 1];
        cube.matrix.setTranslate(x, y, z);
        cube.render();
      }
    }
  }
}

function drawSpheres() {
  g_sphere1.render();
  g_sphere2.render();
}

function drawGemModel() {
  g_gem.render();
}

// Small cube at point-light location (unlit, shows light colour)
function drawLightMarker() {
  withLightingOff(() => {
    const m = new Cube();
    m.textureNum = -1;
    m.color = [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1];
    m.matrix.setTranslate(g_lightPos[0]-0.15, g_lightPos[1]-0.15, g_lightPos[2]-0.15);
    m.matrix.scale(0.3, 0.3, 0.3);
    m.render();
  });
}

// Small yellow cube at spot-light location
function drawSpotMarker() {
  if (!g_spotOn) return;
  withLightingOff(() => {
    const m = new Cube();
    m.textureNum = -1;
    m.color = [1.0, 0.9, 0.3, 1];
    m.matrix.setTranslate(SPOT_POS[0]-0.15, SPOT_POS[1]-0.15, SPOT_POS[2]-0.15);
    m.matrix.scale(0.3, 0.3, 0.3);
    m.render();
  });
}

// ─── Main loop ───────────────────────────────────────────────────────────────
function tick(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  processKeys();
  renderAllShapes(dt);
  requestAnimationFrame(tick);
}

// ─── Entry ───────────────────────────────────────────────────────────────────
function main() {
  setupWebGL();
  connectVariablesToGLSL();

  loadTextureFromCanvas(0, texDirt);
  loadTextureFromCanvas(1, texGrass);
  loadTextureFromCanvas(2, texSky);
  loadTextureFromCanvas(3, texWood);

  camera = new Camera();
  // Start south of centre in open space, looking north at the red sphere
  camera.eye.elements[0] = 16;
  camera.eye.elements[1] = 3;
  camera.eye.elements[2] = 29;
  camera.at.elements[0]  = 16;
  camera.at.elements[1]  = 1.5;
  camera.at.elements[2]  = 22;
  camera._updateView();

  // Build scene objects once (Sphere/Model create GPU buffers in their constructors)
  g_sphere1 = new Sphere();
  g_sphere1.color = [0.9, 0.15, 0.1, 1];
  // Place in open space south of the enclosed room (rows z=13-17)
  g_sphere1.matrix.setTranslate(16, 1, 22);

  g_sphere2 = new Sphere();
  g_sphere2.color = [0.1, 0.5, 0.9, 1];
  g_sphere2.matrix.setTranslate(7, 1, 7);

  g_gem = new Model();
  g_gem.color = [0.6, 0.15, 0.9, 1];
  g_gem.matrix.setTranslate(26, 1.5, 6);
  g_gem.matrix.scale(1.5, 1.5, 1.5);

  addInputListeners();
  setupUI();
  requestAnimationFrame(tick);
}

window.onload = main;

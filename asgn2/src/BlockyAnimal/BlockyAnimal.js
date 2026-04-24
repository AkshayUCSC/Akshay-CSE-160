// BlockyAnimal.js
// A blocky 3D ox made from cubes plus cone primitives for horns and tail tuft.

// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 uGlobalRotation;

  void main() {
    gl_Position = uGlobalRotation * u_ModelMatrix * a_Position;
  }
`;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;

  void main() {
    gl_FragColor = u_FragColor;
  }
`;

// IMPORTANT:
// Use var instead of let here so Cube.js can access these as globals.
var canvas;
var gl;
var a_Position;
var u_FragColor;
var u_ModelMatrix;
var uGlobalRotation;

// Camera / global rotation
var g_globalAngleY = 20;
var g_globalAngleX = -8;
var g_mouseDragging = false;
var g_lastMouseX = 0;
var g_lastMouseY = 0;

// Animation state
var g_animationOn = true;
var g_startTime = performance.now() / 1000.0;
var g_seconds = 0;
var g_pokeStart = -100;

// Slider-controlled joint values
var g_neckAngle = -12;
var g_headAngle = 6;
var g_jawAngle = 0;
var g_tailAngle = 12;
var g_frontLegAngle = 8;
var g_frontKneeAngle = 15;
var g_frontHoofAngle = -8;
var g_backLegAngle = -8;
var g_backKneeAngle = 15;
var g_backHoofAngle = -8;

// Values used for each frame
var g_frame = {};

// Cached cone geometry
var g_coneBuffer = null;
var g_coneVertexCount = 0;

function setupWebGL() {
  canvas = document.getElementById("webgl");

  if (!canvas) {
    console.log("Could not find canvas. Check that the canvas id is exactly webgl.");
    return false;
  }

  gl = canvas.getContext("webgl");

  if (!gl) {
    gl = canvas.getContext("experimental-webgl");
  }

  if (!gl) {
    console.log("Failed to get WebGL context.");
    return false;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.68, 0.83, 0.96, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  return true;
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to initialize shaders.");
    return false;
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("Failed to get the storage location of a_Position");
    return false;
  }

  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  if (!u_FragColor) {
    console.log("Failed to get the storage location of u_FragColor");
    return false;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  if (!u_ModelMatrix) {
    console.log("Failed to get the storage location of u_ModelMatrix");
    return false;
  }

  uGlobalRotation = gl.getUniformLocation(gl.program, "uGlobalRotation");
  if (!uGlobalRotation) {
    console.log("Failed to get the storage location of uGlobalRotation");
    return false;
  }

  var identity = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);
  gl.uniformMatrix4fv(uGlobalRotation, false, identity.elements);

  return true;
}

function addActionsForHtmlUI() {
  document.getElementById("animationOnButton").onclick = function () {
    g_animationOn = true;
  };

  document.getElementById("animationOffButton").onclick = function () {
    g_animationOn = false;
  };

  document.getElementById("resetButton").onclick = function () {
    g_globalAngleY = 20;
    g_globalAngleX = -8;

    g_neckAngle = -12;
    g_headAngle = 6;
    g_jawAngle = 0;
    g_tailAngle = 12;

    g_frontLegAngle = 8;
    g_frontKneeAngle = 15;
    g_frontHoofAngle = -8;

    g_backLegAngle = -8;
    g_backKneeAngle = 15;
    g_backHoofAngle = -8;

    syncSliders();
    renderScene();
  };

  bindSlider("globalYSlide", function (value) {
    g_globalAngleY = value;
    renderScene();
  });

  bindSlider("globalXSlide", function (value) {
    g_globalAngleX = value;
    renderScene();
  });

  bindSlider("neckSlide", function (value) {
    g_neckAngle = value;
    renderScene();
  });

  bindSlider("headSlide", function (value) {
    g_headAngle = value;
    renderScene();
  });

  bindSlider("jawSlide", function (value) {
    g_jawAngle = value;
    renderScene();
  });

  bindSlider("tailSlide", function (value) {
    g_tailAngle = value;
    renderScene();
  });

  bindSlider("frontLegSlide", function (value) {
    g_frontLegAngle = value;
    renderScene();
  });

  bindSlider("frontKneeSlide", function (value) {
    g_frontKneeAngle = value;
    renderScene();
  });

  bindSlider("frontHoofSlide", function (value) {
    g_frontHoofAngle = value;
    renderScene();
  });

  bindSlider("backLegSlide", function (value) {
    g_backLegAngle = value;
    renderScene();
  });

  bindSlider("backKneeSlide", function (value) {
    g_backKneeAngle = value;
    renderScene();
  });

  bindSlider("backHoofSlide", function (value) {
    g_backHoofAngle = value;
    renderScene();
  });

  canvas.onmousedown = function (ev) {
    if (ev.shiftKey) {
      startPokeAnimation();
      return;
    }

    g_mouseDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };

  canvas.onmouseup = function () {
    g_mouseDragging = false;
  };

  canvas.onmouseleave = function () {
    g_mouseDragging = false;
  };

  canvas.onmousemove = function (ev) {
    if (!g_mouseDragging || ev.shiftKey) {
      return;
    }

    var dx = ev.clientX - g_lastMouseX;
    var dy = ev.clientY - g_lastMouseY;

    g_globalAngleY += dx * 0.6;
    g_globalAngleX += dy * 0.6;

    g_globalAngleX = Math.max(-75, Math.min(75, g_globalAngleX));

    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;

    updateSliderValue("globalYSlide", g_globalAngleY);
    updateSliderValue("globalXSlide", g_globalAngleX);

    renderScene();
  };
}

function bindSlider(id, setter) {
  var slider = document.getElementById(id);

  if (!slider) {
    console.log("Missing slider: " + id);
    return;
  }

  slider.addEventListener("input", function () {
    setter(Number(this.value));
  });
}

function updateSliderValue(id, value) {
  var slider = document.getElementById(id);

  if (slider) {
    slider.value = value;
  }
}

function syncSliders() {
  updateSliderValue("globalYSlide", g_globalAngleY);
  updateSliderValue("globalXSlide", g_globalAngleX);

  updateSliderValue("neckSlide", g_neckAngle);
  updateSliderValue("headSlide", g_headAngle);
  updateSliderValue("jawSlide", g_jawAngle);
  updateSliderValue("tailSlide", g_tailAngle);

  updateSliderValue("frontLegSlide", g_frontLegAngle);
  updateSliderValue("frontKneeSlide", g_frontKneeAngle);
  updateSliderValue("frontHoofSlide", g_frontHoofAngle);

  updateSliderValue("backLegSlide", g_backLegAngle);
  updateSliderValue("backKneeSlide", g_backKneeAngle);
  updateSliderValue("backHoofSlide", g_backHoofAngle);
}

function main() {
  console.log("main() started");

  if (!setupWebGL()) {
    return;
  }

  if (!connectVariablesToGLSL()) {
    return;
  }

  addActionsForHtmlUI();
  initConeBuffer();
  syncSliders();

  updateAnimationAngles();
  renderScene();

  requestAnimationFrame(tick);
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;

  updateAnimationAngles();
  renderScene();

  requestAnimationFrame(tick);
}

function startPokeAnimation() {
  g_pokeStart = g_seconds;
}

function getPokeAmount() {
  var elapsed = g_seconds - g_pokeStart;

  if (elapsed < 0 || elapsed > 2.5) {
    return 0;
  }

  return Math.sin((elapsed / 2.5) * Math.PI);
}

function updateAnimationAngles() {
  var walk = Math.sin(g_seconds * 4.2);
  var fastWalk = Math.sin(g_seconds * 8.4);
  var slow = Math.sin(g_seconds * 1.8);
  var poke = getPokeAmount();

  g_frame = {
    bodyBob: 0,
    bodyRoll: 0,

    neck: g_neckAngle,
    head: g_headAngle,
    jaw: g_jawAngle,
    tail: g_tailAngle,

    frontLeg: g_frontLegAngle,
    frontKnee: g_frontKneeAngle,
    frontHoof: g_frontHoofAngle,

    backLeg: g_backLegAngle,
    backKnee: g_backKneeAngle,
    backHoof: g_backHoofAngle,

    ear: 0,
    hornWiggle: 0
  };

  if (g_animationOn) {
    g_frame.bodyBob += 0.025 * Math.abs(walk);
    g_frame.bodyRoll += 2.0 * slow;

    g_frame.neck += 5 * slow;
    g_frame.head += 7 * Math.sin(g_seconds * 2.2);
    g_frame.jaw += 6 * Math.max(0, Math.sin(g_seconds * 3.5));
    g_frame.tail += 28 * Math.sin(g_seconds * 3.2);

    g_frame.frontLeg += 24 * walk;
    g_frame.backLeg -= 24 * walk;

    g_frame.frontKnee += 12 * Math.max(0, -walk);
    g_frame.backKnee += 12 * Math.max(0, walk);

    g_frame.frontHoof += 10 * fastWalk;
    g_frame.backHoof -= 10 * fastWalk;

    g_frame.ear += 7 * Math.sin(g_seconds * 5.0);
  }

  if (poke > 0) {
    g_frame.bodyBob += 0.10 * poke;
    g_frame.bodyRoll += 8 * Math.sin(g_seconds * 16) * poke;

    g_frame.neck += -24 * poke;
    g_frame.head += 32 * Math.sin(g_seconds * 18) * poke;
    g_frame.jaw += 32 * poke;
    g_frame.tail += 70 * poke;

    g_frame.ear += 25 * Math.sin(g_seconds * 20) * poke;
    g_frame.hornWiggle += 10 * Math.sin(g_seconds * 22) * poke;
  }
}

function renderScene() {
  if (!gl) {
    return;
  }

  var startTime = performance.now();

  var globalRotMat = new Matrix4();
  globalRotMat.rotate(g_globalAngleX, 1, 0, 0);
  globalRotMat.rotate(g_globalAngleY, 0, 1, 0);

  gl.uniformMatrix4fv(uGlobalRotation, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  drawGround();
  drawOx();

  var duration = performance.now() - startTime;
  var fps = duration > 0 ? Math.floor(10000 / duration) / 10 : 0;

  sendTextToHTML("ms: " + Math.floor(duration) + " | fps: " + fps, "numdot");
}

function drawOx() {
  var root = new Matrix4();

  root.translate(0, -0.03 + g_frame.bodyBob, 0);
  root.rotate(g_frame.bodyRoll, 0, 0, 1);

  // Main body
  drawBox(root, -0.50, -0.18, -0.25, 0.95, 0.42, 0.50, [0.54, 0.30, 0.15, 1.0]);

  // Shoulder hump
  drawBox(root, -0.30, 0.16, -0.22, 0.46, 0.20, 0.44, [0.47, 0.25, 0.12, 1.0]);

  // Rear block
  drawBox(root, -0.56, -0.07, -0.20, 0.14, 0.27, 0.40, [0.43, 0.23, 0.12, 1.0]);

  // Chest patch
  drawBox(root, 0.32, -0.12, -0.255, 0.12, 0.26, 0.015, [0.93, 0.86, 0.73, 1.0]);

  // Neck
  var neck = new Matrix4(root);
  neck.translate(0.38, 0.09, 0.0);
  neck.rotate(g_frame.neck, 0, 0, 1);
  drawSegmentX(neck, 0.25, 0.18, 0.26, [0.50, 0.27, 0.13, 1.0]);

  // Head
  var head = new Matrix4(neck);
  head.translate(0.25, 0.0, 0.0);
  head.rotate(g_frame.head, 0, 0, 1);
  drawSegmentX(head, 0.32, 0.28, 0.38, [0.56, 0.32, 0.17, 1.0]);

  // Snout
  var snout = new Matrix4(head);
  snout.translate(0.27, -0.03, 0.0);
  drawSegmentX(snout, 0.22, 0.18, 0.30, [0.77, 0.58, 0.40, 1.0]);

  // Jaw
  var jaw = new Matrix4(snout);
  jaw.translate(0.05, -0.09, 0.0);
  jaw.rotate(-g_frame.jaw, 0, 0, 1);
  drawSegmentX(jaw, 0.16, 0.055, 0.25, [0.65, 0.42, 0.26, 1.0]);

  // Eyes
  drawBox(head, 0.22, 0.06, -0.205, 0.035, 0.035, 0.018, [0.02, 0.02, 0.02, 1.0]);
  drawBox(head, 0.22, 0.06, 0.187, 0.035, 0.035, 0.018, [0.02, 0.02, 0.02, 1.0]);

  // Ears
  var leftEar = new Matrix4(head);
  leftEar.translate(0.03, 0.16, 0.16);
  leftEar.rotate(25 + g_frame.ear, 1, 0, 0);
  drawSegmentY(leftEar, 0.13, 0.04, 0.09, [0.42, 0.22, 0.11, 1.0]);

  var rightEar = new Matrix4(head);
  rightEar.translate(0.03, 0.16, -0.16);
  rightEar.rotate(-25 - g_frame.ear, 1, 0, 0);
  drawSegmentY(rightEar, 0.13, 0.04, 0.09, [0.42, 0.22, 0.11, 1.0]);

  // Horns
  var hornColor = [0.92, 0.83, 0.61, 1.0];

  var leftHorn = new Matrix4(head);
  leftHorn.translate(0.08, 0.15, 0.13);
  leftHorn.rotate(20 + g_frame.hornWiggle, 0, 0, 1);
  leftHorn.rotate(-35, 1, 0, 0);
  leftHorn.scale(0.045, 0.28, 0.045);
  drawCone(leftHorn, hornColor);

  var rightHorn = new Matrix4(head);
  rightHorn.translate(0.08, 0.15, -0.13);
  rightHorn.rotate(20 + g_frame.hornWiggle, 0, 0, 1);
  rightHorn.rotate(35, 1, 0, 0);
  rightHorn.scale(0.045, 0.28, 0.045);
  drawCone(rightHorn, hornColor);

  // Four 3-level legs
  drawLeg(root, 0.25, 0.18, g_frame.frontLeg, g_frame.frontKnee, g_frame.frontHoof, false);
  drawLeg(root, 0.25, -0.18, g_frame.frontLeg + 8, g_frame.frontKnee, g_frame.frontHoof, true);

  drawLeg(root, -0.32, 0.18, g_frame.backLeg, g_frame.backKnee, g_frame.backHoof, false);
  drawLeg(root, -0.32, -0.18, g_frame.backLeg - 8, g_frame.backKnee, g_frame.backHoof, true);

  // Tail
  var tailBase = new Matrix4(root);
  tailBase.translate(-0.55, 0.08, 0.0);
  tailBase.rotate(180 + g_frame.tail, 0, 0, 1);
  drawSegmentX(tailBase, 0.26, 0.045, 0.045, [0.31, 0.16, 0.08, 1.0]);

  var tailTip = new Matrix4(tailBase);
  tailTip.translate(0.26, 0.0, 0.0);
  tailTip.rotate(18 * Math.sin(g_seconds * 4), 0, 0, 1);
  tailTip.rotate(-90, 0, 0, 1);
  tailTip.scale(0.06, 0.18, 0.06);
  drawCone(tailTip, [0.10, 0.07, 0.04, 1.0]);
}

function drawLeg(parent, x, z, upperAngle, kneeAngle, hoofAngle, darker) {
  var upperColor = darker ? [0.44, 0.23, 0.11, 1.0] : [0.50, 0.27, 0.13, 1.0];
  var lowerColor = darker ? [0.34, 0.17, 0.08, 1.0] : [0.40, 0.21, 0.10, 1.0];
  var hoofColor = [0.08, 0.07, 0.06, 1.0];

  var upper = new Matrix4(parent);
  upper.translate(x, -0.16, z);
  upper.rotate(upperAngle, 1, 0, 0);
  drawSegmentYDown(upper, 0.28, 0.13, 0.13, upperColor);

  var knee = new Matrix4(upper);
  knee.translate(0.0, -0.28, 0.0);
  knee.rotate(kneeAngle, 1, 0, 0);
  drawSegmentYDown(knee, 0.25, 0.11, 0.11, lowerColor);

  var hoof = new Matrix4(knee);
  hoof.translate(0.0, -0.25, 0.0);
  hoof.rotate(hoofAngle, 1, 0, 0);
  drawSegmentYDown(hoof, 0.09, 0.17, 0.22, hoofColor);
}

function drawGround() {
  var ground = new Matrix4();
  ground.translate(-1.2, -0.74, -0.65);
  ground.scale(2.4, 0.03, 1.3);
  drawCube(ground, [0.29, 0.55, 0.25, 1.0]);

  drawBox(new Matrix4(), -0.88, -0.70, 0.36, 0.20, 0.08, 0.12, [0.89, 0.72, 0.30, 1.0]);
  drawBox(new Matrix4(), -0.74, -0.62, 0.34, 0.18, 0.08, 0.12, [0.82, 0.63, 0.23, 1.0]);
}

function drawBox(parent, tx, ty, tz, sx, sy, sz, color) {
  var m = new Matrix4(parent);
  m.translate(tx, ty, tz);
  m.scale(sx, sy, sz);
  drawCube(m, color);
}

function drawSegmentX(parent, length, height, depth, color) {
  var m = new Matrix4(parent);
  m.scale(length, height, depth);
  m.translate(0, -0.5, -0.5);
  drawCube(m, color);
}

function drawSegmentY(parent, length, width, depth, color) {
  var m = new Matrix4(parent);
  m.scale(width, length, depth);
  m.translate(-0.5, 0, -0.5);
  drawCube(m, color);
}

function drawSegmentYDown(parent, length, width, depth, color) {
  var m = new Matrix4(parent);
  m.scale(width, length, depth);
  m.translate(-0.5, -1, -0.5);
  drawCube(m, color);
}

function drawCube(matrix, color) {
  var cube = new Cube();
  cube.color = color;
  cube.matrix = matrix;
  cube.render();
}

function initConeBuffer() {
  var segments = 20;
  var vertices = [];

  for (var i = 0; i < segments; i++) {
    var a1 = (i / segments) * Math.PI * 2;
    var a2 = ((i + 1) / segments) * Math.PI * 2;

    var x1 = Math.cos(a1);
    var z1 = Math.sin(a1);
    var x2 = Math.cos(a2);
    var z2 = Math.sin(a2);

    vertices.push(x1, 0, z1);
    vertices.push(x2, 0, z2);
    vertices.push(0, 1, 0);

    vertices.push(0, 0, 0);
    vertices.push(x2, 0, z2);
    vertices.push(x1, 0, z1);
  }

  g_coneVertexCount = vertices.length / 3;

  g_coneBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, g_coneBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

function drawCone(matrix, color) {
  if (!g_coneBuffer) {
    initConeBuffer();
  }

  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_coneBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, g_coneVertexCount);
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);

  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }

  htmlElm.innerHTML = text;
}

console.log("BlockyAnimal.js loaded");

main();
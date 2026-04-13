// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program

var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;

// New flag: whether the A.Y. picture should be shown
let g_showPicture = false;

// Set up actions for the HTML UI elements
function addActionsForHtmlUI() {
  // Button Events (Color / actions)
  document.getElementById('green').onclick = function() {
    g_selectedColor = [0.0, 1.0, 0.0, 1.0];
  };

  document.getElementById('red').onclick = function() {
    g_selectedColor = [1.0, 0.0, 0.0, 1.0];
  };

  document.getElementById('clearButton').onclick = function() {
    g_shapesList = [];
    renderAllShapes();
  };

  // New button to draw the A.Y. scene
  document.getElementById('drawPictureButton').onclick = function() {
    g_showPicture = true;
    renderAllShapes();
  };

  // Shape type buttons
  document.getElementById('pointButton').onclick = function() {
    g_selectedType = POINT;
  };

  document.getElementById('triButton').onclick = function() {
    g_selectedType = TRIANGLE;
  };

  document.getElementById('circleButton').onclick = function() { 
    g_selectedType = CIRCLE; 
  };

  // Sliders
  document.getElementById('redSlide').addEventListener('mouseup', function() {
    g_selectedColor[0] = this.value / 100;
  });

  document.getElementById('greenSlide').addEventListener('mouseup', function() {
    g_selectedColor[1] = this.value / 100;
  });

  document.getElementById('blueSlide').addEventListener('mouseup', function() {
    g_selectedColor[2] = this.value / 100;
  });

  document.getElementById('sizeSlide').addEventListener('mouseup', function() {
    g_selectedSize = this.value;
  });
}

function setupWebGl() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

function main() {
  setupWebGl();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  // Register mouse events
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) {
    if (ev.buttons == 1) {
      click(ev);
    }
  };

  // Background color
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Initial render
  renderAllShapes();
}

var g_shapesList = [];

function click(ev) {
  // Extract click position in WebGL coordinates
  let [x, y] = convertCoordinatesEventToGL(ev);

  // Create and store the new point or triangle
  let point;
  if (g_selectedType == POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else {
    point = new Circle();
  }

  point.position = [x, y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  g_shapesList.push(point);

  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return [x, y];
}

function renderAllShapes() {
  var startTime = performance.now();

  // Clear canvas
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw the A.Y. picture first so painting can still happen on top of it
  if (g_showPicture) {
    drawAYPicture();
  }

  // Draw user-painted shapes
  var len = g_shapesList.length;
  for (var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }

  // Update stats text
  var duration = performance.now() - startTime;
  sendTextToHTML(
    "numdot: " + len +
    " ms: " + Math.floor(duration) +
    " fps: " + Math.floor(10000 / duration) / 10,
    "numdot"
  );
}

// ----------------------
// Helper drawing methods
// ----------------------

function drawColoredTriangle(vertices, color) {
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  drawTriangle(vertices);
}

function drawRectangle(x1, y1, x2, y2, color) {
  drawColoredTriangle([x1, y1, x2, y1, x1, y2], color);
  drawColoredTriangle([x2, y1, x2, y2, x1, y2], color);
}

function drawMountain(baseLeftX, baseRightX, baseY, peakX, peakY, bodyColor, snowColor) {
  // Main mountain
  drawColoredTriangle(
    [baseLeftX, baseY, baseRightX, baseY, peakX, peakY],
    bodyColor
  );

  // Snow cap
  drawColoredTriangle(
    [
      peakX - 0.10, peakY - 0.18,
      peakX + 0.10, peakY - 0.18,
      peakX, peakY
    ],
    snowColor
  );
}

function drawTree(cx, baseY, width, height) {
  const trunkColor = [0.45, 0.25, 0.10, 1.0];
  const leafColor = [0.10, 0.55, 0.22, 1.0];

  // trunk
  drawRectangle(cx - width * 0.10, baseY - height * 0.35, cx + width * 0.10, baseY, trunkColor);

  // leaves: 3 stacked triangles
  drawColoredTriangle(
    [cx - width * 0.50, baseY - height * 0.05, cx + width * 0.50, baseY - height * 0.05, cx, baseY + height * 0.55],
    leafColor
  );
  drawColoredTriangle(
    [cx - width * 0.40, baseY + height * 0.15, cx + width * 0.40, baseY + height * 0.15, cx, baseY + height * 0.78],
    leafColor
  );
  drawColoredTriangle(
    [cx - width * 0.30, baseY + height * 0.33, cx + width * 0.30, baseY + height * 0.33, cx, baseY + height],
    leafColor
  );
}

// ----------------------
// A.Y. picture
// ----------------------

function drawAYPicture() {
  // Colors
  const darkBlue = [0.12, 0.32, 0.72, 1.0];
  const lightBlue = [0.70, 0.86, 0.98, 1.0];
  const green = [0.52, 0.77, 0.38, 1.0];
  const darkGreen = [0.15, 0.45, 0.20, 1.0];
  const white = [0.95, 0.97, 1.0, 1.0];
  const riverBlue = [0.74, 0.90, 1.0, 1.0];
  const riverBlue2 = [0.58, 0.82, 0.98, 1.0];

  // Ground
  drawColoredTriangle([-0.95, -0.15, 0.95, -0.15, 0.00, -0.70], green);
  drawColoredTriangle([-0.95, -0.15, 0.00, -0.70, -0.45, -0.15], [0.42, 0.70, 0.28, 1.0]);
  drawColoredTriangle([0.45, -0.15, 0.95, -0.15, 0.00, -0.70], [0.46, 0.72, 0.30, 1.0]);

  // Left mountain with big A
  drawMountain(-0.62, 0.08, -0.15, -0.08, 0.70, darkBlue, white);

  // Right mountain with Y
  drawMountain(0.18, 0.82, -0.15, 0.48, 0.38, [0.50, 0.78, 0.35, 1.0], white);

  // River / valley split
  drawColoredTriangle([-0.08, -0.15, 0.32, -0.15, 0.10, -0.72], riverBlue);
  drawColoredTriangle([-0.02, -0.15, 0.26, -0.15, 0.16, -0.72], riverBlue2);
  drawColoredTriangle([0.12, -0.15, 0.26, -0.15, 0.18, -0.72], [0.86, 0.95, 1.0, 1.0]);

  // Big A on left mountain
  drawColoredTriangle([-0.48, -0.15, -0.30, 0.52, -0.12, -0.15], white);
  drawColoredTriangle([-0.39, 0.00, -0.22, 0.00, -0.305, 0.20], darkBlue);

  // Y on right mountain
  drawRectangle(0.43, -0.15, 0.49, 0.10, white);
  drawColoredTriangle([0.36, 0.12, 0.46, 0.12, 0.43, 0.00], white);
  drawColoredTriangle([0.46, 0.12, 0.56, 0.12, 0.49, 0.00], white);
  drawColoredTriangle([0.34, 0.12, 0.43, 0.00, 0.28, 0.28], white);
  drawColoredTriangle([0.49, 0.00, 0.58, 0.12, 0.66, 0.28], white);

  // Trees
  drawTree(-0.72, -0.15, 0.12, 0.28);
  drawTree(-0.58, -0.15, 0.09, 0.20);
  drawTree(0.76, -0.15, 0.12, 0.27);
  drawTree(0.62, -0.15, 0.09, 0.18);
}

// Set the text of an HTML element
function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}
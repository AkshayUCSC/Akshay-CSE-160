class Cube {
  constructor() {
    this.type = "cube";
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  static initBuffer() {
    if (Cube.vertexBuffer) {
      return;
    }

    // Full cube: 6 faces, 2 triangles per face, 3 vertices per triangle.
    // Each face is drawn separately so we can slightly shade it.
    Cube.faceVertices = [
      // Front z = 0
      [0,0,0, 1,0,0, 1,1,0,   0,0,0, 1,1,0, 0,1,0],
      // Back z = 1
      [0,0,1, 1,1,1, 1,0,1,   0,0,1, 0,1,1, 1,1,1],
      // Top y = 1
      [0,1,0, 1,1,0, 1,1,1,   0,1,0, 1,1,1, 0,1,1],
      // Bottom y = 0
      [0,0,0, 1,0,1, 1,0,0,   0,0,0, 0,0,1, 1,0,1],
      // Right x = 1
      [1,0,0, 1,0,1, 1,1,1,   1,0,0, 1,1,1, 1,1,0],
      // Left x = 0
      [0,0,0, 0,1,1, 0,0,1,   0,0,0, 0,1,0, 0,1,1]
    ];

    Cube.vertexBuffer = gl.createBuffer();
  }

  render() {
    Cube.initBuffer();

    const rgba = this.color;
    const shades = [1.0, 0.72, 0.92, 0.55, 0.82, 0.70];

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    for (let i = 0; i < Cube.faceVertices.length; i++) {
      const s = shades[i];
      gl.uniform4f(u_FragColor, rgba[0] * s, rgba[1] * s, rgba[2] * s, rgba[3]);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Cube.faceVertices[i]), gl.STATIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }
}

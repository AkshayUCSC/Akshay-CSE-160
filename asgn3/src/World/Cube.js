class Cube {
  constructor() {
    this.type        = 'cube';
    this.color       = [1.0, 1.0, 1.0, 1.0];
    this.matrix      = new Matrix4();
    this.textureNum  = -1; // -1 = solid color, 0+ = texture unit
  }

  static initBuffers() {
    if (Cube._vbuf) return;

    // 6 faces × 6 verts, interleaved: x,y,z,u,v
    // Winding: counter-clockwise (front-face outward)
    const verts = [
      // Front (z=1)
      0,0,1, 0,0,  1,0,1, 1,0,  1,1,1, 1,1,
      0,0,1, 0,0,  1,1,1, 1,1,  0,1,1, 0,1,
      // Back (z=0)
      1,0,0, 0,0,  0,0,0, 1,0,  0,1,0, 1,1,
      1,0,0, 0,0,  0,1,0, 1,1,  1,1,0, 0,1,
      // Top (y=1)
      0,1,0, 0,0,  1,1,0, 1,0,  1,1,1, 1,1,
      0,1,0, 0,0,  1,1,1, 1,1,  0,1,1, 0,1,
      // Bottom (y=0)
      0,0,1, 0,0,  1,0,1, 1,0,  1,0,0, 1,1,
      0,0,1, 0,0,  1,0,0, 1,1,  0,0,0, 0,1,
      // Right (x=1)
      1,0,1, 0,0,  1,0,0, 1,0,  1,1,0, 1,1,
      1,0,1, 0,0,  1,1,0, 1,1,  1,1,1, 0,1,
      // Left (x=0)
      0,0,0, 0,0,  0,0,1, 1,0,  0,1,1, 1,1,
      0,0,0, 0,0,  0,1,1, 1,1,  0,1,0, 0,1,
    ];

    Cube._vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    Cube._vertCount = 36;
    Cube._stride = 5 * Float32Array.BYTES_PER_ELEMENT;
  }

  render() {
    Cube.initBuffers();

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // face shading multipliers (top bright, bottom dark, sides mid)
    const shades = [0.9, 0.75, 1.0, 0.55, 0.8, 0.7];

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, Cube._stride, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, Cube._stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(a_UV);

    gl.uniform1i(u_whichTexture, this.textureNum);

    const rgba = this.color;
    for (let i = 0; i < 6; i++) {
      const s = shades[i];
      gl.uniform4f(u_FragColor, rgba[0]*s, rgba[1]*s, rgba[2]*s, rgba[3]);
      gl.drawArrays(gl.TRIANGLES, i * 6, 6);
    }
  }
}

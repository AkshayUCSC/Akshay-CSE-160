class Cube {
  constructor() {
    this.type       = 'cube';
    this.color      = [1.0, 1.0, 1.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -1;
  }

  static initBuffers() {
    if (Cube._vbuf) return;

    // 6 faces × 6 verts, interleaved: x,y,z, u,v, nx,ny,nz  (8 floats/vertex)
    const verts = [
      // Front (z=1), normal (0,0,1)
      0,0,1, 0,0,  0,0,1,   1,0,1, 1,0,  0,0,1,   1,1,1, 1,1,  0,0,1,
      0,0,1, 0,0,  0,0,1,   1,1,1, 1,1,  0,0,1,   0,1,1, 0,1,  0,0,1,
      // Back (z=0), normal (0,0,-1)
      1,0,0, 0,0,  0,0,-1,  0,0,0, 1,0,  0,0,-1,  0,1,0, 1,1,  0,0,-1,
      1,0,0, 0,0,  0,0,-1,  0,1,0, 1,1,  0,0,-1,  1,1,0, 0,1,  0,0,-1,
      // Top (y=1), normal (0,1,0)
      0,1,0, 0,0,  0,1,0,   1,1,0, 1,0,  0,1,0,   1,1,1, 1,1,  0,1,0,
      0,1,0, 0,0,  0,1,0,   1,1,1, 1,1,  0,1,0,   0,1,1, 0,1,  0,1,0,
      // Bottom (y=0), normal (0,-1,0)
      0,0,1, 0,0,  0,-1,0,  1,0,1, 1,0,  0,-1,0,  1,0,0, 1,1,  0,-1,0,
      0,0,1, 0,0,  0,-1,0,  1,0,0, 1,1,  0,-1,0,  0,0,0, 0,1,  0,-1,0,
      // Right (x=1), normal (1,0,0)
      1,0,1, 0,0,  1,0,0,   1,0,0, 1,0,  1,0,0,   1,1,0, 1,1,  1,0,0,
      1,0,1, 0,0,  1,0,0,   1,1,0, 1,1,  1,0,0,   1,1,1, 0,1,  1,0,0,
      // Left (x=0), normal (-1,0,0)
      0,0,0, 0,0, -1,0,0,   0,0,1, 1,0, -1,0,0,   0,1,1, 1,1, -1,0,0,
      0,0,0, 0,0, -1,0,0,   0,1,1, 1,1, -1,0,0,   0,1,0, 0,1, -1,0,0,
    ];

    Cube._vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    Cube._stride = 8 * Float32Array.BYTES_PER_ELEMENT;
  }

  render() {
    Cube.initBuffers();

    const nm = new Matrix4();
    nm.setInverseOf(this.matrix).transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);
    gl.uniformMatrix4fv(u_ModelMatrix,  false, this.matrix.elements);

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbuf);
    const s = Cube._stride;
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, s, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, s, 12);
    gl.enableVertexAttribArray(a_UV);
    gl.vertexAttribPointer(a_Normal,   3, gl.FLOAT, false, s, 20);
    gl.enableVertexAttribArray(a_Normal);

    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4fv(u_FragColor, new Float32Array(this.color));

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}

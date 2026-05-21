class Sphere {
  constructor() {
    this.type       = 'sphere';
    this.color      = [1.0, 0.5, 0.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -1;
    this._initBuffers();
  }

  _initBuffers() {
    const STACKS = 20, SLICES = 20;
    const data = [], indices = [];

    for (let i = 0; i <= STACKS; i++) {
      const phi = Math.PI * i / STACKS;
      const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
      for (let j = 0; j <= SLICES; j++) {
        const theta = 2 * Math.PI * j / SLICES;
        const x = sinPhi * Math.cos(theta);
        const y = cosPhi;
        const z = sinPhi * Math.sin(theta);
        // pos(3), uv(2), normal(3) — normal equals position for unit sphere
        data.push(x, y, z,  j / SLICES, i / STACKS,  x, y, z);
      }
    }

    for (let i = 0; i < STACKS; i++) {
      for (let j = 0; j < SLICES; j++) {
        const a = i * (SLICES + 1) + j;
        const b = a + SLICES + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    this._vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    this._ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    this._indexCount = indices.length;
  }

  render() {
    const nm = new Matrix4();
    nm.setInverseOf(this.matrix).transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);
    gl.uniformMatrix4fv(u_ModelMatrix,  false, this.matrix.elements);

    const stride = 8 * Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(a_UV);
    gl.vertexAttribPointer(a_Normal,   3, gl.FLOAT, false, stride, 20);
    gl.enableVertexAttribArray(a_Normal);

    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4fv(u_FragColor, new Float32Array(this.color));

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ibuf);
    gl.drawElements(gl.TRIANGLES, this._indexCount, gl.UNSIGNED_SHORT, 0);
  }
}

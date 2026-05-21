// OBJ loader — parses "v", "vn", and "f pos//norm" syntax.
// The gem.obj source is embedded so the page works without a server.
const GEM_OBJ_SRC = `
# gem.obj - Octahedron (diamond-like gem shape)
v  0.0  1.0  0.0
v  1.0  0.0  0.0
v  0.0  0.0  1.0
v -1.0  0.0  0.0
v  0.0  0.0 -1.0
v  0.0 -1.0  0.0
vn  0.5774  0.5774  0.5774
vn -0.5774  0.5774  0.5774
vn -0.5774  0.5774 -0.5774
vn  0.5774  0.5774 -0.5774
vn  0.5774 -0.5774  0.5774
vn -0.5774 -0.5774  0.5774
vn -0.5774 -0.5774 -0.5774
vn  0.5774 -0.5774 -0.5774
f 1//1 2//1 3//1
f 1//2 3//2 4//2
f 1//3 4//3 5//3
f 1//4 5//4 2//4
f 2//5 6//5 3//5
f 3//6 6//6 4//6
f 4//7 6//7 5//7
f 5//8 6//8 2//8
`;

class Model {
  constructor() {
    this.type       = 'model';
    this.color      = [0.6, 0.2, 0.9, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -1;
    this._parseOBJ(GEM_OBJ_SRC);
    this._initBuffers();
  }

  _parseOBJ(src) {
    const vPos = [], vNrm = [];
    const positions = [], normals = [];

    for (const raw of src.split('\n')) {
      const parts = raw.trim().split(/\s+/);
      if (parts[0] === 'v') {
        vPos.push([+parts[1], +parts[2], +parts[3]]);
      } else if (parts[0] === 'vn') {
        vNrm.push([+parts[1], +parts[2], +parts[3]]);
      } else if (parts[0] === 'f') {
        // triangulate (only triangles expected here)
        for (let i = 1; i <= 3; i++) {
          const tok = parts[i].split('/');
          const pi  = parseInt(tok[0]) - 1;
          const ni  = parseInt(tok[2]) - 1;
          positions.push(...vPos[pi]);
          normals.push(...vNrm[ni]);
        }
      }
    }

    this._positions  = positions;
    this._normals    = normals;
    this._vertCount  = positions.length / 3;
  }

  _initBuffers() {
    // interleaved: pos(3), uv(2=dummy), normal(3)
    const data = new Float32Array(this._vertCount * 8);
    for (let i = 0; i < this._vertCount; i++) {
      data[i*8+0] = this._positions[i*3];
      data[i*8+1] = this._positions[i*3+1];
      data[i*8+2] = this._positions[i*3+2];
      data[i*8+3] = 0; data[i*8+4] = 0;    // dummy UV
      data[i*8+5] = this._normals[i*3];
      data[i*8+6] = this._normals[i*3+1];
      data[i*8+7] = this._normals[i*3+2];
    }
    this._vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
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

    gl.drawArrays(gl.TRIANGLES, 0, this._vertCount);
  }
}

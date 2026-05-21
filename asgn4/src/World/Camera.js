class Camera {
  constructor() {
    this.fov = 60;
    this.eye = new Vector3([0, 1.5, 5]);
    this.at  = new Vector3([0, 1.5, 0]);
    this.up  = new Vector3([0, 1,   0]);
    this.viewMatrix       = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this._updateView();
    this._updateProjection();
  }

  _updateView() {
    const e = this.eye.elements, a = this.at.elements, u = this.up.elements;
    this.viewMatrix.setLookAt(e[0],e[1],e[2], a[0],a[1],a[2], u[0],u[1],u[2]);
  }

  _updateProjection() {
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
  }

  _forward() {
    const f = new Vector3(); f.set(this.at); f.sub(this.eye); f.normalize(); return f;
  }

  _right() {
    const f = this._forward();
    const r = Vector3.cross(f, this.up); r.normalize(); return r;
  }

  moveForward(speed = 0.15) {
    const f = this._forward(); f.mul(speed);
    this.eye.add(f); this.at.add(f);
    this._updateView();
  }

  moveBackwards(speed = 0.15) {
    const b = this._forward(); b.mul(-speed);
    this.eye.add(b); this.at.add(b);
    this._updateView();
  }

  moveLeft(speed = 0.15) {
    const s = Vector3.cross(this.up, this._forward()); s.normalize(); s.mul(speed);
    this.eye.add(s); this.at.add(s);
    this._updateView();
  }

  moveRight(speed = 0.15) {
    const s = Vector3.cross(this._forward(), this.up); s.normalize(); s.mul(speed);
    this.eye.add(s); this.at.add(s);
    this._updateView();
  }

  panLeft(alpha = 3) {
    const f = this._forward();
    const rot = new Matrix4(); rot.setRotate(alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    const fp = rot.multiplyVector3(f);
    this.at.set(this.eye); this.at.add(fp);
    this._updateView();
  }

  panRight(alpha = 3) { this.panLeft(-alpha); }

  panUp(alpha = 2) {
    const f = this._forward();
    const r = this._right();
    const rot = new Matrix4(); rot.setRotate(alpha, r.elements[0], r.elements[1], r.elements[2]);
    const fp = rot.multiplyVector3(f);
    this.at.set(this.eye); this.at.add(fp);
    this._updateView();
  }

  panDown(alpha = 2) { this.panUp(-alpha); }
}

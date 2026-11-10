/* v14.1.4: first person follows your cart into the air. Off a jump, a kicker, a stunt ramp or a race jump, your eyes rise and fall with
   the cart and the view tips with its nose, so you feel the air time. (Volt Royale already did this.) */
{ const P = View3D.prototype, pc = P.placeCamera;
  P.placeCamera = function (vp, dt) {
    const c = pc.call(this, vp, dt), m = this.m, ch = vp.chair; if (!c || !ch || vp.mode !== 'first' || !m || m.kind === 'br') return c;
    const cart = (this.carts || []).find(x => x.ch === ch); if (!cart) return c; const lift = cart.group.position.y || 0, tilt = cart.group.rotation.z || 0;
    if (Math.abs(lift) > 0.002 || Math.abs(tilt) > 0.002) { c.position.y += lift; c.rotateX(0); const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt * 0.8); c.quaternion.multiply(q); }
    return c;
  };
}

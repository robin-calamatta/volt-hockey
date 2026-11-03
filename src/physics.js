/* Small 2D collision helpers. Objects are {x, y, vx, vy}. */
const Physics = {
  // Circle vs circle with masses. Pass mb = Infinity for an immovable/kinematic body.
  // Returns the closing speed (0 if no collision).
  circles(a, ra, ma, b, rb, mb, bounce) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), reach = ra + rb;
    if (d >= reach || d === 0) return 0;
    const nx = dx / d, ny = dy / d, ia = 1 / ma, ib = mb === Infinity ? 0 : 1 / mb, total = ia + ib, depth = reach - d;
    a.x -= nx * depth * ia / total; a.y -= ny * depth * ia / total;
    if (ib) { b.x += nx * depth * ib / total; b.y += ny * depth * ib / total; }
    const closing = (a.vx - (b.vx || 0)) * nx + (a.vy - (b.vy || 0)) * ny;
    if (closing <= 0) return 0;
    const j = (1 + bounce) * closing / total;
    a.vx -= j * ia * nx; a.vy -= j * ia * ny;
    if (ib) { b.vx += j * ib * nx; b.vy += j * ib * ny; }
    return closing;
  },
  // Do the movement a->b and the wall c->d cross? Used to stop fast or shoved balls tunnelling through net walls.
  segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
    const side = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
    return side(cx, cy, dx, dy, ax, ay) * side(cx, cy, dx, dy, bx, by) < 0 && side(ax, ay, bx, by, cx, cy) * side(ax, ay, bx, by, dx, dy) < 0;
  },
  // Circle against a fixed line segment (nets).
  circleVsSegment(o, r, x1, y1, x2, y2, bounce) {
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((o.x - x1) * dx + (o.y - y1) * dy) / (dx * dx + dy * dy)));
    const px = x1 + t * dx, py = y1 + t * dy, ex = o.x - px, ey = o.y - py, d = Math.hypot(ex, ey);
    if (d >= r || d === 0) return;
    const nx = ex / d, ny = ey / d, vn = o.vx * nx + o.vy * ny;
    o.x = px + nx * r; o.y = py + ny * r;
    if (vn < 0) { o.vx -= (1 + bounce) * vn * nx; o.vy -= (1 + bounce) * vn * ny; }
  }
};
const normalizeAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* What you see is what you steer: with the rink turned upright (the default), pushing the stick up means "towards the far end of the court", which is +x on the court.
   Sticks are read in screen directions; the simulation works in court directions. This converts one to the other (see also Settings.vertical). */
let viewFlip = false, viewInv = null;              // viewFlip: true after half time (view turned round). viewInv: with a tilted camera, a function (x, y) -> the matrix that turns a push on the screen into a direction on the court at that spot
const screenToCourt = (ax, ay, x, y, p) => {
  if (p && p.steer) return p.steer;                 // the 3D view worked this player's command out already (cart-relative in first / third person, see GameScene.steer3d)
  if (viewInv) { const M = viewInv(x, y); if (M) { const m = Math.hypot(ax, ay), cx = M[0] * ax + M[1] * ay, cy = M[2] * ax + M[3] * ay, k = m ? m / (Math.hypot(cx, cy) || 1) : 0; return { x: cx * k, y: cy * k }; } }      // push the stick where you want to go ON THE SCREEN
  const v = typeof Settings !== 'undefined' && Settings.vertical === false ? { x: ax, y: ay } : { x: -ay, y: ax }; return viewFlip ? { x: -v.x, y: -v.y } : v; };

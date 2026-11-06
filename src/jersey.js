/* v13.5: jerseys in Volt Hockey (matches and seasons): every shirt carries its team's logo on the chest and a number on the back,
   and national teams wear their flag. (The torso is a capsule: around it, u = 0.25 is the chest and 0.75 the back.) */
const Jersey = {
  cache: new Map(),
  img(sc, id) { const k = 'logo-' + id; return sc && sc.textures && sc.textures.exists(k) ? sc.textures.get(k).getSourceImage() : null; },
  mat(sc, team, num) {
    const T = TEAMS[team], key = T.id + ':' + num; if (this.cache.has(key)) return this.cache.get(key);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const c = cv.getContext('2d'), col = '#' + T.color.toString(16).padStart(6, '0'), img = this.img(sc, T.id), nat = T.league === 'national';
    c.fillStyle = col; c.fillRect(0, 0, 512, 256);
    if (nat && img) { for (const x0 of [0, 256]) c.drawImage(img, 46, 64, 164, 128, x0, 0, 256, 256); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 196, 512, 60); }   // the flag all over (the middle of the round flag badge)
    else { c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(0, 176, 512, 14); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 190, 512, 8); }   // a hockey stripe across the hem
    if (img) { c.save(); c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(128, 98, 48, 0, 7); c.fill(); c.drawImage(img, 128 - 46, 98 - 46, 92, 92); c.restore(); }   // the crest on the chest
    c.font = '900 96px "Barlow Condensed", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeStyle = 'rgba(5,7,15,0.85)'; c.strokeText(String(num), 384, 104); c.fillStyle = '#ffffff'; c.fillText(String(num), 384, 104);   // the number on the back
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }); m.userData.plain = new THREE.MeshStandardMaterial({ color: nat ? this.sleeve(c) : T.color, roughness: 0.6 });   // (the sleeves stay one colour)
    this.cache.set(key, m); return m;
  },
  sleeve(c) { const d = c.getImageData(10, 10, 1, 1).data; return (d[0] << 16) | (d[1] << 8) | d[2]; }
};
{ const P = View3D.prototype, upd = P.update;
  P.update = function (dt) {
    const r = upd.call(this, dt); if (!this.m || this.m.mini || !this.m.teams) return r;
    for (const c of this.carts || []) { const team = this.m.teams[c.ch.side], num = [7, 19, 33, 9, 44, 21][(c.ch.index || 0) % 6], key = (c.cosKey || '') + '|' + team + ':' + num;
      if (c.jerseyKey === key) continue; c.jerseyKey = key;
      let J = c.group.getObjectByName('jersey');                         // the jersey: a shell just over the torso, with its own texture coordinates
      if (!J) { const tx = typeof Rig !== 'undefined' ? Rig.K().tx : 0; J = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.22, 4, 16).scale(0.85 * 1.07, 1.02, 1.2 * 1.07).translate(tx, 0.79, 0), Jersey.mat(this.sc, team, num)); J.name = 'jersey'; J.castShadow = true; J.layers.set(c.layer); c.group.add(J); }
      J.material = Jersey.mat(this.sc, team, num);
      const shirt = c.group.children.find(o => o.isMesh && o.userData.part === 'selfTeam'); if (shirt) { const base = Jersey.mat(this.sc, team, num).userData.plain; if (shirt.material !== base) shirt.material = base; } }
    return r;
  };
}

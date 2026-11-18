// city.js — procedural Solmar Bay: street grid, buildings with lit windows,
// props, ground, sky and sun. All geometry built from primitives, no assets.
import * as THREE from 'three';

export const ROAD_X = [-104, -52, 0, 52, 104];
export const CITY = 130; // half-extent of playable area

// Deterministic pseudo-random so the city looks the same every load.
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCity(scene, G) {
  const rand = mulberry(20261117);
  G.colliders = []; // {minX,maxX,minZ,maxZ}
  G.buildings = [];

  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(0x9fc8e8, 180, 520);

  const sun = new THREE.DirectionalLight(0xfff2cc, 2.4);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd9ff, 0.9));
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a5f3a, 0.7);
  scene.add(hemi);

  // Ground: big grass/sand base, then dark asphalt road strips.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x5d8a4a })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
  scene.add(ground);

  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  const sideMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 });
  for (const x of ROAD_X) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(12, 560), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0, 0); scene.add(r);
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 560), sideMat);
    s1.rotation.x = -Math.PI / 2; s1.position.set(x - 7.5, 0.01, 0); scene.add(s1);
    const s2 = s1.clone(); s2.position.x = x + 7.5; scene.add(s2);
  }
  for (const z of ROAD_X) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(560, 12), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(0, 0.005, z); scene.add(r);
  }
  // Centre dashes (one InstancedMesh for all of them).
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  const dashGeo = new THREE.BoxGeometry(0.5, 0.05, 3);
  const dashXforms = [];
  for (const x of ROAD_X) for (let z = -260; z < 260; z += 10) dashXforms.push({ x, z, rot: 0 });
  for (const z of ROAD_X) for (let x = -260; x < 260; x += 10) dashXforms.push({ x, z, rot: Math.PI / 2 });
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashXforms.length);
  {
    const d = new THREE.Object3D();
    dashXforms.forEach((t, i) => { d.position.set(t.x, 0.02, t.z); d.rotation.set(0, t.rot, 0); d.updateMatrix(); dashes.setMatrixAt(i, d.matrix); });
  }
  scene.add(dashes);

  // Beach + sea on the south edge (Solmar Bay is a coastal city).
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(560, 40), new THREE.MeshLambertMaterial({ color: 0xe8d49a }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, 155); scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(560, 120), new THREE.MeshLambertMaterial({ color: 0x2a7fc2 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.2, 235); scene.add(sea);

  // Buildings: fill the blocks between roads.
  const palette = [0xc9a06a, 0x9fb4c7, 0xd8b48a, 0x8a9ba8, 0xe0cfa8, 0xb08a7a, 0x7fa08a, 0xc7b299];
  const winLit = [], winDark = [];
  const winGeo = new THREE.PlaneGeometry(1.6, 2.0);
  for (let bx = 0; bx < 4; bx++) for (let bz = 0; bz < 4; bz++) {
    const cx = ROAD_X[bx] + 26, cz = ROAD_X[bz] + 26;
    if (cz > 120) continue; // beach blocks stay open
    const n = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const w = 10 + rand() * 10, d = 10 + rand() * 10;
      const h = 8 + rand() * rand() * 42;
      const x = cx - 12 + rand() * 24, z = cz - 12 + rand() * 24;
      const mat = new THREE.MeshLambertMaterial({ color: palette[Math.floor(rand() * palette.length)] });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(x, h / 2, z);
      scene.add(b);
      G.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      G.buildings.push(b);
      // Lit windows on the two street-facing sides (collected, instanced later).
      const rows = Math.max(1, Math.floor(h / 4)), cols = Math.max(1, Math.floor(w / 3.4));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (rand() < 0.45) continue;
        const list = rand() < 0.55 ? winLit : winDark;
        list.push({ x: x - w / 2 + 1.8 + c * 3.4, y: 3 + r * 4, z: z + d / 2 + 0.06, rot: 0 });
        list.push({ x: x - w / 2 + 1.8 + c * 3.4, y: 3 + r * 4, z: z - d / 2 - 0.06, rot: Math.PI });
      }
      // Rooftop box for taller towers.
      if (h > 30) {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 3, d * 0.3), new THREE.MeshLambertMaterial({ color: 0x666666 }));
        roof.position.set(x, h + 1.5, z); scene.add(roof);
      }
    }
  }

  // One draw call per window shade instead of one mesh per window.
  const dummy = new THREE.Object3D();
  function instanceWindows(list, color) {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ color }), list.length);
    list.forEach((t, i) => { dummy.position.set(t.x, t.y, t.z); dummy.rotation.set(0, t.rot, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    scene.add(im);
  }
  instanceWindows(winLit, 0xffe9a8);
  instanceWindows(winDark, 0x2c3e50);

  // Landmark: Meridian Bank tower downtown (mission 4 target).
  const bank = new THREE.Mesh(
    new THREE.BoxGeometry(24, 58, 24),
    new THREE.MeshLambertMaterial({ color: 0xe8e2d0 })
  );
  bank.position.set(26, 29, -26); scene.add(bank);
  G.colliders.push({ minX: 14, maxX: 38, minZ: -38, maxZ: -14 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 1), new THREE.MeshBasicMaterial({ color: 0x1a5276 }));
  sign.position.set(26, 56, -13.4); scene.add(sign);

  // Props: street lamps, palm trees, benches, hydrants.
  const lampPole = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e44 });
  for (const x of ROAD_X) for (const z of ROAD_X) {
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 7, 6), lampPole);
    pole.position.y = 3.5; lamp.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampGlow);
    bulb.position.y = 7.1; lamp.add(bulb);
    lamp.position.set(x + 8.5, 0, z + 8.5); scene.add(lamp);
  }
  for (let i = 0; i < 46; i++) {
    const px = -120 + rand() * 240, pz = -120 + rand() * 110;
    if (ROAD_X.some((r) => Math.abs(px - r) < 7) || ROAD_X.some((r) => Math.abs(pz - r) < 7)) continue;
    if (G.colliders.some((c) => px > c.minX - 2 && px < c.maxX + 2 && pz > c.minZ - 2 && pz < c.maxZ + 2)) continue;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 4, 6), trunkMat);
    trunk.position.y = 2; tree.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), leafMat);
    crown.position.y = 5; tree.add(crown);
    tree.position.set(px, 0, pz); scene.add(tree);
  }
  // Park in the north-west block: benches + fountain.
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 1, 16), new THREE.MeshLambertMaterial({ color: 0x8fa3b8 }));
  fountain.position.set(-78, 0.5, -78); scene.add(fountain);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.4, 16), new THREE.MeshLambertMaterial({ color: 0x4aa3df }));
  water.position.set(-78, 1.1, -78); scene.add(water);

  // Clouds: a few white blobs drifting slowly.
  G.clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i++) {
    const cl = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(6 + rand() * 6, 8, 6), cloudMat);
      s.position.set(j * 8 - 8, rand() * 2, rand() * 4); s.scale.y = 0.45; cl.add(s);
    }
    cl.position.set(-220 + rand() * 440, 70 + rand() * 30, -220 + rand() * 440);
    scene.add(cl); G.clouds.push(cl);
  }
}

export function updateCity(G, dt) {
  for (const c of G.clouds) { c.position.x += dt * 1.5; if (c.position.x > 260) c.position.x = -260; }
}

// Circle vs building AABBs: push the circle out. Returns true on hit.
export function collideCircle(G, x, z, r) {
  let hit = false;
  for (const c of G.colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx, dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (r - d) / d;
        return { hit: true, px: x + dx * push, pz: z + dz * push };
      }
      return { hit: true, px: x + r, pz: z };
    }
  }
  return { hit: false, px: x, pz: z };
}
export function clampCity(x, z) {
  return { x: Math.max(-CITY, Math.min(CITY, x)), z: Math.max(-CITY, Math.min(CITY, z)) };
}

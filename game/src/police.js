// police.js — wanted stars (0–5), police cars and officers who chase,
// ram and arrest. Wanted rises on crimes, decays when the player hides.
import * as THREE from 'three';
import { makeCarMesh } from './vehicles.js';
import { sfx } from './audio.js';

export function addWanted(G, n, reason) {
  const before = G.wanted;
  G.wanted = Math.max(0, Math.min(5, G.wanted + n));
  G.wantedTimer = 0;
  if (G.wanted > before && G.wanted >= 1) G.showMsg(`⚠️ Wanted level ${G.wanted} — ${reason || 'the police are on you!'}`);
  if (G.wanted > before) sfx('siren');
}

export function spawnPolice(scene, G) {
  G.police = [];
  G.cops = [];
}

function spawnPoliceCar(scene, G) {
  const p = G.player;
  const ang = Math.random() * Math.PI * 2;
  const x = Math.max(-120, Math.min(120, p.x + Math.cos(ang) * 45));
  const z = Math.max(-120, Math.min(120, p.z + Math.sin(ang) * 45));
  const mesh = makeCarMesh(0xf4f6f7, true);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const car = { mesh, name: 'SBPD Cruiser', color: 0xf4f6f7, speed: 0, steer: 0, heading: 0, x, z, parked: false, traffic: false, police: true };
  G.cars.push(car); G.police.push(car);
  return car;
}

function spawnCop(scene, G) {
  const p = G.player;
  const ang = Math.random() * Math.PI * 2;
  const g = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1a2a6b });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.4), navy);
  body.position.y = 1.25; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skin);
  head.position.y = 1.9; g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.44), new THREE.MeshLambertMaterial({ color: 0x0d1440 }));
  cap.position.y = 2.14; g.add(cap);
  const x = p.x + Math.cos(ang) * 18, z = p.z + Math.sin(ang) * 18;
  g.position.set(x, 0, z);
  scene.add(g);
  const cop = { mesh: g, x, z, speed: 6.5, health: 40 };
  G.cops.push(cop);
  return cop;
}

export function updatePolice(G, dt, scene) {
  // Wanted decay: hidden (no cop within 30) and out of a car chase.
  if (G.wanted > 0) {
    G.wantedTimer += dt;
    const nearCop = G.police.some((c) => Math.hypot(c.x - G.player.x, c.z - G.player.z) < 32)
      || G.cops.some((c) => Math.hypot(c.x - G.player.x, c.z - G.player.z) < 25);
    if (!nearCop && G.wantedTimer > 14) { G.wanted--; G.wantedTimer = 0; G.showMsg('The heat is cooling off… wanted level ' + G.wanted); }
  }
  const wantCars = G.wanted >= 3 ? 3 : G.wanted >= 1 ? 2 : 0;
  while (G.police.length < wantCars) spawnPoliceCar(scene, G);
  while (G.police.length > wantCars) {
    const c = G.police.pop();
    scene.remove(c.mesh);
    const i = G.cars.indexOf(c); if (i >= 0) G.cars.splice(i, 1);
  }
  const wantCops = G.wanted >= 2 ? 2 : G.wanted >= 1 ? 1 : 0;
  while (G.cops.length < wantCops) spawnCop(scene, G);
  while (G.cops.length > wantCops) { const c = G.cops.pop(); scene.remove(c.mesh); }

  const p = G.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const pz = p.inCar && p.car ? p.car.z : p.z;
  const pspeed = p.inCar && p.car ? Math.abs(p.car.speed) : 0;

  for (const car of G.police) {
    const dx = px - car.x, dz = pz - car.z;
    const dist = Math.hypot(dx, dz);
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
    const wantSpeed = dist > 8 ? 24 : 6;
    car.speed += (wantSpeed - car.speed) * Math.min(1, dt * 1.2);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    // Flashing light bar.
    const t = performance.now() / 300;
    if (car.mesh.userData.lightRed) {
      car.mesh.userData.lightRed.material.color.setHex(Math.sin(t) > 0 ? 0xff2020 : 0x550000);
      car.mesh.userData.lightBlue.material.color.setHex(Math.sin(t) > 0 ? 0x000055 : 0x2040ff);
    }
    // Ram the player's car.
    if (dist < 3.4 && pspeed < 18) {
      if (p.inCar && p.car) {
        p.car.speed *= 0.92;
        if (Math.random() < dt * 0.5) { G.player.health = Math.max(1, G.player.health - 1); sfx('crash'); }
      }
    }
    // Bust: player on foot, cop car close and slow.
    if (!p.inCar && dist < 3 && Math.abs(car.speed) < 4) G.busted(G, 'A cruiser boxed you in.');
  }
  for (const cop of G.cops) {
    const dx = px - cop.x, dz = pz - cop.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.5) { cop.x += (dx / dist) * cop.speed * dt; cop.z += (dz / dist) * cop.speed * dt; }
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.y = Math.atan2(dx, dz);
    if (dist < 1.6) {
      if (p.inCar) { /* cops can't grab a moving car */ }
      else if (Math.abs(p.vy || 0) < 0.1) {
        G.busted(G, 'An officer tackled you to the pavement.');
      }
    }
    // Cop shoots at wanted 4+ when the player is far.
    if (G.wanted >= 4 && dist > 12 && dist < 45 && Math.random() < dt * 0.4) {
      G.player.health -= 3; sfx('shot'); G.hudFlash();
      if (G.player.health <= 0) G.gameOver(G, 'Shot down by the SBPD.');
    }
  }
}

// combat.js — punch + pistol, enemies with health, hit feedback.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { addWanted } from './police.js';

export function spawnEnemies(G, x, z, n) {
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    const red = new THREE.MeshLambertMaterial({ color: 0x8e2f2f });
    const skin = new THREE.MeshLambertMaterial({ color: 0xc98d5f });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), red);
    body.position.y = 1.25; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
    head.position.y = 1.95; g.add(head);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    cap.position.y = 2.18; g.add(cap);
    const ex = x + (Math.random() - 0.5) * 10, ez = z + (Math.random() - 0.5) * 10;
    g.position.set(ex, 0, ez);
    G.scene.add(g);
    G.enemies.push({ mesh: g, x: ex, z: ez, health: 60, speed: 4.2, attackCd: 0, name: 'Harbor Boy' });
  }
  G.showMsg(`⚔️ ${n} enemies — take them down!`);
}

export function updateEnemies(G, dt) {
  const p = G.player;
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    const dx = p.x - e.x, dz = p.z - e.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1.2) {
      const sp = e.speed * dt;
      e.x += (dx / dist) * sp; e.z += (dz / dist) * sp;
    }
    e.attackCd -= dt;
    if (dist < 1.6 && e.attackCd <= 0) {
      e.attackCd = 1.1;
      p.health -= 8; sfx('hurt'); G.hudFlash();
      G.showMsg('You took a hit! Health ' + Math.max(0, Math.round(p.health)));
      if (p.health <= 0) G.gameOver(G, 'Beaten down by the Harbor Boys.');
    }
    e.mesh.position.set(e.x, 0, e.z);
    e.mesh.rotation.y = Math.atan2(dx, dz);
  }
}

// Melee punch: hits enemies / peds in front within 2m.
export function doPunch(G) {
  const p = G.player;
  if (p.inCar) return;
  sfx('punch');
  p.punchAnim = 0.25;
  const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
  let hitAny = false;
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    const dx = e.x - p.x, dz = e.z - p.z;
    const d = Math.hypot(dx, dz);
    const dot = d > 0 ? (dx * fx + dz * fz) / d : 1;
    if (d < 2.2 && dot > 0.3) { damageEnemy(G, i, 25); hitAny = true; }
  }
  for (const ped of G.peds) {
    const dx = ped.x - p.x, dz = ped.z - p.z;
    if (Math.hypot(dx, dz) < 2) { ped.x += dx * 2; ped.z += dz * 2; addWanted(G, 1, 'assaulting a pedestrian!'); hitAny = true; }
  }
  if (!hitAny) G.showMsg('You swing at the air.');
}

function damageEnemy(G, i, dmg) {
  const e = G.enemies[i];
  e.health -= dmg;
  // Knockback flash.
  e.mesh.scale.set(1.15, 0.9, 1.15);
  setTimeout(() => e.mesh.scale.set(1, 1, 1), 120);
  if (e.health <= 0) {
    G.scene.remove(e.mesh);
    G.enemies.splice(i, 1);
    G.player.money += 50;
    G.showMsg('Enemy down! +$50');
    sfx('cash');
  }
}

// Pistol shot: raycast from camera through screen centre.
export function doShoot(G) {
  const p = G.player;
  if (p.weapon !== 'pistol' || p.ammo <= 0) { if (p.weapon === 'pistol') G.showMsg('Out of ammo — press 1 for fists'); return; }
  p.ammo--;
  sfx('shot');
  p.muzzle = 0.08;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), G.camera);
  ray.far = 80;
  // Test enemies, cops and peds as sphere targets.
  const targets = [];
  G.enemies.forEach((e, i) => targets.push({ obj: e, kind: 'enemy', i, x: e.x, y: 1.3, z: e.z, r: 1.1 }));
  G.cops.forEach((c, i) => targets.push({ obj: c, kind: 'cop', i, x: c.x, y: 1.3, z: c.z, r: 1.1 }));
  let best = null, bestD = 80;
  const origin = G.camera.position;
  const dir = new THREE.Vector3();
  ray.ray.direction.clone ? dir.copy(ray.ray.direction) : null;
  for (const t of targets) {
    const to = new THREE.Vector3(t.x - origin.x, t.y - origin.y, t.z - origin.z);
    const along = to.dot(dir);
    if (along < 0 || along > bestD) continue;
    const closest = new THREE.Vector3().copy(dir).multiplyScalar(along).add(origin);
    const d = Math.hypot(t.x - closest.x, t.y - closest.y, t.z - closest.z);
    if (d < t.r) { best = t; bestD = along; }
  }
  if (best) {
    if (best.kind === 'enemy') damageEnemy(G, best.i, 34);
    else if (best.kind === 'cop') {
      best.obj.health -= 34;
      addWanted(G, 1, 'shooting at the police!');
      if (best.obj.health <= 0) {
        G.scene.remove(best.obj.mesh);
        G.cops.splice(best.i, 1);
        G.showMsg('Officer down! The SBPD will remember this.');
      }
    }
  }
  // Tracer line for feedback.
  if (G.tracer) {
    const end = new THREE.Vector3().copy(dir).multiplyScalar(best ? bestD : 60).add(origin);
    const geo = new THREE.BufferGeometry().setFromPoints([origin.clone(), end]);
    G.tracer.geometry.dispose();
    G.tracer.geometry = geo;
    G.tracer.visible = true;
    setTimeout(() => { G.tracer.visible = false; }, 70);
  }
}

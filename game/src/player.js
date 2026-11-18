// player.js — third-person on-foot controller: WASD relative to camera,
// run, jump, building collision, simple procedural walk animation.
import * as THREE from 'three';
import { collideCircle, clampCity } from './city.js';

export function makePlayerMesh() {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x2e86c1 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const hair = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), shirt);
  torso.position.y = 1.25; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.95; g.add(head);
  const hairM = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.46), hair);
  hairM.position.y = 2.18; g.add(hairM);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.3), pants);
  legL.position.set(-0.18, 0.4, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.18; g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.24), shirt);
  armL.position.set(-0.48, 1.25, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.48; g.add(armR);
  g.userData = { legL, legR, armL, armR };
  return g;
}

export function updatePlayer(G, input, dt) {
  const p = G.player;
  if (p.inCar) return;
  const speed = input.run ? 9 : 5;
  // Movement relative to camera yaw.
  const fwd = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
  const str = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const cy = G.camYaw;
  const mx = Math.sin(cy) * fwd + Math.cos(cy) * str;
  const mz = Math.cos(cy) * fwd - Math.sin(cy) * str;
  const len = Math.hypot(mx, mz);
  p.moving = len > 0.01;
  if (p.moving) {
    const nx = p.x + (mx / len) * speed * dt;
    const nz = p.z + (mz / len) * speed * dt;
    const hit = collideCircle(G, nx, nz, 0.6);
    const cl = clampCity(hit.px, hit.pz);
    p.x = cl.x; p.z = cl.z;
    p.heading = Math.atan2(mx, mz);
  }
  // Jump.
  if (input.jump && p.y <= 0.01) p.vy = 7;
  p.vy -= 22 * dt; p.y += p.vy * dt;
  if (p.y < 0) { p.y = 0; p.vy = 0; }
  // Walk swing.
  p.walkPhase += dt * (p.moving ? (input.run ? 13 : 9) : 0);
  const sw = p.moving ? Math.sin(p.walkPhase) * 0.55 : 0;
  const u = p.mesh.userData;
  u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
  u.armL.rotation.x = -sw * 0.8; u.armR.rotation.x = sw * 0.8;
  p.mesh.position.set(p.x, p.y, p.z);
  p.mesh.rotation.y = p.heading;
}

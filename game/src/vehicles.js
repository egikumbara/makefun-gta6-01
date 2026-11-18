// vehicles.js — car meshes (built from boxes) + arcade car physics + enter/exit.
import * as THREE from 'three';
import { collideCircle, clampCity, ROAD_X } from './city.js';
import { sfx } from './audio.js';

export const CAR_COLORS = [0xd43d2a, 0x2a6fd4, 0xf2c230, 0x37a34a, 0x8e44ad, 0xe67e22, 0xdddddd, 0x222831, 0x16a085];
export const CAR_NAMES = ['Vortex GT', 'Bayliner', 'Sunset Cab', 'Tide Runner', 'Coral Coupe', 'Palm Cruiser', 'Harbor Van', 'Nightshade', 'Dune Buggy'];

let seed = 7;
function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

export function makeCarMesh(color, isPolice) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.55; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glass);
  cabin.position.set(0, 1.1, -0.2); g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 2.0), paint);
  roof.position.set(0, 1.4, -0.2); g.add(roof);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.36, wz); g.add(w);
  }
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const sx of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.06), hl);
    h.position.set(sx, 0.6, 2.21); g.add(h);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    bar.position.set(0, 1.5, -0.2); g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    red.position.set(-0.32, 1.5, -0.2); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    blue.position.set(0.32, 1.5, -0.2); g.add(blue);
    g.userData.lightRed = red; g.userData.lightBlue = blue;
  }
  return g;
}

export function spawnParkedCars(scene, G) {
  G.cars = [];
  const spots = [];
  for (const x of ROAD_X) for (const z of ROAD_X) {
    spots.push([x + 4.2, z + 14, 0], [x - 4.2, z - 14, Math.PI]);
  }
  for (let i = 0; i < 14; i++) {
    const s = spots[Math.floor(rnd() * spots.length)];
    const idx = Math.floor(rnd() * CAR_COLORS.length);
    const mesh = makeCarMesh(CAR_COLORS[idx], false);
    mesh.position.set(s[0], 0, s[1]); mesh.rotation.y = s[2] + (rnd() - 0.5) * 0.1;
    scene.add(mesh);
    G.cars.push({ mesh, name: CAR_NAMES[idx], color: CAR_COLORS[idx], speed: 0, steer: 0, heading: s[2], x: s[0], z: s[1], parked: true, traffic: false, police: false, driver: null });
  }
  return G.cars;
}

// Arcade car update: throttle/brake/steer, building collision, car-car nudge.
export function updateCar(G, car, input, dt) {
  const maxSpeed = car.police ? 26 : 22;
  const accel = 13, brake = 26, drag = 0.985;
  if (input.forward) car.speed += accel * dt;
  if (input.back) car.speed -= (car.speed > 0.5 ? brake : accel * 0.6) * dt;
  if (!input.forward && !input.back) car.speed *= Math.pow(drag, dt * 60);
  car.speed = Math.max(-8, Math.min(maxSpeed, car.speed));
  if (Math.abs(car.speed) < 0.05 && !input.forward && !input.back) car.speed = 0;
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += car.steer * 1.9 * dt * Math.min(1, Math.abs(car.speed) / 6) * dir;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const hit = collideCircle(G, nx, nz, 2.0);
  if (hit.hit) {
    if (Math.abs(car.speed) > 6) { sfx('crash'); G.player.health = Math.max(1, G.player.health - 2); }
    car.speed *= -0.25; car.x = hit.px; car.z = hit.pz;
  } else {
    const cl = clampCity(nx, nz);
    car.x = cl.x; car.z = cl.z;
  }
  // Gentle nudge against other cars.
  for (const o of G.cars) {
    if (o === car) continue;
    const dx = car.x - o.x, dz = car.z - o.z, d2 = dx * dx + dz * dz;
    if (d2 < 9 && d2 > 0.01) { const d = Math.sqrt(d2); car.x += (dx / d) * (3 - d) * 0.5; car.z += (dz / d) * (3 - d) * 0.5; }
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  return car.speed;
}

export function nearestCar(G, x, z, maxDist) {
  let best = null, bd = maxDist;
  for (const c of G.cars) {
    if (c.traffic && c.speed > 1) continue;
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

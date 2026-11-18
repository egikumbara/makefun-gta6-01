// traffic.js — traffic cars cruising the street grid + pedestrians on sidewalks.
import * as THREE from 'three';
import { makeCarMesh, CAR_COLORS } from './vehicles.js';
import { ROAD_X } from './city.js';

let seed = 99;
function rnd() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }

const PED_SHIRTS = [0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xecf0f1, 0x34495e, 0xfd79a8];

export function spawnTraffic(scene, G) {
  G.traffic = [];
  for (let i = 0; i < 10; i++) {
    const vertical = rnd() < 0.5;
    const road = ROAD_X[Math.floor(rnd() * ROAD_X.length)];
    const lane = (rnd() < 0.5 ? -2.8 : 2.8);
    const along = -120 + rnd() * 240;
    const x = vertical ? road + lane : along;
    const z = vertical ? along : road + lane;
    const heading = vertical ? (lane < 0 ? 0 : Math.PI) : (lane < 0 ? Math.PI / 2 : -Math.PI / 2);
    const color = CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)];
    const mesh = makeCarMesh(color, false);
    mesh.position.set(x, 0, z); mesh.rotation.y = heading;
    scene.add(mesh);
    const car = { mesh, name: 'Traffic', color, speed: 7 + rnd() * 4, steer: 0, heading, x, z, parked: false, traffic: true, police: false, vertical, lane, cruise: 7 + rnd() * 4 };
    G.cars.push(car); G.traffic.push(car);
  }
  // Pedestrians.
  G.peds = [];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: PED_SHIRTS[i % PED_SHIRTS.length] });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.35), shirt);
    body.position.y = 1.15; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skin);
    head.position.y = 1.75; g.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    legL.position.set(-0.14, 0.35, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.14; g.add(legR);
    const road = ROAD_X[Math.floor(rnd() * ROAD_X.length)];
    const along = -120 + rnd() * 240;
    const vertical = rnd() < 0.5;
    const x = vertical ? road + 7.5 : along;
    const z = vertical ? along : road + 7.5;
    g.position.set(x, 0, z);
    scene.add(g);
    G.peds.push({ mesh: g, legL, legR, x, z, vertical, road, dir: rnd() < 0.5 ? 1 : -1, speed: 1.2 + rnd() * 1.2, phase: rnd() * 6 });
  }
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    // Slow down if a car is close ahead.
    let target = car.cruise;
    for (const o of G.cars) {
      if (o === car) continue;
      const dx = o.x - car.x, dz = o.z - car.z;
      const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
      const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
      if (ahead > 0 && ahead < 9 && side < 3) { target = 0; break; }
    }
    // Slow near the player on foot so they don't run them over constantly.
    const pdx = G.player.x - car.x, pdz = G.player.z - car.z;
    const pahead = pdx * Math.sin(car.heading) + pdz * Math.cos(car.heading);
    const pside = Math.abs(pdx * Math.cos(car.heading) - pdz * Math.sin(car.heading));
    if (pahead > 0 && pahead < 7 && pside < 2.5 && !G.player.inCar) target = 0;
    car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    const along = car.vertical ? car.z : car.x;
    if (along > 128 || along < -128) {
      // Wrap to the other end of the same road.
      if (car.vertical) car.z = car.heading === 0 ? -128 : 128;
      else car.x = car.heading === Math.PI / 2 ? -128 : 128;
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }
  for (const ped of G.peds) {
    const step = ped.speed * ped.dir * dt;
    if (ped.vertical) ped.z += step; else ped.x += step;
    const along = ped.vertical ? ped.z : ped.x;
    if (along > 125 || along < -125) ped.dir *= -1;
    ped.phase += dt * 8;
    const sw = Math.sin(ped.phase) * 0.5;
    ped.legL.rotation.x = sw; ped.legR.rotation.x = -sw;
    ped.mesh.position.set(ped.x, 0, ped.z);
    ped.mesh.rotation.y = ped.vertical ? (ped.dir > 0 ? 0 : Math.PI) : (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
}

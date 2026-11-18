// shots.js — scripted autopilot for screenshots. Reads ?shot=chase|onfoot|driving|mission
// and stages the scene, then sets window.__shotReady when the frame is composed.
// Never edits or composites anything: these are live renders of the game itself.
import { startMission } from './missions.js';
import { addWanted } from './police.js';
import { spawnEnemies } from './combat.js';

export function shotParam() {
  const q = new URLSearchParams(location.search);
  return q.get('shot');
}

export function stageShot(G, shot) {
  if (!shot) return;
  const p = G.player;
  G.state = 'playing';
  document.getElementById('start').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  if (shot === 'chase') {
    // Cover: wanted 3, police chasing, player driving fast down the avenue.
    // Camera yaw pre-set to the car's heading so there is no swing on load.
    const car = G.cars.find((c) => !c.traffic && !c.police);
    p.x = 0; p.z = -60; p.inCar = true; p.car = car;
    car.x = 0; car.z = -60; car.heading = 0; car.speed = 16; car.parked = false;
    car.mesh.position.set(0, 0, -60);
    G.camYaw = 0; G.camPitch = 0.3;
    addWanted(G, 3, 'staged chase');
    G.showObjective('Bayview Getaway: lose the SBPD and reach the Coral Hotel');
    G.markerTarget = { x: -52, z: 52 };
    // Once the police cruisers have spawned, line them up ahead on the same
    // road so the chase reads in the frame.
    setTimeout(() => {
      G.police.forEach((pc, i) => {
        pc.x = (i % 2 === 0 ? -2.5 : 2.5); pc.z = -60 + 26 + i * 7;
        pc.heading = Math.PI; pc.speed = 14;
      });
    }, 900);
  } else if (shot === 'onfoot') {
    p.x = -20; p.z = 10; p.heading = Math.PI * 0.75; p.inCar = false; p.car = null;
    G.camYaw = Math.PI * 0.9; G.camPitch = 0.3;
    G.showObjective('Explore Solmar Bay — find Milo at the yellow marker');
    G.markerTarget = { x: -52, z: -52 };
  } else if (shot === 'driving') {
    const car = G.cars[1] || G.cars[0];
    p.inCar = true; p.car = car;
    car.x = 52; car.z = 20; car.heading = 0; car.speed = 12; car.parked = false;
    car.mesh.position.set(52, 0, 20);
    G.camYaw = 0; G.camPitch = 0.3;
    G.showObjective('Cruising the Bayview Strip — press E to leave the car');
  } else if (shot === 'mission') {
    p.x = 90; p.z = 96; p.heading = Math.PI; p.weapon = 'pistol'; p.ammo = 24;
    p.inCar = false; p.car = null;
    G.camYaw = Math.PI * 1.1; G.camPitch = 0.28;
    spawnEnemies(G, 100, 100, 3);
    addWanted(G, 2, 'the docks went loud');
    startMission(G, 2);
    G.showObjective('Dockside Trouble: defeat the Harbor Boys');
    G.markerTarget = { x: 104, z: 104 };
  }
  // Let one frame render, then signal readiness.
  setTimeout(() => { window.__shotReady = true; }, 1200);
}

// missions.js — four linked story missions with dialogue, objectives,
// markers and cash rewards. All characters and places are invented.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { addWanted } from './police.js';

export const MISSIONS = [
  {
    id: 0, title: 'First Wheels', giver: 'Milo Ferrante',
    brief: 'Milo needs a car, fast. Steal any parked car and bring it to the yellow marker at the Bayview Docks.',
    steps: [
      { text: 'Steal a car (walk up to one and press E)', type: 'steal' },
      { text: 'Drive the car to the Bayview Docks marker', type: 'goto', x: 52, z: 104, r: 8 },
    ],
    reward: 400,
    dialogue: [
      ['Milo Ferrante', 'Rico! You made it. Listen — my buyer is waiting at the docks and my ride just died.'],
      ['Rico Vale', 'So you want me to… borrow one?'],
      ['Milo Ferrante', 'Borrow, lift, liberate — call it what you like. Just bring wheels to the docks.'],
    ],
  },
  {
    id: 1, title: 'Bayview Getaway', giver: 'Milo Ferrante',
    brief: 'Pick up the package at the park fountain, then lose the cops and deliver it to the Coral Hotel.',
    steps: [
      { text: 'Pick up the package at the park fountain', type: 'goto', x: -78, z: -78, r: 6 },
      { text: 'Deliver the package to the Coral Hotel (watch the heat!)', type: 'goto', x: -52, z: 52, r: 8, wanted: 2 },
    ],
    reward: 800,
    dialogue: [
      ['Milo Ferrante', 'Clean work on the car, Rico. Now the real job: a package at the park fountain.'],
      ['Rico Vale', 'What is in it?'],
      ['Milo Ferrante', 'You do not ask, you do not get arrested for knowing. The Coral Hotel. Go.'],
    ],
  },
  {
    id: 2, title: 'Dockside Trouble', giver: 'Sana Reyes',
    brief: 'Sana\'s dock crew is being shaken down by the Harbor Boys. Go to the docks, deal with them, then report back to Sana.',
    steps: [
      { text: 'Go to the docks and deal with the Harbor Boys', type: 'goto', x: 104, z: 104, r: 10, spawnEnemies: 3 },
      { text: 'Defeat all Harbor Boys', type: 'clear' },
      { text: 'Report back to Sana at the marina', type: 'goto', x: -104, z: 104, r: 7 },
    ],
    reward: 1200,
    dialogue: [
      ['Sana Reyes', 'Rico, the Harbor Boys are leaning on my dock crew for "protection" money.'],
      ['Rico Vale', 'Protection from what — themselves?'],
      ['Sana Reyes', 'Exactly. Sort them out, and the docks remember who their friends are.'],
    ],
  },
  {
    id: 3, title: 'The Big Score', giver: 'Milo Ferrante',
    brief: 'Hit the Meridian Bank vault crew, grab the cash, and escape to the beach hideout with 4 stars of heat.',
    steps: [
      { text: 'Reach the Meridian Bank downtown', type: 'goto', x: 26, z: -26, r: 10, spawnEnemies: 4 },
      { text: 'Defeat the vault guards', type: 'clear' },
      { text: 'Escape to the beach hideout with the cash', type: 'goto', x: 0, z: 140, r: 10, wanted: 4 },
    ],
    reward: 3000,
    dialogue: [
      ['Milo Ferrante', 'This is it, Rico. The Meridian Bank. In, out, gone before the SBPD knows what hit them.'],
      ['Rico Vale', 'Four stars of heat, Milo. You said three.'],
      ['Milo Ferrante', 'I said three-ish. Drive like the bay is on fire. See you at the beach.'],
    ],
  },
];

export function startMission(G, idx) {
  const m = MISSIONS[idx];
  G.mission = { def: m, step: 0, active: true };
  G.showObjective(m.title + ': ' + m.steps[0].text);
  G.sayDialogue(m.dialogue);
  sfx('mission');
  G.showMsg(`📋 Mission: ${m.title} — $${m.reward} reward`);
}

export function updateMissions(G, dt) {
  const mi = G.mission;
  if (!mi || !mi.active) return;
  const step = mi.def.steps[mi.step];
  if (!step) return;
  const p = G.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const pz = p.inCar && p.car ? p.car.z : p.z;
  if (step.type === 'steal') {
    if (p.inCar) advanceMission(G);
  } else if (step.type === 'goto') {
    G.markerTarget = { x: step.x, z: step.z };
    if (Math.hypot(px - step.x, pz - step.z) < step.r) {
      if (step.spawnEnemies) G.spawnEnemies(step.x, step.z, step.spawnEnemies);
      if (step.wanted && G.wanted < step.wanted) addWanted(G, step.wanted - G.wanted, 'the job went loud!');
      advanceMission(G);
    }
  } else if (step.type === 'clear') {
    if (G.enemies.length === 0) advanceMission(G);
  }
}

function advanceMission(G) {
  const mi = G.mission;
  mi.step++;
  sfx('pickup');
  if (mi.step >= mi.def.steps.length) {
    // Mission complete.
    G.player.money += mi.def.reward;
    G.showMsg(`✅ ${mi.def.title} complete! +$${mi.def.reward}`);
    sfx('cash');
    G.showObjective(mi.def.title + ' complete!');
    G.markerTarget = null;
    const next = mi.def.id + 1;
    mi.active = false;
    if (next < MISSIONS.length) {
      setTimeout(() => {
        if (G.state === 'playing') {
          G.showMsg(`📋 Next job: ${MISSIONS[next].title} — find ${MISSIONS[next].giver}`);
          G.markerTarget = { x: -52, z: -52 };
          G.showObjective(`Next: ${MISSIONS[next].title} — go to the yellow marker to meet ${MISSIONS[next].giver}`);
        }
      }, 2500);
      G.pendingMission = next;
    } else {
      G.showObjective('🏆 All missions complete! You own Solmar Bay, Rico.');
      G.pendingMission = null;
      setTimeout(() => G.showMsg('🏆 STORY COMPLETE — Solmar Bay is yours. Free roam!'), 1500);
    }
  } else {
    const step = mi.def.steps[mi.step];
    G.showObjective(mi.def.title + ': ' + step.text);
    if (step.type === 'goto') G.markerTarget = { x: step.x, z: step.z };
  }
}

// Mission giver marker / next-mission trigger position.
export function checkMissionStart(G) {
  if (G.mission && G.mission.active) return;
  if (G.pendingMission == null) {
    // First mission: Milo waits at the plaza.
    const d = Math.hypot(G.player.x - (-52), G.player.z - (-52));
    if (d < 5) startMission(G, 0);
    return;
  }
  const d = Math.hypot(G.player.x - (-52), G.player.z - (-52));
  if (d < 5) startMission(G, G.pendingMission);
}

// Yellow beacon marker in the world + minimap blip target.
export function makeMarker(scene) {
  const geo = new THREE.CylinderGeometry(2.5, 2.5, 12, 12, 1, true);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(-52, 6, -52);
  scene.add(mesh);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.3, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  ring.rotation.x = Math.PI / 2; ring.position.set(-52, 0.15, -52);
  scene.add(ring);
  return { mesh, ring };
}
export function updateMarker(G, dt) {
  if (!G.markerMesh) return;
  const t = G.markerTarget || { x: -52, z: -52 };
  const vis = !(G.mission && G.mission.active) || G.markerTarget != null || G.pendingMission != null || true;
  G.markerMesh.mesh.visible = vis;
  G.markerMesh.ring.visible = vis;
  G.markerMesh.mesh.position.set(t.x, 6 + Math.sin(performance.now() / 400) * 0.5, t.z);
  G.markerMesh.ring.position.set(t.x, 0.15, t.z);
  G.markerMesh.mesh.rotation.y += dt * 0.8;
}

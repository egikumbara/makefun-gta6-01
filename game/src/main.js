// main.js — Solmar Bay: glue, game loop, camera, input, screens, save/load.
// Original open-world crime game built on three.js (vendored under game/vendor).
import * as THREE from 'three';
import { buildCity, updateCity } from './city.js';
import { makePlayerMesh, updatePlayer } from './player.js';
import { spawnParkedCars, updateCar, nearestCar } from './vehicles.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { spawnPolice, updatePolice, addWanted } from './police.js';
import { startMission, updateMissions, checkMissionStart, makeMarker, updateMarker } from './missions.js';
import { spawnEnemies, updateEnemies, doPunch, doShoot } from './combat.js';
import { showMsg, showObjective, sayDialogue, updateHUD, hudFlash } from './hud.js';
import { initAudio, resumeAudio, toggleMute, sfx, engineStart, engineSet, engineStop, musicStart, musicStop } from './audio.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { shotParam, stageShot } from './shots.js';

const $ = (id) => document.getElementById(id);

// ---- shared game state ----
const G = {
  state: 'menu', // menu | playing | paused | over
  wanted: 0, wantedTimer: 0, gameTime: 0,
  camYaw: Math.PI, camPitch: 0.32,
  markerTarget: { x: -52, z: -52 },
  mission: null, pendingMission: null,
  enemies: [], peds: [], traffic: [], cars: [], police: [], cops: [],
  player: {
    x: -40, z: -40, y: 0, vy: 0, heading: Math.PI, walkPhase: 0, moving: false,
    health: 100, money: 500, weapon: 'fists', ammo: 24,
    inCar: false, car: null, punchAnim: 0, muzzle: 0,
    mesh: null,
  },
};
G.scene = null; G.camera = null;

// Helpers the modules call back through G.
G.showMsg = (t, ms) => showMsg(G, t, ms);
G.showObjective = (t) => showObjective(G, t);
G.sayDialogue = (lines) => sayDialogue(G, lines);
G.hudFlash = () => hudFlash(G);
G.spawnEnemies = (x, z, n) => spawnEnemies(G, x, z, n);
G.busted = (gg, reason) => endGame(false, reason || 'Busted by the SBPD.');
G.gameOver = (gg, reason) => endGame(false, reason || 'Wasted.');

const input = { forward: false, back: false, left: false, right: false, run: false, jump: false };

// ---- three.js setup ----
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
G.scene = scene;
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
G.camera = camera;
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

buildCity(scene, G);
G.player.mesh = makePlayerMesh();
scene.add(G.player.mesh);
spawnParkedCars(scene, G);
spawnTraffic(scene, G);
spawnPolice(scene, G);
G.markerMesh = makeMarker(scene);
// Tracer line for gunshots.
G.tracer = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
  new THREE.LineBasicMaterial({ color: 0xffe27a })
);
G.tracer.visible = false; scene.add(G.tracer);
// Mission giver Milo standing at the plaza marker.
const milo = makeMilo();
scene.add(milo);

function makeMilo() {
  const g = new THREE.Group();
  const suit = new THREE.MeshLambertMaterial({ color: 0x6c3483 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), suit);
  body.position.y = 1.25; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.95; g.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.18, 10), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  hat.position.y = 2.2; g.add(hat);
  g.position.set(-52, 0, -52);
  return g;
}

// ---- screens ----
function showScreen(id) {
  for (const s of ['start', 'pause', 'wasted']) $(s).classList.add('hidden');
  if (id) $(id).classList.remove('hidden');
  $('hud').classList.toggle('hidden', id !== null);
}
function startPlaying(fromSave) {
  initAudio(); resumeAudio(); musicStart();
  G.state = 'playing';
  showScreen(null);
  if (fromSave) {
    const d = loadGame(G);
    G.showMsg(d ? 'Save loaded — welcome back, Rico.' : 'No save found — fresh start.');
  } else {
    G.showObjective('Find Milo at the yellow marker — press E near a car to drive');
  }
}
function endGame(alive, reason) {
  if (G.state !== 'playing') return;
  G.state = 'over';
  engineStop(); musicStop();
  $('wastedText').textContent = reason + ' The bay keeps your $' + Math.floor(G.player.money / 2) + ' hospital bill.';
  G.player.money = Math.floor(G.player.money / 2);
  showScreen('wasted');
}
$('playBtn').onclick = () => startPlaying(false);
$('continueBtn').onclick = () => startPlaying(true);
$('resumeBtn').onclick = () => { G.state = 'playing'; showScreen(null); resumeAudio(); };
$('saveBtn').onclick = () => {
  const ok = saveGame(G);
  $('saveBtn').textContent = ok ? '💾 SAVED ✓' : '💾 SAVE FAILED';
  setTimeout(() => { $('saveBtn').textContent = '💾 SAVE GAME'; }, 1800);
};
$('quitBtn').onclick = () => { G.state = 'menu'; showScreen('start'); musicStop(); engineStop(); };
$('retryBtn').onclick = () => {
  G.player.health = 100; G.player.x = -40; G.player.z = -40;
  G.player.inCar = false; G.player.car = null; G.wanted = 0;
  G.enemies.forEach((e) => scene.remove(e.mesh)); G.enemies = [];
  startPlaying(false);
};
$('menuBtn').onclick = () => { G.state = 'menu'; showScreen('start'); };
if (!hasSave()) $('continueBtn').style.opacity = '0.45';

// ---- input ----
const KEYMAP = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'run', ShiftRight: 'run' };
addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) { input[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.code === 'Space') { input.jump = true; e.preventDefault(); }
  if (e.code === 'KeyE' && G.state === 'playing') tryEnterExitCar();
  if (e.code === 'KeyF' && G.state === 'playing') doPunch(G);
  if (e.code === 'Digit1' && G.state === 'playing') { G.player.weapon = 'fists'; G.showMsg('Fists ready'); }
  if (e.code === 'Digit2' && G.state === 'playing') { G.player.weapon = 'pistol'; G.showMsg('Pistol ready — click to shoot'); }
  if (e.code === 'KeyP') {
    if (G.state === 'playing') { G.state = 'paused'; showScreen('pause'); }
    else if (G.state === 'paused') { G.state = 'playing'; showScreen(null); }
  }
  if (e.code === 'KeyM') { const m = toggleMute(); G.showMsg(m ? '🔇 Sound off' : '🔊 Sound on'); }
});
addEventListener('keyup', (e) => {
  if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false;
  if (e.code === 'Space') input.jump = false;
});
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('mousedown', (e) => {
  if (G.state !== 'playing') return;
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  if (G.player.weapon === 'pistol' && !G.player.inCar) doShoot(G);
});
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => {
  if (!dragging || G.state !== 'playing') return;
  G.camYaw -= (e.clientX - lastX) * 0.005;
  G.camPitch = Math.max(0.08, Math.min(0.9, G.camPitch + (e.clientY - lastY) * 0.004));
  lastX = e.clientX; lastY = e.clientY;
});

function tryEnterExitCar() {
  const p = G.player;
  if (p.inCar) {
    // Exit: step out to the side of the car.
    const car = p.car;
    p.inCar = false; p.car = null;
    p.x = car.x + Math.cos(car.heading) * 2.2;
    p.z = car.z - Math.sin(car.heading) * 2.2;
    p.heading = car.heading;
    p.mesh.visible = true;
    car.speed = 0;
    sfx('door'); engineStop();
    G.showMsg('You left the ' + car.name);
    return;
  }
  const car = nearestCar(G, p.x, p.z, 4);
  if (!car) { G.showMsg('No car close by — walk up to one and press E'); return; }
  p.inCar = true; p.car = car; car.parked = false;
  p.mesh.visible = false;
  sfx('door'); engineStart();
  if (car.police) { addWanted(G, 2, 'stealing a police cruiser!'); }
  else if (!car.stolen) { car.stolen = true; addWanted(G, 1, 'car theft!'); }
  G.showMsg('You took the ' + car.name + ' — drive with W A S D');
}

// ---- camera ----
function updateCamera(dt) {
  const p = G.player;
  const tx = p.inCar && p.car ? p.car.x : p.x;
  const tz = p.inCar && p.car ? p.car.z : p.z;
  const ty = p.inCar ? 1.6 : 1.8 + p.y;
  // In a car, ease the camera yaw behind the car's heading.
  if (p.inCar && p.car) {
    let dh = p.car.heading - G.camYaw;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    G.camYaw += dh * Math.min(1, dt * 1.6);
  }
  const dist = p.inCar ? 11 : 8.5;
  const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw);
  const height = Math.tan(G.camPitch) * dist;
  camera.position.set(tx - fx * dist, ty + height, tz - fz * dist);
  camera.lookAt(tx + fx * 2, ty + 0.5, tz + fz * 2);
}

// ---- main loop ----
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (G.state === 'playing') {
    G.gameTime += dt * 1000;
    const p = G.player;
    if (p.inCar && p.car) {
      const sp = updateCar(G, p.car, input, dt);
      engineSet(Math.abs(sp) / 26);
      p.x = p.car.x; p.z = p.car.z; p.heading = p.car.heading;
    } else {
      updatePlayer(G, input, dt);
    }
    if (p.punchAnim > 0) p.punchAnim -= dt;
    updateTraffic(G, dt);
    updatePolice(G, dt, scene);
    updateEnemies(G, dt);
    updateMissions(G, dt);
    checkMissionStart(G);
    updateMarker(G, dt);
    updateCity(G, dt);
    updateHUD(G);
    // Health regen slowly when not wanted.
    if (G.wanted === 0 && p.health < 100) p.health = Math.min(100, p.health + dt * 1.5);
  }
  updateCamera(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

// Debug/test handle (read-only state inspection for automated play-testing).
window.__sb = G;
window.__shotReady = false;

// ---- screenshot autopilot ----
const shot = shotParam();
if (shot) {
  initAudio();
  setTimeout(() => stageShot(G, shot), 400);
}

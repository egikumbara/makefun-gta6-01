// save.js — save/load via localStorage (position, money, health, wanted,
// mission progress, clock). No network, no files.
const KEY = 'solmar-bay-save-v1';

export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      x: p.x, z: p.z, heading: p.heading,
      money: p.money, health: p.health, ammo: p.ammo, weapon: p.weapon,
      wanted: G.wanted, gameTime: G.gameTime,
      missionIdx: G.mission && G.mission.active ? G.mission.def.id : (G.pendingMission ?? -1),
      missionStep: G.mission && G.mission.active ? G.mission.step : 0,
      missionsDone: G.mission && G.mission.active ? G.mission.def.id : (G.pendingMission ?? 0),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadGame(G) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const p = G.player;
    p.x = d.x ?? 0; p.z = d.z ?? 0; p.heading = d.heading ?? 0;
    p.money = d.money ?? 500; p.health = d.health ?? 100;
    p.ammo = d.ammo ?? 24; p.weapon = d.weapon ?? 'fists';
    G.wanted = d.wanted ?? 0; G.gameTime = d.gameTime ?? 0;
    p.inCar = false; p.car = null;
    if (typeof d.missionIdx === 'number' && d.missionIdx >= 0) {
      G.pendingMission = d.missionIdx;
      G.markerTarget = { x: -52, z: -52 };
      G.showObjective(`Next: go to the yellow marker to continue the story`);
    }
    return d;
  } catch (e) { return null; }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}

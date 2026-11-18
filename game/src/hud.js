// hud.js — HUD text, wanted stars, health bar, clock, and the 2D minimap.
import { ROAD_X } from './city.js';

const $ = (id) => document.getElementById(id);
let msgTimer = null, dlgTimer = null;

export function showMsg(G, text, ms) {
  const el = $('msg');
  el.textContent = text; el.classList.remove('hidden');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => el.classList.add('hidden'), ms || 3500);
}
export function showObjective(G, text) { $('objective').innerHTML = text; }
export function sayDialogue(G, lines) {
  const el = $('dialogue');
  el.innerHTML = lines.map(([who, line]) => `<div><span class="who">${who}:</span> ${line}</div>`).join('');
  el.classList.remove('hidden');
  clearTimeout(dlgTimer);
  dlgTimer = setTimeout(() => el.classList.add('hidden'), 9000);
}

export function updateHUD(G) {
  const p = G.player;
  $('money').textContent = Math.floor(p.money);
  $('health').textContent = Math.max(0, Math.round(p.health));
  $('healthfill').style.width = Math.max(0, p.health) + '%';
  $('healthfill').style.background = p.health > 50 ? 'linear-gradient(90deg,#37d67a,#a8e063)'
    : p.health > 25 ? 'linear-gradient(90deg,#f39c12,#f5d76e)' : 'linear-gradient(90deg,#e74c3c,#ff8a7a)';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < G.wanted ? '★' : '☆';
  $('stars').textContent = stars;
  $('weapon').textContent = p.weapon === 'pistol' ? `🔫 Pistol (${p.ammo})` : '👊 Fists';
  $('crosshair').classList.toggle('hidden', !(p.weapon === 'pistol' && !p.inCar));
  const sp = $('speedo');
  if (p.inCar && p.car) {
    sp.classList.remove('hidden');
    sp.textContent = `${Math.round(Math.abs(p.car.speed) * 3.6)} km/h\n${p.car.name}`;
  } else sp.classList.add('hidden');
  // Clock: game time advances 1 min per real second, starting 12:00.
  const totalMin = 12 * 60 + Math.floor(G.gameTime / 1000);
  const hh = Math.floor(totalMin / 60) % 24, mm = totalMin % 60;
  $('clock').textContent = `${hh >= 6 && hh < 18 ? '☀️' : '🌙'} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  drawMinimap(G);
}

function drawMinimap(G) {
  const cv = $('minimap');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, S = W / 280; // world -140..140
  const px = (x) => (x + 140) * S, pz = (z) => (z + 140) * S;
  ctx.fillStyle = '#16213a'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3f6b3a'; ctx.fillRect(0, 0, W, H);
  // Sea at bottom.
  ctx.fillStyle = '#2a7fc2'; ctx.fillRect(0, pz(135), W, H - pz(135));
  // Roads.
  ctx.strokeStyle = '#555c66'; ctx.lineWidth = 12 * S * 2.2;
  for (const r of ROAD_X) {
    ctx.beginPath(); ctx.moveTo(px(r), 0); ctx.lineTo(px(r), H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pz(r)); ctx.lineTo(W, pz(r)); ctx.stroke();
  }
  // Mission marker.
  const t = G.markerTarget || { x: -52, z: -52 };
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(px(t.x), pz(t.z), 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
  // Cars.
  for (const c of G.cars) {
    ctx.fillStyle = c.police ? '#3a6bff' : c.traffic ? '#bbbbbb' : '#ffffff';
    ctx.fillRect(px(c.x) - 2, pz(c.z) - 2, 4, 4);
  }
  // Enemies red.
  ctx.fillStyle = '#ff4040';
  for (const e of G.enemies) ctx.fillRect(px(e.x) - 3, pz(e.z) - 3, 6, 6);
  // Player arrow (north = -z up on screen = +z down, so rotate accordingly).
  const p = G.player;
  const cx = px(p.inCar && p.car ? p.car.x : p.x), cz = pz(p.inCar && p.car ? p.car.z : p.z);
  const heading = p.inCar && p.car ? p.car.heading : p.heading;
  ctx.save();
  ctx.translate(cx, cz); ctx.rotate(-heading + Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function hudFlash(G) {
  document.body.style.boxShadow = 'inset 0 0 120px rgba(255,0,0,.55)';
  setTimeout(() => { document.body.style.boxShadow = 'none'; }, 180);
}

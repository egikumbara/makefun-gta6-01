// audio.js — synthesized WebAudio sounds only. No audio files, no network.
let ctx = null, master = null, muted = false, musicTimer = null, engineOsc = null, engineGain = null;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}
export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.35;
  return muted;
}
function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), ctx.currentTime + dur);
  g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
}
function noise(dur, vol, lowpass) {
  if (!ctx || muted) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
  const g = ctx.createGain(); g.gain.value = vol || 0.3;
  src.connect(f); f.connect(g); g.connect(master); src.start();
}
export function sfx(name) {
  if (!ctx) return;
  if (name === 'shot') { noise(0.14, 0.5, 2600); tone(160, 0.1, 'square', 0.25, 60); }
  else if (name === 'punch') { noise(0.08, 0.35, 700); }
  else if (name === 'pickup') { tone(660, 0.12, 'sine', 0.25); setTimeout(() => tone(990, 0.18, 'sine', 0.25), 90); }
  else if (name === 'cash') { tone(880, 0.1, 'triangle', 0.3); setTimeout(() => tone(1174, 0.14, 'triangle', 0.3), 80); setTimeout(() => tone(1568, 0.2, 'triangle', 0.3), 160); }
  else if (name === 'door') { noise(0.1, 0.25, 500); tone(180, 0.08, 'square', 0.12, 90); }
  else if (name === 'crash') { noise(0.25, 0.5, 900); tone(90, 0.25, 'sawtooth', 0.3, 40); }
  else if (name === 'hurt') { tone(220, 0.2, 'sawtooth', 0.25, 110); }
  else if (name === 'mission') { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.28), i * 110)); }
  else if (name === 'siren') { tone(700, 0.45, 'sine', 0.08, 1100); setTimeout(() => tone(1100, 0.45, 'sine', 0.08, 700), 450); }
}
export function engineStart() {
  if (!ctx || engineOsc) return;
  engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
  engineGain = ctx.createGain(); engineGain.gain.value = 0.0;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
  engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master); engineOsc.start();
}
export function engineSet(speed01) {
  if (engineOsc && engineGain) {
    engineOsc.frequency.value = 50 + speed01 * 110;
    engineGain.gain.value = muted ? 0 : 0.05 + speed01 * 0.06;
  }
}
export function engineStop() {
  if (engineOsc) { try { engineOsc.stop(); } catch (e) {} engineOsc = null; engineGain = null; }
}
// Simple lo-fi loop: bass + hats pattern via scheduled tones.
const BASS = [55, 0, 65.4, 0, 49, 0, 73.4, 0, 55, 0, 65.4, 0, 82.4, 73.4, 65.4, 49];
export function musicStart() {
  if (!ctx || musicTimer) return;
  let step = 0;
  musicTimer = setInterval(() => {
    if (muted || !ctx) return;
    const b = BASS[step % 16];
    if (b) tone(b, 0.22, 'triangle', 0.12);
    if (step % 4 === 2) noise(0.03, 0.05, 6000);
    if (step % 8 === 0) tone(220 + (step % 32), 0.3, 'sine', 0.04);
    step++;
  }, 210);
}
export function musicStop() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

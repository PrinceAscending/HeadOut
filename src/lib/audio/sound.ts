"use client";

/* ═══════════════════════════════════════════════════════════
   Sound — everything synthesized via WebAudio. No audio files.
   Off by default. AudioContext is only created after a user
   gesture (browser autoplay policy respected).
   ═══════════════════════════════════════════════════════════ */

type SoundName =
  | "click"
  | "hover"
  | "key"
  | "confirm"
  | "discovery"
  | "achievement"
  | "open"
  | "close"
  | "enter"
  | "fault"
  | "secret";

const KEY = "prince-world/sound";
const LEVELS = { master: 0.42 };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let ambient: { oscA: OscillatorNode; oscB: OscillatorNode; gain: GainNode } | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? LEVELS.master : 0;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function env(
  c: AudioContext,
  node: AudioNode,
  { attack = 0.005, decay = 0.12, peak = 0.3, delay = 0 } = {}
) {
  const g = c.createGain();
  const t0 = c.currentTime + delay;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  node.connect(g);
  g.connect(master!);
  return { g, t0 };
}

function blip(freqA: number, freqB: number, dur: number, peak = 0.25, type: OscillatorType = "sine") {
  const c = ensureCtx();
  if (!c || !master) return;
  const o = c.createOscillator();
  o.type = type;
  const { t0 } = env(c, o, { attack: 0.006, decay: dur, peak });
  o.frequency.setValueAtTime(freqA, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, freqB), t0 + dur);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noiseBurst(dur: number, peak = 0.12, lp = 3000, hp = 300) {
  const c = ensureCtx();
  if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const lpf = c.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = lp;
  const hpf = c.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.value = hp;
  src.connect(hpf);
  hpf.connect(lpf);
  env(c, lpf, { attack: 0.003, decay: dur, peak });
  src.start();
}

export function playSound(name: SoundName) {
  if (!enabled) return;
  switch (name) {
    case "click":
      blip(920, 520, 0.07, 0.18);
      break;
    case "hover":
      blip(1400, 1200, 0.03, 0.05, "triangle");
      break;
    case "key":
      noiseBurst(0.03, 0.06, 5000, 800);
      break;
    case "confirm":
      blip(660, 660, 0.09, 0.14);
      blip(990, 990, 0.12, 0.1, "sine");
      /* second note delayed */
      break;
    case "open":
      noiseBurst(0.28, 0.07, 1600, 120);
      blip(330, 520, 0.16, 0.08, "sine");
      break;
    case "close":
      noiseBurst(0.2, 0.05, 1200, 120);
      blip(520, 300, 0.14, 0.07, "sine");
      break;
    case "discovery":
      blip(523, 523, 0.22, 0.16);
      setTimeout(() => enabled && blip(784, 784, 0.3, 0.14), 120);
      setTimeout(() => enabled && blip(1046, 1046, 0.42, 0.1), 260);
      break;
    case "achievement":
      blip(392, 392, 0.18, 0.14);
      setTimeout(() => enabled && blip(523, 523, 0.2, 0.13), 140);
      setTimeout(() => enabled && blip(659, 659, 0.34, 0.11), 300);
      break;
    case "enter":
      blip(70, 40, 0.7, 0.3, "sine");
      noiseBurst(0.6, 0.1, 900, 60);
      setTimeout(() => enabled && blip(880, 1760, 0.5, 0.06, "sine"), 200);
      break;
    case "fault":
      blip(220, 110, 0.3, 0.2, "sawtooth");
      noiseBurst(0.15, 0.1, 2400, 500);
      break;
    case "secret":
      blip(1046, 523, 0.6, 0.12);
      setTimeout(() => enabled && blip(784, 392, 0.8, 0.08), 220);
      break;
  }
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
  if (typeof window !== "undefined") localStorage.setItem(KEY, v ? "1" : "0");
  if (v) {
    ensureCtx();
    startAmbient();
  } else {
    stopAmbient();
  }
  if (master && ctx) {
    master.gain.linearRampToValueAtTime(v ? LEVELS.master : 0, ctx.currentTime + 0.3);
  }
}

export function isSoundEnabled() {
  return enabled;
}

export function initSoundFromStorage() {
  if (typeof window === "undefined") return;
  enabled = localStorage.getItem(KEY) === "1";
}

function startAmbient() {
  const c = ensureCtx();
  if (!c || !master || ambient) return;
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.016, c.currentTime + 3);
  const oscA = c.createOscillator();
  oscA.type = "sine";
  oscA.frequency.value = 55;
  const oscB = c.createOscillator();
  oscB.type = "sine";
  oscB.frequency.value = 55.6;
  /* slow breathing LFO */
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.007;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  oscA.connect(gain);
  oscB.connect(gain);
  gain.connect(master);
  oscA.start();
  oscB.start();
  lfo.start();
  ambient = { oscA, oscB, gain };
}

function stopAmbient() {
  if (!ambient || !ctx) return;
  const { oscA, oscB, gain } = ambient;
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  setTimeout(() => {
    try {
      oscA.stop();
      oscB.stop();
    } catch {
      /* already stopped */
    }
  }, 800);
  ambient = null;
}

/* ambient "now playing" pulse for music district — optional one-shot motif */
export function playFreqMotif(intensity = 1) {
  if (!enabled) return;
  const notes = [261.6, 329.6, 392, 523.3];
  notes.forEach((n, i) =>
    setTimeout(
      () => enabled && blip(n, n, 0.4 / intensity, 0.05 * intensity, "sine"),
      i * 140
    )
  );
}

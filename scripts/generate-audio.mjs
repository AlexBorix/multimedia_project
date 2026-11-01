import fs from 'node:fs';
import path from 'node:path';

const SR = 16000;
const OUT = path.join(process.cwd(), 'public', 'media', 'ambiance');

function writeWav(file, samples, samplerate = SR) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(samplerate, 24);
  buf.writeUInt32LE(samplerate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
  console.log('  ', path.relative(process.cwd(), file), `${(buf.length / 1024).toFixed(0)} Ko`);
}

function normalize(buf, peak = 0.5) {
  let max = 0;
  for (let i = 0; i < buf.length; i += 1) max = Math.max(max, Math.abs(buf[i]));
  if (max === 0) return buf;
  const gain = peak / max;
  for (let i = 0; i < buf.length; i += 1) buf[i] *= gain;
  return buf;
}

function fade(buf, ms = 40) {
  const count = Math.floor((ms / 1000) * SR);
  for (let i = 0; i < count && i < buf.length; i += 1) {
    const gain = i / count;
    buf[i] *= gain;
    buf[buf.length - 1 - i] *= gain;
  }
}

function addNoise(buf, start, end, amp, mode = 'white', lfo = 0.2) {
  const from = Math.floor(start * SR);
  const to = Math.min(buf.length, Math.floor(end * SR));
  let low = 0;
  let brown = 0;
  for (let i = from; i < to; i += 1) {
    const t = (i - from) / SR;
    const white = Math.random() * 2 - 1;
    brown = brown * 0.985 + white * 0.015;
    const gust = 0.6 + 0.4 * Math.sin(2 * Math.PI * lfo * t + 0.7);
    let sample;
    if (mode === 'rain') {
      low += 0.06 * (white - low);
      sample = (white - low) * 0.9;
    } else if (mode === 'wind') {
      low += 0.012 * (white - low);
      sample = low * 3.2;
    } else if (mode === 'brown') {
      sample = brown * 6;
    } else {
      sample = white * 0.35;
    }
    buf[i] += sample * amp * gust;
  }
}

function addDroplet(buf, start, amp = 0.05) {
  const frequency = 900 + Math.random() * 1800;
  const from = Math.floor(start * SR);
  const length = Math.floor(0.09 * SR);
  for (let i = 0; i < length && from + i < buf.length; i += 1) {
    const t = i / SR;
    const envelope = Math.exp(-t / 0.018);
    buf[from + i] += Math.sin(2 * Math.PI * frequency * t * (1 + t * 4)) * envelope * amp;
  }
}

function addCricket(buf, start, amp = 0.02) {
  const from = Math.floor(start * SR);
  const length = Math.floor(0.22 * SR);
  for (let i = 0; i < length && from + i < buf.length; i += 1) {
    const t = i / SR;
    const pulse = Math.sin(2 * Math.PI * 32 * t) > 0 ? 1 : 0;
    const envelope = Math.sin((Math.PI * t) / 0.22);
    buf[from + i] += Math.sin(2 * Math.PI * 4200 * t) * pulse * envelope * amp;
  }
}

function makeAmbience(kind) {
  const duration = 8;
  const buf = new Float32Array(Math.floor(duration * SR));
  if (kind === 'savane') {
    addNoise(buf, 0, duration, 0.16, 'brown', 0.12);
    for (let t = 0.7; t < duration; t += 1.35) addCricket(buf, t + Math.random() * 0.4, 0.022);
    for (let t = 2.2; t < duration; t += 3.1) addCricket(buf, t, 0.012);
  } else if (kind === 'pluie') {
    addNoise(buf, 0, duration, 0.22, 'rain', 0.5);
    for (let t = 0.2; t < duration; t += 0.17) addDroplet(buf, t + Math.random() * 0.1, 0.045);
  } else {
    addNoise(buf, 0, duration, 0.26, 'wind', 0.18);
  }
  normalize(buf);
  fade(buf);
  return buf;
}

fs.mkdirSync(OUT, { recursive: true });
console.log('Génération des ambiances sonores.');

for (const kind of ['savane', 'pluie', 'vent']) {
  writeWav(path.join(OUT, `${kind}.wav`), makeAmbience(kind));
}

console.log('Terminé.');

// WebAudio synth — no audio assets. Engine hum, sirens, gunshots, explosions, pickups.
export class AudioSys {
  constructor() { this.ctx = null; this.master = null; this.engineOsc = null; this.engineGain = null; this.sirenOsc = null; this.sirenGain = null; this.muted = false; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.25; this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0; this.engineOsc.connect(this.engineGain); this.engineGain.connect(this.master); this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator(); this.sirenOsc.type = 'sine'; this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0; this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master); this.sirenOsc.start();
      this._sirenT = 0;
    } catch { this.ctx = null; }
  }
  engine(speed01) { if (this.engineGain) this.engineGain.gain.value = 0.02 + speed01 * 0.06; if (this.engineOsc) this.engineOsc.frequency.value = 45 + speed01 * 120; }
  siren(on, dt) {
    if (!this.sirenGain) return;
    this._sirenT += dt;
    if (on) { this.sirenGain.gain.value = 0.05; this.sirenOsc.frequency.value = 650 + Math.sin(this._sirenT * 4) * 250; }
    else this.sirenGain.gain.value = 0;
  }
  _blip(freq, dur, type = 'square', vol = 0.2) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + dur);
  }
  _noise(dur, vol = 0.3) {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(this.master); s.start();
  }
  shot() { this._noise(0.12, 0.35); this._blip(180, 0.08, 'square', 0.15); }
  punch() { this._noise(0.06, 0.2); }
  explosion() { this._noise(0.7, 0.5); this._blip(60, 0.5, 'sine', 0.3); }
  pickup() { this._blip(880, 0.12, 'sine', 0.2); this._blip(1320, 0.15, 'sine', 0.15); }
  mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => this._blip(f, 0.2, 'sine', 0.2), i * 110)); }
  denied() { this._blip(140, 0.2, 'square', 0.15); }
}

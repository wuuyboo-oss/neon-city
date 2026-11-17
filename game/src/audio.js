// Neon Harbor — synthesized sound, no audio files.
// Everything is WebAudio oscillators and filtered noise, built at boot
// and driven by the game: engine hum, sirens, gunshots, pickups.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOscA = null;
  let sirenOscB = null;
  let sirenGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine: a low sawtooth through a low-pass, pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter).connect(engineGain).connect(master);
      engineOsc.start();
      // Siren: two tones alternating, quiet until police are near.
      sirenOscA = ctx.createOscillator();
      sirenOscA.type = 'sine';
      sirenOscA.frequency.value = 700;
      sirenOscB = ctx.createOscillator();
      sirenOscB.type = 'sine';
      sirenOscB.frequency.value = 950;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOscA.connect(sirenGain);
      sirenOscB.connect(sirenGain);
      sirenGain.connect(master);
      sirenOscA.start();
      sirenOscB.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function beep(freq, seconds, type, volume) {
    if (!ensure() || !ctx) return;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    osc.connect(gain).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }

  function noiseBurst(seconds, volume, filterFreq) {
    if (!ensure() || !ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = ctx.createGain();
    gain.gain.value = volume || 0.4;
    src.connect(filter).connect(gain).connect(master);
    src.start();
  }

  let sirenPhase = 0;

  return {
    /** Call once from a user gesture (the Start button) to unlock audio. */
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    setMuted(value) {
      muted = value;
      if (master && ctx) master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    /** Continuous engine hum: speed 0..1, on when driving. */
    engine(speed01, on) {
      if (!ensure() || !ctx) return;
      engineOsc.frequency.value = 50 + speed01 * 140;
      engineGain.gain.value = on ? 0.05 + speed01 * 0.06 : 0;
    },
    /** Siren wail; call every frame with police-near 0..1. */
    siren(near01, dt) {
      if (!ensure() || !ctx) return;
      sirenPhase += dt * 2.2;
      const high = Math.sin(sirenPhase * Math.PI * 2) > 0;
      sirenOscA.frequency.value = high ? 700 : 0.001;
      sirenOscB.frequency.value = high ? 0.001 : 950;
      sirenGain.gain.value = near01 * 0.05;
    },
    gunshot() {
      noiseBurst(0.18, 0.5, 900);
    },
    punch() {
      noiseBurst(0.08, 0.3, 500);
    },
    pickup() {
      beep(880, 0.12, 'sine', 0.25);
      setTimeout(() => beep(1320, 0.18, 'sine', 0.25), 90);
    },
    crash() {
      noiseBurst(0.3, 0.5, 400);
    },
    explosion() {
      noiseBurst(0.9, 0.7, 300);
    },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.3), i * 110));
    },
    busted() {
      [392, 311, 233].forEach((f, i) => setTimeout(() => beep(f, 0.4, 'sawtooth', 0.2), i * 220));
    },
  };
}

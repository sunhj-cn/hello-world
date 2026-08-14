(function (CAP) {
  "use strict";

  const NOTES = {
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
    C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
    C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, A5: 880.0, B5: 987.77,
    C6: 1046.5, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98, A6: 1760.0
  };

  function n(name) {
    return NOTES[name] || 0;
  }

  function createPulseWave(ctx, duty) {
    const harmonics = 32;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    for (let i = 1; i < harmonics; i++) {
      imag[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    }
    return ctx.createPeriodicWave(real, imag);
  }

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.muted = false;
      this.musicEnabled = true;
      this.currentTrack = null;
      this.timer = null;
      this.step = 0;
      this.pulseWave = null;
      this.noiseBuffer = null;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume();
        return;
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.28;
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.45;
      this.sfxGain.connect(this.master);

      this.pulseWave = createPulseWave(this.ctx, 0.25);
      this.noiseBuffer = this._makeNoise();
    }

    _makeNoise() {
      const len = this.ctx.sampleRate * 1;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        if (i % 7 === 0) last = Math.random() * 2 - 1;
        data[i] = last;
      }
      return buf;
    }

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.7;
    }

    toggleMute() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    _env(node, t, dur, peak, attack, release) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      node.connect(g);
      g.connect(this.sfxGain);
      return g;
    }

    _osc(type, freq, t, dur, peak, slideTo) {
      const o = this.ctx.createOscillator();
      if (type === "pulse") {
        o.setPeriodicWave(this.pulseWave);
      } else {
        o.type = type;
      }
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      this._env(o, t, dur, peak, Math.min(0.01, dur / 8), dur * 0.4);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    _noise(t, dur, peak, freq) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq || 1200;
      filter.Q.value = 0.8;
      src.connect(filter);
      this._env(filter, t, dur, peak, 0.005, dur * 0.5);
      src.start(t);
      src.stop(t + dur + 0.02);
    }

    play(name) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const sfx = this._sfx[name];
      if (sfx) sfx.call(this, t);
    }

    get _sfx() {
      return {
        jump: (t) => {
          this._osc("pulse", 330, t, 0.14, 0.22, 700);
        },
        bounce: (t) => {
          this._osc("square", 280, t, 0.1, 0.18, 520);
        },
        coin: (t) => {
          this._osc("square", 988, t, 0.08, 0.2);
          this._osc("square", 1319, t + 0.08, 0.22, 0.18);
        },
        bump: (t) => {
          this._osc("triangle", 140, t, 0.08, 0.25, 70);
          this._noise(t, 0.06, 0.12, 400);
        },
        break: (t) => {
          this._noise(t, 0.18, 0.28, 900);
          this._osc("square", 200, t, 0.1, 0.1, 60);
        },
        stomp: (t) => {
          this._osc("triangle", 220, t, 0.12, 0.28, 80);
        },
        kick: (t) => {
          this._osc("square", 200, t, 0.08, 0.2, 90);
          this._noise(t, 0.08, 0.15, 600);
        },
        power: (t) => {
          const seq = [262, 330, 392, 523, 392, 523, 659, 784];
          seq.forEach((f, i) => this._osc("square", f, t + i * 0.055, 0.07, 0.16));
        },
        appear: (t) => {
          [392, 523, 659, 784].forEach((f, i) => this._osc("square", f, t + i * 0.05, 0.08, 0.14));
        },
        oneup: (t) => {
          [659, 784, 988, 1047, 988, 1319].forEach((f, i) => this._osc("square", f, t + i * 0.07, 0.09, 0.16));
        },
        fireball: (t) => {
          this._osc("square", 180, t, 0.12, 0.12, 90);
          this._noise(t, 0.08, 0.1, 1800);
        },
        pipe: (t) => {
          this._osc("triangle", 400, t, 0.35, 0.2, 120);
        },
        pause: (t) => {
          this._osc("square", 523, t, 0.08, 0.12);
          this._osc("square", 392, t + 0.1, 0.1, 0.12);
        },
        flag: (t) => {
          const down = [784, 698, 659, 587, 523, 494, 440, 392];
          down.forEach((f, i) => this._osc("square", f, t + i * 0.07, 0.08, 0.14));
        },
        clear: (t) => {
          const fan = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
          fan.forEach((f, i) => this._osc("square", f, t + i * 0.09, 0.12, 0.16));
        },
        die: (t) => {
          this.stopMusic();
          const seq = [659, 622, 587, 554, 523, 494, 466, 440, 392, 330, 262];
          seq.forEach((f, i) => this._osc("square", f, t + i * 0.055, 0.08, 0.18, f * 0.85));
        },
        gameover: (t) => {
          this.stopMusic();
          const seq = [
            [392, 0.2], [0, 0.08], [330, 0.2], [0, 0.08],
            [262, 0.18], [247, 0.18], [262, 0.45]
          ];
          let at = 0;
          seq.forEach(([f, d]) => {
            if (f) this._osc("square", f, t + at, d, 0.16);
            at += d;
          });
        },
        firework: (t) => {
          this._noise(t, 0.25, 0.22, 1400);
          this._osc("square", 880, t, 0.08, 0.1, 400);
        }
      };
    }

    playMusic(track) {
      this.init();
      if (this.currentTrack === track && this.timer) return;
      this.stopMusic();
      this.currentTrack = track;
      const song = SONGS[track];
      if (!song || !this.musicEnabled) return;
      this.step = 0;
      this._schedule(song);
    }

    _schedule(song) {
      const ctx = this.ctx;
      const stepDur = 60 / song.bpm / 4;
      const lookahead = 0.12;
      let next = ctx.currentTime + 0.05;
      const len = song.sq1.length;

      const tick = () => {
        if (!this.timer) return;
        const now = ctx.currentTime;
        while (next < now + lookahead) {
          const i = this.step % len;
          this._note(this.musicGain, "pulse", song.sq1[i], next, stepDur, 0.11);
          this._note(this.musicGain, "square", song.sq2[i], next, stepDur, 0.06);
          this._note(this.musicGain, "triangle", song.tri[i], next, stepDur, 0.14);
          if (song.noise && song.noise[i]) {
            this._musicNoise(next, stepDur * 0.7, song.noise[i]);
          }
          this.step++;
          next += stepDur;
        }
        this.timer = setTimeout(tick, 40);
      };
      this.timer = setTimeout(tick, 0);
    }

    _note(dest, type, freq, t, dur, peak) {
      if (!freq) return;
      const o = this.ctx.createOscillator();
      if (type === "pulse") o.setPeriodicWave(this.pulseWave);
      else o.type = type;
      o.frequency.setValueAtTime(freq, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.92);
      o.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + dur);
    }

    _musicNoise(t, dur, peak) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 1800;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
      src.start(t);
      src.stop(t + dur);
    }

    stopMusic() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.currentTrack = null;
    }
  }

  function pat(str) {
    return str.trim().split(/\s+/).map((tok) => (tok === "--" || tok === "0" ? 0 : n(tok)));
  }

  const SONGS = {
    overworld: {
      bpm: 148,
      sq1: pat(`
        G5 E5 C5 E5  G5 A5 G5 E5  F5 D5 B4 D5  F5 G5 F5 D5
        E5 C5 A4 C5  E5 G5 E5 C5  D5 F5 G5 A5  G5 E5 C5 --
        G5 E5 C5 E5  G5 C6 A5 G5  F5 A5 G5 F5  E5 G5 D5 B4
        C5 E5 G5 E5  A5 G5 E5 C5  D5 E5 G5 E5  D5 C5 -- --
      `),
      sq2: pat(`
        E4 G4 C5 G4  E4 G4 C5 G4  D4 F4 B4 F4  D4 F4 B4 F4
        C4 E4 A4 E4  C4 E4 A4 E4  B3 D4 G4 D4  C4 E4 G4 --
        E4 G4 C5 G4  E4 G4 C5 G4  F4 A4 C5 A4  E4 G4 B4 G4
        C4 E4 G4 E4  F4 A4 G4 E4  G3 B3 D4 B3  C4 E4 -- --
      `),
      tri: pat(`
        C3 C3 G3 C3  C3 C3 G3 C3  F3 F3 C3 F3  G3 G3 D3 G3
        A2 A2 E3 A2  A2 A2 E3 A2  G2 G2 D3 G2  C3 G2 C3 --
        C3 C3 G3 C3  C3 C3 G3 C3  F3 F3 C3 F3  E3 E3 B2 E3
        A2 A2 E3 A2  F3 F3 C3 F3  G3 G3 D3 G3  C3 G3 C3 G3
      `),
      noise: (function () {
        const a = new Array(64).fill(0);
        for (let i = 0; i < 64; i++) if (i % 4 === 0) a[i] = 0.04;
        for (let i = 0; i < 64; i++) if (i % 8 === 4) a[i] = 0.07;
        return a;
      })()
    },
    underground: {
      bpm: 112,
      sq1: pat(`
        C4 -- Eb4 --  G4 -- Eb4 --  Ab4 G4 Eb4 C4  -- -- -- --
        B3 -- D4 --   F4 -- D4 --   G4 F4 D4 B3   -- -- -- --
        C4 -- Eb4 --  G4 -- C5 --   B4 G4 Eb4 C4  -- -- -- --
        F4 -- Ab4 --  G4 -- Eb4 --  D4 -- B3 --   C4 -- -- --
      `),
      sq2: pat(`
        G3 -- C4 --   Eb4 -- C4 --  F4 Eb4 C4 G3  -- -- -- --
        F3 -- B3 --   D4 -- B3 --   Eb4 D4 B3 F3  -- -- -- --
        G3 -- C4 --   Eb4 -- G4 --  F4 Eb4 C4 G3  -- -- -- --
        C4 -- F4 --   Eb4 -- C4 --  B3 -- G3 --   G3 -- -- --
      `),
      tri: pat(`
        C3 -- -- --   C3 -- G2 --   Ab2 -- -- --  Ab2 -- Eb2 --
        G2 -- -- --   G2 -- D2 --   C3 -- -- --   G2 -- -- --
        C3 -- -- --   C3 -- G2 --   F2 -- -- --   G2 -- -- --
        Ab2 -- -- --  G2 -- -- --   F2 -- G2 --   C3 -- -- --
      `)
    },
    star: {
      bpm: 200,
      sq1: pat(`
        C5 E5 G5 A5  C6 A5 G5 E5  C5 E5 G5 A5  C6 A5 G5 E5
        D5 Fs5 A5 B5 D6 B5 A5 Fs5 D5 Fs5 A5 B5 D6 B5 A5 Fs5
      `),
      sq2: pat(`
        E4 G4 C5 E5  G4 C5 E5 G5  E4 G4 C5 E5  G4 C5 E5 G5
        Fs4 A4 D5 Fs5 A4 D5 Fs5 A5 Fs4 A4 D5 Fs5 A4 D5 Fs5 A5
      `),
      tri: pat(`
        C3 G3 C3 G3  C3 G3 C3 G3  C3 G3 C3 G3  C3 G3 C3 G3
        D3 A3 D3 A3  D3 A3 D3 A3  D3 A3 D3 A3  D3 A3 D3 A3
      `)
    },
    title: {
      bpm: 132,
      sq1: pat(`
        C5 -- E5 G5  -- C6 -- G5  A5 -- F5 --  G5 -- E5 --
        F5 -- D5 --  E5 -- C5 --  D5 E5 F5 G5  E5 C5 -- --
        C5 -- E5 G5  -- C6 -- A5  G5 -- E5 --  F5 G5 A5 G5
        E5 -- C5 --  D5 -- B4 --  C5 -- -- --  -- -- -- --
      `),
      sq2: pat(`
        G4 -- C5 E5  -- G5 -- E5  F5 -- C5 --  E5 -- C5 --
        D5 -- B4 --  C5 -- G4 --  B4 C5 D5 E5  C5 G4 -- --
        G4 -- C5 E5  -- G5 -- F5  E5 -- C5 --  D5 E5 F5 E5
        C5 -- G4 --  B4 -- G4 --  G4 -- -- --  -- -- -- --
      `),
      tri: pat(`
        C3 -- G3 --  C3 -- G3 --  F3 -- C3 --  C3 -- G3 --
        G2 -- D3 --  C3 -- G2 --  G2 -- D3 --  C3 G3 C3 --
        C3 -- G3 --  C3 -- G3 --  F3 -- C3 --  G3 -- D3 --
        A2 -- E3 --  G2 -- D3 --  C3 -- G2 --  C3 -- -- --
      `)
    }
  };

  CAP.audio = new AudioEngine();
})(window.CAP = window.CAP || {});

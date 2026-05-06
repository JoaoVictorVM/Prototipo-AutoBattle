// SFX sintetizado via Web Audio API. Sem assets, sem dependências.
// Cada som é um pequeno bleep gerado em tempo real com osciladores e
// envelopes. Um master gain controla o volume global.

import { AUDIO } from "./constants.js";

let ctx = null;
let masterGain = null;

function getCtx() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = AUDIO.MASTER_VOLUME;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Bleep tonal com envelope ADSR simplificado e sweep opcional de frequência.
function tone({
  freq = 440,
  type = "square",
  duration = 0.1,
  attack = 0.005,
  release = 0.05,
  volume = 0.3,
  freqEnd = null,
}) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(0.01, freqEnd),
      now + duration,
    );
  }

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + duration + release + 0.05);
}

// Burst de ruído branco filtrado — bom para impacto/explosão.
function noise({ duration = 0.08, volume = 0.25, cutoff = 4000 }) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const bufferSize = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start(now);
  src.stop(now + duration + 0.05);
}

function sequence(steps) {
  steps.forEach(({ delay, fn }) => setTimeout(fn, delay));
}

// ---- Banco de sons -----------------------------------------------------

const sounds = {
  hit: () =>
    tone({
      freq: 220,
      type: "square",
      duration: 0.05,
      volume: 0.18,
      freqEnd: 110,
    }),

  enemyDeath: () => {
    tone({
      freq: 280,
      type: "sawtooth",
      duration: 0.18,
      volume: 0.28,
      freqEnd: 60,
    });
    setTimeout(() => noise({ duration: 0.1, volume: 0.12, cutoff: 1500 }), 30);
  },

  xpGain: () =>
    tone({
      freq: 880,
      type: "sine",
      duration: 0.06,
      volume: 0.15,
      freqEnd: 1320,
    }),

  xpDrop: () => {
    tone({
      freq: 1100,
      type: "sine",
      duration: 0.05,
      volume: 0.1,
      freqEnd: 1700,
    });
    setTimeout(
      () =>
        tone({
          freq: 1400,
          type: "sine",
          duration: 0.05,
          volume: 0.08,
          freqEnd: 2100,
        }),
      30,
    );
  },

  levelUp: () => {
    sequence([
      { delay: 0, fn: () => tone({ freq: 523, type: "square", duration: 0.08, volume: 0.22 }) },
      { delay: 70, fn: () => tone({ freq: 659, type: "square", duration: 0.08, volume: 0.22 }) },
      { delay: 140, fn: () => tone({ freq: 784, type: "square", duration: 0.14, volume: 0.24 }) },
    ]);
  },

  cardPickup: () =>
    tone({ freq: 540, type: "triangle", duration: 0.04, volume: 0.16 }),

  cardDropValid: () =>
    tone({
      freq: 440,
      type: "square",
      duration: 0.07,
      volume: 0.22,
      freqEnd: 660,
    }),

  cardDropInvalid: () =>
    tone({
      freq: 200,
      type: "square",
      duration: 0.12,
      volume: 0.2,
      freqEnd: 90,
    }),

  cardDiscard: () => {
    noise({ duration: 0.16, volume: 0.16, cutoff: 1200 });
    tone({
      freq: 320,
      type: "triangle",
      duration: 0.1,
      volume: 0.12,
      freqEnd: 180,
    });
  },

  cardMerge: () => {
    sequence([
      {
        delay: 0,
        fn: () =>
          tone({
            freq: 660,
            type: "square",
            duration: 0.06,
            volume: 0.2,
          }),
      },
      {
        delay: 60,
        fn: () =>
          tone({
            freq: 880,
            type: "square",
            duration: 0.08,
            volume: 0.22,
          }),
      },
      {
        delay: 130,
        fn: () =>
          tone({
            freq: 1175,
            type: "square",
            duration: 0.14,
            volume: 0.26,
          }),
      },
    ]);
  },

  gameOver: () => {
    sequence([
      { delay: 0, fn: () => tone({ freq: 330, type: "sawtooth", duration: 0.18, volume: 0.3 }) },
      { delay: 140, fn: () => tone({ freq: 277, type: "sawtooth", duration: 0.18, volume: 0.3 }) },
      { delay: 280, fn: () => tone({ freq: 220, type: "sawtooth", duration: 0.2, volume: 0.3 }) },
      { delay: 420, fn: () => tone({ freq: 165, type: "sawtooth", duration: 0.32, volume: 0.32 }) },
    ]);
  },

  waveStart: () => {
    sequence([
      { delay: 0, fn: () => tone({ freq: 392, type: "square", duration: 0.08, volume: 0.22 }) },
      { delay: 80, fn: () => tone({ freq: 587, type: "square", duration: 0.12, volume: 0.24 }) },
    ]);
  },

  startBattle: () => {
    sequence([
      { delay: 0, fn: () => tone({ freq: 523, type: "square", duration: 0.06, volume: 0.22 }) },
      { delay: 60, fn: () => tone({ freq: 784, type: "square", duration: 0.1, volume: 0.24 }) },
    ]);
  },
};

// Hits podem disparar muitos por segundo (vários aliados atacando ao mesmo
// tempo). Throttle global para evitar saturação áspera no áudio.
let lastHitAt = 0;

export function play(name) {
  if (name === "hit") {
    const now = performance.now();
    if (now - lastHitAt < AUDIO.HIT_THROTTLE_MS) return;
    lastHitAt = now;
  }
  const fn = sounds[name];
  if (!fn) return;
  try {
    fn();
  } catch (err) {
    console.warn("[audio] erro ao tocar", name, err);
  }
}

// Browsers exigem gesture do usuário antes de criar/resumir um AudioContext.
// Anexamos ouvintes globais que destravam o contexto na primeira interação.
export function unlockOnFirstInteraction() {
  const handler = () => {
    getCtx();
    document.removeEventListener("pointerdown", handler);
    document.removeEventListener("keydown", handler);
  };
  document.addEventListener("pointerdown", handler);
  document.addEventListener("keydown", handler);
}

// Web Audio SFX — low-latency, polyphonic.
// Swap file numbers in SFX_FILES after auditioning the sounds.

const _ctx = new AudioContext();
const _buf = new Map();

// ── Assignment — change numbers here to remap ─────────────────────────
const SFX_FILES = {
  tap:       'sfx/DM-CGS-20.wav',  // light input tap
  correct:   'sfx/DM-CGS-04.wav',  // row answered correctly
  quizDone:  'sfx/DM-CGS-14.wav',  // whole panel cleared
  incorrect: 'sfx/DM-CGS-09.wav',  // wrong answer / game over
};

export async function loadSfx() {
  await Promise.all(
    Object.entries(SFX_FILES).map(async ([name, path]) => {
      try {
        const ab = await fetch(path).then(r => r.arrayBuffer());
        _buf.set(name, await _ctx.decodeAudioData(ab));
      } catch (e) {
        console.warn('[sfx] failed to load', path, e);
      }
    })
  );
}

// Call on the first user gesture to satisfy browser autoplay policy.
export function unlockAudio() {
  if (_ctx.state === 'suspended') _ctx.resume();
}

export function play(name, volume = 1) {
  const buf = _buf.get(name);
  if (!buf) return;
  if (_ctx.state === 'suspended') _ctx.resume();
  const src  = _ctx.createBufferSource();
  const gain = _ctx.createGain();
  src.buffer      = buf;
  gain.gain.value = volume;
  src.connect(gain).connect(_ctx.destination);
  src.start(0);
}

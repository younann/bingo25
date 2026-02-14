// Sound effects system using Web Audio API (no external files needed)

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browsers require user gesture)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

const MUTE_KEY = 'bingo_sound_muted';

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MUTE_KEY) === 'true';
}

export function setMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
}

export function toggleMute(): boolean {
  const newMuted = !isMuted();
  setMuted(newMuted);
  return newMuted;
}

// Haptic feedback
function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// Play a tone with given frequency, duration, and type
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
  delay: number = 0
): void {
  const ctx = getAudioContext();
  if (!ctx || isMuted()) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime + delay);
  oscillator.stop(ctx.currentTime + delay + duration);
}

// Cell tap - short click
export function playCellTap(): void {
  playTone(800, 0.05, 'square', 0.15);
  vibrate(30);
}

// Cell untap - slightly lower
export function playCellUntap(): void {
  playTone(600, 0.04, 'square', 0.1);
  vibrate(20);
}

// Number drawn - ascending chime
export function playNumberDrawn(): void {
  playTone(523, 0.15, 'sine', 0.25, 0);      // C5
  playTone(659, 0.15, 'sine', 0.25, 0.1);     // E5
  playTone(784, 0.2, 'sine', 0.3, 0.2);       // G5
}

// Bingo detected on player card
export function playBingoDetected(): void {
  playTone(523, 0.15, 'sine', 0.3, 0);        // C5
  playTone(659, 0.15, 'sine', 0.3, 0.12);     // E5
  playTone(784, 0.15, 'sine', 0.3, 0.24);     // G5
  playTone(1047, 0.3, 'sine', 0.4, 0.36);     // C6
  vibrate([100, 50, 100, 50, 200]);
}

// Winner announced - celebration
export function playWinnerCelebration(): void {
  // Fanfare sequence
  playTone(523, 0.2, 'sine', 0.3, 0);         // C5
  playTone(523, 0.1, 'sine', 0.3, 0.2);       // C5
  playTone(523, 0.1, 'sine', 0.3, 0.35);      // C5
  playTone(659, 0.15, 'sine', 0.3, 0.5);      // E5
  playTone(784, 0.15, 'sine', 0.3, 0.65);     // G5
  playTone(1047, 0.4, 'sine', 0.4, 0.8);      // C6
  vibrate([100, 50, 100, 50, 100, 50, 300]);
}

// Reaction sent
export function playReactionSent(): void {
  playTone(880, 0.08, 'sine', 0.15);
  vibrate(15);
}

// New number on display (louder chime for projector)
export function playDisplayChime(): void {
  playTone(659, 0.12, 'triangle', 0.4, 0);    // E5
  playTone(784, 0.12, 'triangle', 0.4, 0.1);  // G5
  playTone(1047, 0.25, 'triangle', 0.5, 0.2); // C6
}

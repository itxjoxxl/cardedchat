import { useRef, useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

// ---------------------------------------------------------------------------
// Web Audio helpers
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.25
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Gentle fade-out to avoid clicks
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + duration
    );

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSound() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  // Keep a stable ref so callbacks don't need to close over the primitive
  const enabledRef = useRef(soundEnabled);
  enabledRef.current = soundEnabled;

  const playDeal = useCallback(() => {
    if (!enabledRef.current) return;
    playTone(440, 0.05, 'triangle', 0.2);
  }, []);

  const playFlip = useCallback(() => {
    if (!enabledRef.current) return;
    playTone(520, 0.08, 'sine', 0.2);
  }, []);

  const playPlace = useCallback(() => {
    if (!enabledRef.current) return;
    playTone(380, 0.06, 'triangle', 0.18);
  }, []);

  const playShuffle = useCallback(() => {
    if (!enabledRef.current) return;
    // Rapid burst of deal-like tones
    const ctx = getAudioContext();
    if (!ctx) return;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const delay = i * 0.06;
      const freq = 380 + Math.random() * 120;
      setTimeout(() => playTone(freq, 0.05, 'triangle', 0.15), delay * 1000);
    }
  }, []);

  const playWin = useCallback(() => {
    if (!enabledRef.current) return;
    // Happy ascending arpeggio
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, 'sine', 0.25), i * 120);
    });
  }, []);

  const playError = useCallback(() => {
    if (!enabledRef.current) return;
    playTone(220, 0.1, 'sawtooth', 0.2);
  }, []);

  return {
    playDeal,
    playFlip,
    playPlace,
    playShuffle,
    playWin,
    playError,
  };
}

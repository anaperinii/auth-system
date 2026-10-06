import { useEffect, useRef, useState } from 'react';

export type AnimationPhase = 'idle' | 'leaving' | 'entering';

const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DEFAULT_DURATION_MS = 340;

export function useAnimatedText(
  value: string,
  durationMs: number = DEFAULT_DURATION_MS,
): [string, AnimationPhase] {
  const [displayedText, setDisplayedText] = useState(value);
  const [phase, setPhase] = useState<AnimationPhase>('idle');

  const displayedTextRef = useRef(displayedText);
  displayedTextRef.current = displayedText;

  useEffect(() => {
    if (value === displayedTextRef.current) {
      setPhase('idle');
      return;
    }

    if (PREFERS_REDUCED_MOTION) {
      setDisplayedText(value);
      return;
    }

    let isCancelled = false;
    setPhase('leaving');

    const timeoutId = window.setTimeout(() => {
      if (isCancelled) return;

      setDisplayedText(value);
      setPhase('entering');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!isCancelled) setPhase('idle');
        });
      });
    }, durationMs);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [value, durationMs]);

  return [displayedText, phase];
}

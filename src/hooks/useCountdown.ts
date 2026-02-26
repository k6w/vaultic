import { useState, useEffect } from 'react';
import { getRemainingSeconds } from '@shared/totp';

export function useCountdown(period: number = 30): number {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(period),
  );

  useEffect(() => {
    const update = () => {
      setRemainingSeconds(getRemainingSeconds(period));
    };

    // Update immediately in case period changed
    update();

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [period]);

  return remainingSeconds;
}

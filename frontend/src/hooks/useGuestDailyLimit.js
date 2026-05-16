import { useCallback } from 'react';
import { useState, useEffect } from 'react';

// Guest daily limit hook
export function useGuestDailyLimit(maxCount = 3) {
  const [count, setCount] = useState(0);
  const [canUse, setCanUse] = useState(true);

  const loadCount = useCallback(() => {
    const stored = localStorage.getItem('vidbreefy_daily_count');
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        setCount(data.count);
        setCanUse(data.count < maxCount);
      } else {
        localStorage.setItem('vidbreefy_daily_count', JSON.stringify({ date: today, count: 0 }));
        setCount(0);
        setCanUse(true);
      }
    }
  }, [maxCount]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  const increment = useCallback(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const newCount = count + 1;
    
    localStorage.setItem('vidbreefy_daily_count', JSON.stringify({ date: today, count: newCount }));
    setCount(newCount);
    setCanUse(newCount < maxCount);
    return newCount < maxCount;
  }, [count, maxCount]);

  const remaining = maxCount - count;

  return { count, canUse, remaining, increment };
}
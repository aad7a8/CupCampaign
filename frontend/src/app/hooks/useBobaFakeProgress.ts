import { useState, useRef, useCallback } from 'react';

interface UseBobaFakeProgressOptions {
  expectedMs?: number;
}

export function useBobaFakeProgress({ expectedMs = 60000 }: UseBobaFakeProgressOptions = {}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearAllTimers();
    setProgress(0);
    setStatus('running');

    let currentProgress = 0;
    const startTime = Date.now();
    
    // 分配时间：0-70 用 40%，70-90 用 30%，90-99 用 30%
    const phase1Time = expectedMs * 0.4; // 0-70
    const phase2Time = expectedMs * 0.3; // 70-90
    const phase3Time = expectedMs * 0.3; // 90-99

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < phase1Time) {
        // 0-70: 快速阶段
        const ratio = elapsed / phase1Time;
        currentProgress = Math.min(70, ratio * 70);
      } else if (elapsed < phase1Time + phase2Time) {
        // 70-90: 慢速阶段
        const phase2Elapsed = elapsed - phase1Time;
        const ratio = phase2Elapsed / phase2Time;
        currentProgress = Math.min(90, 70 + ratio * 20);
      } else if (elapsed < phase1Time + phase2Time + phase3Time) {
        // 90-99: 很慢阶段
        const phase3Elapsed = elapsed - phase1Time - phase2Time;
        const ratio = phase3Elapsed / phase3Time;
        currentProgress = Math.min(99, 90 + ratio * 9);
      } else {
        // 卡在 99，不再自动前进
        currentProgress = 99;
        clearAllTimers();
        setProgress(99);
        return;
      }

      setProgress(currentProgress);

      // 继续更新
      if (currentProgress < 99) {
        intervalRef.current = setTimeout(updateProgress, 50);
      } else {
        clearAllTimers();
      }
    };

    // 开始更新
    updateProgress();
  }, [expectedMs, clearAllTimers]);

  const finish = useCallback(() => {
    clearAllTimers();
    setProgress(100);
    setStatus('done');
  }, [clearAllTimers]);

  const reset = useCallback(() => {
    clearAllTimers();
    setProgress(0);
    setStatus('idle');
  }, [clearAllTimers]);

  return {
    progress,
    status,
    start,
    finish,
    reset,
  };
}

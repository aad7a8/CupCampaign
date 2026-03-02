import { useState, useEffect, useRef, useCallback } from 'react';

interface GenerationResult {
  facebook: string;
  instagram: string;
  fb_img_prompt?: string;
  ig_img_prompt?: string;
}

interface StartGenerationPayload {
  drink_name: string;
  news_context?: string;
  promotion_info?: string;
  mood_tone?: string;
  weather_info?: string;
  holiday_info?: string;
}

export function useGenerationPolling() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [stage, setStage] = useState<string>('idle');
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startGeneration = useCallback(async (payload: StartGenerationPayload) => {
    // Reset state
    setStatus('running');
    setStage('pending');
    setProgress(0);
    setStageText('排隊中...');
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/generate_post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.status === 'success' && data.task_id) {
        setTaskId(data.task_id);
      } else {
        setError(data.message || '啟動生成失敗');
        setStatus('idle');
      }
    } catch (e: any) {
      setError(e.message || '網路連線錯誤');
      setStatus('idle');
    }
  }, []);

  // Polling logic
  useEffect(() => {
    if (!taskId || status !== 'running') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/generate_post/status/${taskId}`, {
          credentials: 'include',
        });
        const data = await res.json();

        if (data.status === 'error' && res.status === 404) {
          // Task not found — stop polling
          setError('Task not found');
          setStatus('idle');
          return;
        }

        setStage(data.stage);
        setProgress(data.progress);
        setStageText(data.message);

        if (data.stage === 'done') {
          setStatus('done');
          setResult(data.result);
          setTaskId(null);
        } else if (data.stage === 'error') {
          setError(data.message || '生成失敗');
          setStatus('idle');
          setTaskId(null);
        }
      } catch {
        // Network error — keep polling, it may recover
      }
    };

    // Poll immediately, then every 2 seconds
    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [taskId, status]);

  const reset = useCallback(() => {
    setTaskId(null);
    setStage('idle');
    setProgress(0);
    setStageText('');
    setStatus('idle');
    setResult(null);
    setError(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { progress, status, stage, stageText, result, error, startGeneration, reset };
}

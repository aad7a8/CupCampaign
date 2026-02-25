import React, { useEffect, useRef, useState, useCallback } from 'react';
import './BobaProgress.css';
import { cn } from './utils';

interface BobaProgressProps {
  progress: number; // 0-100
  status?: 'idle' | 'running' | 'done';
  stageText?: string;
  showCounter?: boolean;
  size?: 'sm' | 'md';
}

interface FallingPearl {
  id: number;
  left: number;
  delay: number;
}

export function BobaProgress({
  progress,
  status = 'idle',
  stageText,
  showCounter = true,
  size = 'md',
}: BobaProgressProps) {
  const [fallingPearls, setFallingPearls] = useState<FallingPearl[]>([]);
  const [showStraw, setShowStraw] = useState(false);
  const [showPopBubble, setShowPopBubble] = useState(false);
  const pearlIdCounter = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedCompletionAnimation = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clamp progress: running 状态最多显示 99
  const displayProgress = status === 'running' ? Math.min(99, Math.max(0, progress)) : Math.min(100, Math.max(0, progress));
  const liquidHeight = `${displayProgress}%`;

  // Calculate pearl count based on progress
  const pearlCount = Math.floor((displayProgress / 100) * 12); // Max 12 pearls

  // Get stage text
  const getStageText = () => {
    if (stageText) return stageText;
    if (displayProgress < 30) return '沖泡中…';
    if (displayProgress < 70) return '加珍珠…';
    if (displayProgress < 100) return '封膜中…';
    return '完成！';
  };

  // Generate falling pearls
  const addFallingPearl = useCallback(() => {
    if (status !== 'running' || fallingPearls.length >= 16) return; // Max 16 pearls

    const left = Math.random() * 80 + 10; // 10% to 90% of cup width
    const newPearl: FallingPearl = {
      id: pearlIdCounter.current++,
      left,
      delay: 0,
    };

    setFallingPearls(prev => [...prev, newPearl]);

    // Remove pearl after animation
    setTimeout(() => {
      setFallingPearls(prev => prev.filter(p => p.id !== newPearl.id));
    }, 1500);
  }, [status, fallingPearls.length]);

  // Control falling pearl frequency based on progress
  useEffect(() => {
    if (status !== 'running') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    let interval: number;
    if (displayProgress < 70) {
      // 0-70: 快速掉落
      interval = 300;
    } else if (displayProgress < 90) {
      // 70-90: 慢速掉落
      interval = 600;
    } else {
      // 90-99: 偶尔掉落
      interval = 1500;
    }

    intervalRef.current = setInterval(() => {
      addFallingPearl();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, displayProgress, addFallingPearl]);

  // Completion animation (only play once)
  useEffect(() => {
    if (status === 'done' && !hasPlayedCompletionAnimation.current) {
      hasPlayedCompletionAnimation.current = true;
      setShowStraw(true);
      setShowPopBubble(true);

      // Remove pop bubble after animation
      setTimeout(() => {
        setShowPopBubble(false);
      }, 500);
    } else if (status !== 'done') {
      hasPlayedCompletionAnimation.current = false;
      setShowStraw(false);
      setShowPopBubble(false);
    }
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Accessibility
  const ariaValueNow = Math.round(displayProgress);
  const ariaValueMin = 0;
  const ariaValueMax = 100;

  return (
    <div
      ref={containerRef}
      className={cn('boba-progress-container', `size-${size}`)}
      role="progressbar"
      aria-label="文案生成進度"
      aria-valuenow={ariaValueNow}
      aria-valuemin={ariaValueMin}
      aria-valuemax={ariaValueMax}
    >
      <div className="boba-cup-wrapper">
        <div className="boba-cup-container">
          {/* Cup */}
          <div className="boba-cup">
            {/* Liquid */}
            <div
              className="boba-liquid"
              style={{ height: liquidHeight }}
            />
            
            {/* Pearl layer at bottom */}
            <div className="boba-pearl-layer">
              {Array.from({ length: pearlCount }).map((_, i) => (
                <div key={i} className="boba-pearl" />
              ))}
            </div>
          </div>

          {/* Straw (completion) */}
          {showStraw && (
            <div className={cn('boba-straw', showStraw && 'boba-straw-enter')} />
          )}

          {/* Pop bubble (completion) */}
          {showPopBubble && (
            <div className={cn('boba-pop-bubble', showPopBubble && 'boba-pop-bubble-animate')} />
          )}

          {/* Falling pearls */}
          {fallingPearls.map(pearl => (
            <div
              key={pearl.id}
              className="boba-falling-pearl boba-falling-pearl-animate"
              style={{
                left: `${pearl.left}%`,
                animationDelay: `${pearl.delay}ms`,
              }}
            />
          ))}
        </div>

        {/* Text info */}
        <div className="boba-text-info">
          <div className="boba-stage-text">{getStageText()}</div>
          {showCounter && (
            <div className="boba-counter">
              {status === 'done' ? '100%' : `${Math.round(displayProgress)}/99`}
            </div>
          )}
          {status === 'running' && (
            <div className="boba-hint">通常需 30–60 秒 · 請勿關閉頁面</div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import './TeaFlowProgressBar.css';
import { cn } from './utils';
import { CheckCircle2 } from 'lucide-react';

interface TeaFlowProgressBarProps {
  progress: number; // 0-100
  status?: 'idle' | 'running' | 'done';
  label?: string;
  showCounter?: boolean;
  compact?: boolean;
}

export function TeaFlowProgressBar({
  progress,
  status = 'idle',
  label,
  showCounter = true,
  compact = true,
}: TeaFlowProgressBarProps) {
  // Clamp progress: running 状态最多显示 99
  const displayProgress = status === 'running' 
    ? Math.min(99, Math.max(0, progress)) 
    : Math.min(100, Math.max(0, progress));

  // 珍珠数量：3-6颗，根据进度动态显示
  const pearlCount = status === 'running' 
    ? Math.min(6, Math.max(3, Math.floor(displayProgress / 20)))
    : 0;

  // 获取状态文本
  const getStatusText = () => {
    if (status === 'idle') return '等待選擇文案風格';
    if (status === 'done') return '完成';
    return label || '正在生成圖片...';
  };

  // Accessibility
  const ariaValueNow = Math.round(displayProgress);
  const ariaValueMin = 0;
  const ariaValueMax = 100;

  if (status === 'idle') {
    return (
      <div
        className={cn('tea-flow-progress-container', compact && 'tea-flow-progress-compact')}
        role="status"
        aria-label="等待選擇文案風格"
      >
        <div className="tea-flow-status-text">{getStatusText()}</div>
      </div>
    );
  }

  return (
    <div
      className={cn('tea-flow-progress-container', compact && 'tea-flow-progress-compact')}
      role="progressbar"
      aria-label="生成進度"
      aria-valuenow={ariaValueNow}
      aria-valuemin={ariaValueMin}
      aria-valuemax={ariaValueMax}
    >
      {/* 状态文本和计数器 */}
      <div className="tea-flow-header">
        <div className="tea-flow-status-text">
          {status === 'done' ? (
            <span className="tea-flow-done-text">
              <CheckCircle2 className="tea-flow-check-icon" />
              {getStatusText()}
            </span>
          ) : (
            getStatusText()
          )}
        </div>
        {showCounter && (
          <div className="tea-flow-counter">
            {status === 'done' ? '100/100' : `${Math.round(displayProgress)}/99`}
          </div>
        )}
      </div>

      {/* 进度条 */}
      <div className="tea-flow-progress-track">
        <div
          className={cn(
            'tea-flow-progress-fill',
            status === 'running' && 'tea-flow-progress-running',
            status === 'done' && 'tea-flow-progress-done'
          )}
          style={{ width: `${displayProgress}%` }}
        >
          {/* 奶茶纹理流动背景 */}
          <div className="tea-flow-texture" />

          {/* 珍珠漂移 */}
          {status === 'running' && (
            <div className="tea-flow-pearls-container">
              {Array.from({ length: pearlCount }).map((_, i) => (
                <div
                  key={i}
                  className="tea-flow-pearl"
                  style={{
                    left: `${(i * 15 + 10) % 80}%`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 提示文字 */}
      {status === 'running' && (
        <div className="tea-flow-hint">請勿關閉頁面 · 約 30–60 秒</div>
      )}
    </div>
  );
}

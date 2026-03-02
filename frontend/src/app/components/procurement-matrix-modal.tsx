"use client";

import React from 'react';
import { DollarSign, Check, Circle, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';

// 矩陣資料類型
type MatrixCellLevel = 1 | 2 | 3 | 4; // 1=最佳, 2=適合, 3=偏高, 4=高價
type TrendDirection = 'up' | 'down' | 'stable';

interface MatrixCell {
  level: MatrixCellLevel;
  trend: TrendDirection;
  hasStar?: boolean; // 是否有星星標記
}

interface ProcurementMatrixData {
  [ingredient: string]: {
    [month: number]: MatrixCell;
  };
}

// Mock 資料：全年產季熱點矩陣
const MOCK_MATRIX_DATA: ProcurementMatrixData = {
  草莓: {
    1: { level: 1, trend: 'up', hasStar: false },
    2: { level: 1, trend: 'up', hasStar: true },
    3: { level: 1, trend: 'up', hasStar: false },
    4: { level: 1, trend: 'up', hasStar: false },
    5: { level: 4, trend: 'up', hasStar: false },
    6: { level: 4, trend: 'up', hasStar: false },
    7: { level: 4, trend: 'up', hasStar: false },
    8: { level: 4, trend: 'up', hasStar: false },
    9: { level: 4, trend: 'up', hasStar: false },
    10: { level: 3, trend: 'up', hasStar: false },
    11: { level: 2, trend: 'down', hasStar: false },
    12: { level: 1, trend: 'down', hasStar: false },
  },
  芒果: {
    1: { level: 4, trend: 'up', hasStar: false },
    2: { level: 4, trend: 'up', hasStar: false },
    3: { level: 4, trend: 'up', hasStar: false },
    4: { level: 3, trend: 'up', hasStar: false },
    5: { level: 2, trend: 'down', hasStar: true },
    6: { level: 1, trend: 'down', hasStar: true },
    7: { level: 1, trend: 'stable', hasStar: true },
    8: { level: 1, trend: 'stable', hasStar: false },
    9: { level: 3, trend: 'up', hasStar: false },
    10: { level: 4, trend: 'up', hasStar: false },
    11: { level: 4, trend: 'up', hasStar: false },
    12: { level: 4, trend: 'up', hasStar: false },
  },
  鳳梨: {
    1: { level: 3, trend: 'up', hasStar: false },
    2: { level: 3, trend: 'up', hasStar: false },
    3: { level: 3, trend: 'up', hasStar: false },
    4: { level: 1, trend: 'down', hasStar: true },
    5: { level: 1, trend: 'down', hasStar: false },
    6: { level: 1, trend: 'stable', hasStar: false },
    7: { level: 2, trend: 'stable', hasStar: false },
    8: { level: 2, trend: 'up', hasStar: false },
    9: { level: 3, trend: 'up', hasStar: false },
    10: { level: 4, trend: 'up', hasStar: false },
    11: { level: 4, trend: 'up', hasStar: false },
    12: { level: 4, trend: 'up', hasStar: false },
  },
  葡萄: {
    1: { level: 4, trend: 'up', hasStar: false },
    2: { level: 4, trend: 'up', hasStar: false },
    3: { level: 4, trend: 'up', hasStar: false },
    4: { level: 3, trend: 'up', hasStar: false },
    5: { level: 2, trend: 'down', hasStar: false },
    6: { level: 1, trend: 'down', hasStar: true },
    7: { level: 1, trend: 'down', hasStar: true },
    8: { level: 1, trend: 'stable', hasStar: false },
    9: { level: 2, trend: 'up', hasStar: false },
    10: { level: 3, trend: 'up', hasStar: false },
    11: { level: 4, trend: 'up', hasStar: false },
    12: { level: 4, trend: 'up', hasStar: false },
  },
  檸檬: {
    1: { level: 1, trend: 'stable', hasStar: false },
    2: { level: 1, trend: 'stable', hasStar: false },
    3: { level: 1, trend: 'stable', hasStar: false },
    4: { level: 1, trend: 'stable', hasStar: false },
    5: { level: 2, trend: 'stable', hasStar: false },
    6: { level: 2, trend: 'stable', hasStar: false },
    7: { level: 2, trend: 'stable', hasStar: false },
    8: { level: 2, trend: 'stable', hasStar: false },
    9: { level: 2, trend: 'stable', hasStar: false },
    10: { level: 2, trend: 'stable', hasStar: false },
    11: { level: 2, trend: 'stable', hasStar: false },
    12: { level: 1, trend: 'stable', hasStar: false },
  },
  百香果: {
    1: { level: 3, trend: 'up', hasStar: false },
    2: { level: 3, trend: 'up', hasStar: false },
    3: { level: 3, trend: 'up', hasStar: false },
    4: { level: 1, trend: 'down', hasStar: true },
    5: { level: 1, trend: 'down', hasStar: false },
    6: { level: 1, trend: 'stable', hasStar: false },
    7: { level: 2, trend: 'stable', hasStar: false },
    8: { level: 2, trend: 'up', hasStar: false },
    9: { level: 3, trend: 'up', hasStar: false },
    10: { level: 4, trend: 'up', hasStar: false },
    11: { level: 4, trend: 'up', hasStar: false },
    12: { level: 4, trend: 'up', hasStar: false },
  },
  荔枝: {
    1: { level: 4, trend: 'up', hasStar: false },
    2: { level: 4, trend: 'up', hasStar: false },
    3: { level: 4, trend: 'up', hasStar: false },
    4: { level: 3, trend: 'up', hasStar: false },
    5: { level: 2, trend: 'down', hasStar: true },
    6: { level: 1, trend: 'down', hasStar: true },
    7: { level: 1, trend: 'down', hasStar: true },
    8: { level: 2, trend: 'up', hasStar: false },
    9: { level: 3, trend: 'up', hasStar: false },
    10: { level: 4, trend: 'up', hasStar: false },
    11: { level: 4, trend: 'up', hasStar: false },
    12: { level: 4, trend: 'up', hasStar: false },
  },
  西瓜: {
    1: { level: 4, trend: 'up', hasStar: false },
    2: { level: 4, trend: 'up', hasStar: false },
    3: { level: 3, trend: 'up', hasStar: false },
    4: { level: 1, trend: 'down', hasStar: true },
    5: { level: 1, trend: 'down', hasStar: true },
    6: { level: 1, trend: 'down', hasStar: true },
    7: { level: 1, trend: 'down', hasStar: true },
    8: { level: 1, trend: 'stable', hasStar: false },
    9: { level: 4, trend: 'up', hasStar: false },
    10: { level: 4, trend: 'up', hasStar: false },
    11: { level: 3, trend: 'up', hasStar: false },
    12: { level: 4, trend: 'up', hasStar: false },
  },
};

const INGREDIENTS = ['草莓', '芒果', '鳳梨', '葡萄', '檸檬', '百香果', '荔枝', '西瓜'];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// 狀態文字映射
const getLevelLabel = (level: MatrixCellLevel): string => {
  switch (level) {
    case 1:
      return '最佳';
    case 2:
      return '適合';
    case 3:
      return '偏高';
    case 4:
      return '高價';
    default:
      return '';
  }
};

// Icon Encoding：根據 level 返回對應的 icon
const getLevelIcon = (level: MatrixCellLevel): { node: React.ReactNode; label: string } => {
  switch (level) {
    case 1: // 最佳
      return {
        node: <Check className="w-5 h-5 text-emerald-500" />,
        label: '最佳',
      };
    case 2: // 適合
      return {
        node: <Circle className="w-4 h-4 fill-emerald-500 text-emerald-500" />,
        label: '適合',
      };
    case 3: // 偏高
      return {
        node: <TrendingUp className="w-4 h-4 text-orange-500" />,
        label: '偏高',
      };
    case 4: // 高價
      return {
        node: <span className="text-xs font-semibold text-orange-500">$$$</span>,
        label: '高價',
      };
    default:
      return {
        node: null,
        label: '',
      };
  }
};

interface ProcurementMatrixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProcurementMatrixModal({ open, onOpenChange }: ProcurementMatrixModalProps) {
  const currentMonth = new Date().getMonth() + 1; // 1-12

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1400px,95vw)] max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="w-5 h-5 text-orange-400" />
            全年產季熱點矩陣 - 採購決策一目了然
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            透過熱點矩陣，快速掌握全年各類原物料的產季高峰與低谷，協助您做出最佳採購決策。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Icon 圖例 */}
          <div className="flex items-center gap-6 text-xs bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>最佳</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 fill-emerald-500 text-emerald-500" />
              <span>適合</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span>偏高</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-orange-500">$$$</span>
              <span>高價</span>
            </div>
          </div>

          {/* 矩陣表格 */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: '180px repeat(12, minmax(56px, 1fr))',
                  minWidth: '852px', // 180 + 12*56
                }}
              >
                {/* 表頭：左上角（同時 sticky top 和 left） */}
                <div className="sticky top-0 left-0 z-30 bg-slate-50 border-b border-r border-gray-200 p-2 text-xs font-semibold min-h-[48px] flex items-center justify-center">
                  <div className="text-center leading-tight">
                    <div>原料</div>
                    <div className="text-gray-500 text-[10px]">/ 月份</div>
                  </div>
                </div>

                {/* 表頭：月份列（sticky top） */}
                {MONTHS.map((month) => (
                  <div
                    key={month}
                    className={`sticky top-0 z-20 bg-slate-50 border-b border-r border-gray-200 p-2 text-xs font-semibold text-center min-h-[48px] flex items-center justify-center ${
                      month === currentMonth ? 'bg-orange-50' : ''
                    }`}
                  >
                    {MONTH_NAMES[month - 1]}
                  </div>
                ))}

                {/* 資料行 */}
                {INGREDIENTS.map((ingredient) => (
                  <React.Fragment key={ingredient}>
                    {/* 原料欄（sticky left，背景要確保不透明） */}
                    <div className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-2 text-xs font-medium min-h-[48px] flex items-center">
                      {ingredient}
                    </div>

                    {/* 月份資料格 */}
                    {MONTHS.map((month) => {
                      const cell = MOCK_MATRIX_DATA[ingredient]?.[month] || {
                        level: 4 as MatrixCellLevel,
                        trend: 'up' as TrendDirection,
                      };
                      const iconData = getLevelIcon(cell.level);
                      const levelLabel = getLevelLabel(cell.level);

                      return (
                        <div
                          key={month}
                          className={`bg-white border-b border-r border-gray-200 p-2 flex items-center justify-center min-h-[48px] hover:bg-gray-50 transition-colors ${
                            month === currentMonth ? 'ring-1 ring-orange-300' : ''
                          }`}
                          title={`${ingredient} / ${month}月：${levelLabel}`}
                        >
                          {iconData.node}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* 本月最佳採購建議 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <TrendingUp className="w-4 h-4" />
              本月最佳採購
            </div>
            <div className="mt-2 text-xs text-green-600">
              {INGREDIENTS.filter((ing) => {
                const cell = MOCK_MATRIX_DATA[ing]?.[currentMonth];
                return cell?.level === 1 && cell?.hasStar;
              })
                .map((ing) => `${ing} / 價格波動`)
                .join('、') || '無特別推薦'}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

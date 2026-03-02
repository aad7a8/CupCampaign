"use client";

import React, { useMemo } from 'react';
import { Check, Circle, TrendingUp, DollarSign } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';

type MatrixCellLevel = 1 | 2 | 3 | 4;
type Level = 1 | 2 | 3 | 4;

interface MatrixCell {
  level: MatrixCellLevel;
  trend: 'up' | 'down' | 'stable';
  hasStar?: boolean;
}

interface ProcurementMatrixData {
  [ingredient: string]: {
    [month: number]: MatrixCell;
  };
}

interface ProcurementMonthSummaryProps {
  month: number; // 1-12
  matrix: ProcurementMatrixData;
  onIngredientClick?: (level: Level, ingredient: string) => void;
  selectedByLevel?: Record<Level, string | null>;
  showTitle?: boolean;
}

const INGREDIENTS = ['草莓', '芒果', '鳳梨', '葡萄', '檸檬', '百香果', '荔枝', '西瓜'];

export function ProcurementMonthSummary({
  month,
  matrix,
  onIngredientClick,
  selectedByLevel,
  showTitle = true,
}: ProcurementMonthSummaryProps) {
  // 计算当月的 buckets（分类）
  const buckets = useMemo(() => {
    const result: Record<Level, string[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
    };

    INGREDIENTS.forEach((ingredient) => {
      const cell = matrix[ingredient]?.[month];
      if (cell) {
        result[cell.level].push(ingredient);
      }
    });

    return result;
  }, [month, matrix]);

  return (
    <div className="space-y-3">
      {showTitle && (
        <p className="text-xs text-muted-foreground">
          本月採購分類（{month}月）
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Level 1: 最佳 */}
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold">最佳</span>
            </div>
            <span className="text-xs text-muted-foreground">({buckets[1].length})</span>
          </div>
          {buckets[1].length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {buckets[1].map((ingredient) => {
                const isSelected = selectedByLevel?.[1] === ingredient;
                const content = (
                  <Badge
                    variant={isSelected ? 'default' : 'outline'}
                    className={`text-xs ${
                      isSelected
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-white'
                    }`}
                  >
                    {ingredient}
                  </Badge>
                );
                return onIngredientClick ? (
                  <button
                    key={ingredient}
                    onClick={() => onIngredientClick(1, ingredient)}
                    className="cursor-pointer"
                  >
                    {content}
                  </button>
                ) : (
                  <span key={ingredient}>{content}</span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">本月無原料</p>
          )}
        </div>

        {/* Level 2: 適合 */}
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 fill-emerald-400 text-emerald-400" />
              <span className="text-sm font-semibold">適合</span>
            </div>
            <span className="text-xs text-muted-foreground">({buckets[2].length})</span>
          </div>
          {buckets[2].length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {buckets[2].map((ingredient) => {
                const isSelected = selectedByLevel?.[2] === ingredient;
                const content = (
                  <Badge
                    variant={isSelected ? 'default' : 'outline'}
                    className={`text-xs ${
                      isSelected
                        ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200'
                        : 'bg-white'
                    }`}
                  >
                    {ingredient}
                  </Badge>
                );
                return onIngredientClick ? (
                  <button
                    key={ingredient}
                    onClick={() => onIngredientClick(2, ingredient)}
                    className="cursor-pointer"
                  >
                    {content}
                  </button>
                ) : (
                  <span key={ingredient}>{content}</span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">本月無原料</p>
          )}
        </div>

        {/* Level 3: 偏高 */}
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold">偏高</span>
            </div>
            <span className="text-xs text-muted-foreground">({buckets[3].length})</span>
          </div>
          {buckets[3].length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {buckets[3].map((ingredient) => {
                const isSelected = selectedByLevel?.[3] === ingredient;
                const content = (
                  <Badge
                    variant={isSelected ? 'default' : 'outline'}
                    className={`text-xs ${
                      isSelected
                        ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'
                        : 'bg-white'
                    }`}
                  >
                    {ingredient}
                  </Badge>
                );
                return onIngredientClick ? (
                  <button
                    key={ingredient}
                    onClick={() => onIngredientClick(3, ingredient)}
                    className="cursor-pointer"
                  >
                    {content}
                  </button>
                ) : (
                  <span key={ingredient}>{content}</span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">本月無原料</p>
          )}
        </div>

        {/* Level 4: 高價 */}
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold">高價</span>
            </div>
            <span className="text-xs text-muted-foreground">({buckets[4].length})</span>
          </div>
          {buckets[4].length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {buckets[4].map((ingredient) => {
                const isSelected = selectedByLevel?.[4] === ingredient;
                const content = (
                  <Badge
                    variant={isSelected ? 'default' : 'outline'}
                    className={`text-xs ${
                      isSelected
                        ? 'bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200'
                        : 'bg-white'
                    }`}
                  >
                    {ingredient}
                  </Badge>
                );
                return onIngredientClick ? (
                  <button
                    key={ingredient}
                    onClick={() => onIngredientClick(4, ingredient)}
                    className="cursor-pointer"
                  >
                    {content}
                  </button>
                ) : (
                  <span key={ingredient}>{content}</span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">本月無原料</p>
          )}
        </div>
      </div>
    </div>
  );
}

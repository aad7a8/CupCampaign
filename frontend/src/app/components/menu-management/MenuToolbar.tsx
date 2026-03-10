import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

interface MenuToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  // 👇 新增 categories 屬性
  categories: string[];
}

export function MenuToolbar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  categories, // 👇 接收屬性
}: MenuToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      {/* 左側：搜尋與篩選 */}
      <div className="flex flex-1 gap-3 items-center w-full sm:w-auto">
        {/* 搜尋 */}
        <div className="relative flex-1 sm:flex-initial sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋飲品名稱…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 分類篩選 */}
        <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部分類" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分類</SelectItem>
            {/* 👇 動態渲染分類選項 */}
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 右側：狀態 Tabs 與排序 */}
      <div className="flex gap-3 items-center w-full sm:w-auto">
        {/* 狀態 Tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as 'all' | 'active' | 'inactive')}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="active">上架中</TabsTrigger>
            <TabsTrigger value="inactive">已下架</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 排序 */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">最新更新</SelectItem>
            <SelectItem value="price-desc">價格高→低</SelectItem>
            <SelectItem value="price-asc">價格低→高</SelectItem>
            <SelectItem value="name-asc">名稱 A→Z</SelectItem>
            <SelectItem value="name-desc">名稱 Z→A</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
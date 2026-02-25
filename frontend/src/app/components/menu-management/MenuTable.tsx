import React from 'react';
import { MoreHorizontal, Edit, Copy, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { MenuItem } from './types';

interface MenuTableProps {
  items: MenuItem[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectItem: (id: string, checked: boolean) => void;
  onEdit: (item: MenuItem) => void;
  onDuplicate: (item: MenuItem) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MenuTable({
  items,
  selectedIds,
  onSelectAll,
  onSelectItem,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onDelete,
}: MenuTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<MenuItem | null>(null);

  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const someSelected = items.some((item) => selectedIds.has(item.id));

  const handleDeleteClick = (item: MenuItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      onDelete(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getCategoryLabel = (item: MenuItem) => {
    // 如果是自訂分類，直接顯示 customCategory
    if (item.category === 'other' && item.customCategory) {
      return item.customCategory;
    }
    
    // 固定分類對應表
    const map: Record<string, string> = {
      classic_tea: '經典原萃（純茶系列）',
      milk_tea: '醇厚奶香（奶茶 / 拿鐵）',
      fruit_tea: '鮮調果茶（水果系列）',
      special: '特色特調（隱藏版 / 冰沙）',
      other: '其他',
      // 保留舊分類的相容性（向後相容）
      tea: '茶類',
      milk: '奶類',
      fruit: '果茶',
    };
    return map[item.category] || item.category;
  };

  if (items.length === 0) {
    return null; // 空狀態由父組件處理
  }

  return (
    <>
      <div className="border rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                  aria-label="全選"
                />
              </TableHead>
              <TableHead>飲品</TableHead>
              <TableHead>分類</TableHead>
              <TableHead className="text-right">售價</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>最後更新</TableHead>
              <TableHead className="text-right w-12">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={(checked) => onSelectItem(item.id, checked === true)}
                    aria-label={`選擇 ${item.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {getCategoryLabel(item)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${item.price}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.status === 'active'}
                      onCheckedChange={() => onToggleStatus(item.id)}
                      aria-label={`切換 ${item.name} 狀態`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.status === 'active' ? '上架中' : '已下架'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(item.updatedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center justify-center rounded-md hover:bg-accent p-1">
                        <MoreHorizontal className="w-4 h-4" />
                        <span className="sr-only">開啟選單</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Edit className="w-4 h-4 mr-2" />
                        編輯
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(item)}>
                        <Copy className="w-4 h-4 mr-2" />
                        複製
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus(item.id)}>
                        {item.status === 'active' ? '下架' : '上架'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDeleteClick(item)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        刪除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 刪除確認 Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除「{itemToDelete?.name}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

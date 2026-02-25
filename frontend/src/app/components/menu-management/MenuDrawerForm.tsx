import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/app/components/ui/drawer';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { MenuItem } from './types';

interface MenuDrawerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  onSave: (item: Omit<MenuItem, 'id' | 'updatedAt'> & { id?: string }) => void;
}

export function MenuDrawerForm({ open, onOpenChange, item, onSave }: MenuDrawerFormProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    category: 'classic_tea',
    customCategory: '',
    price: '',
    status: 'active' as 'active' | 'inactive',
  });

  const isEditing = !!item;

  useEffect(() => {
    if (item) {
      // 判斷既有資料是否為自訂分類（category 為 'other' 或有 customCategory）
      const isOtherCategory = item.category === 'other' || !!item.customCategory;
      setFormData({
        name: item.name,
        category: isOtherCategory ? 'other' : item.category,
        customCategory: item.customCategory || '',
        price: item.price.toString(),
        status: item.status,
      });
    } else {
      setFormData({
        name: '',
        category: 'classic_tea',
        customCategory: '',
        price: '',
        status: 'active',
      });
    }
  }, [item, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }
    
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      return;
    }

    // 驗證：如果分類為「其他」，則自訂分類必填
    if (formData.category === 'other' && !formData.customCategory.trim()) {
      return;
    }

    const saveData: Omit<MenuItem, 'id' | 'updatedAt'> & { id?: string } = {
      ...(isEditing && { id: item.id }),
      name: formData.name.trim(),
      category: formData.category,
      ...(formData.category === 'other' && { customCategory: formData.customCategory.trim() }),
      price,
      status: formData.status,
    };

    onSave(saveData);

    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="max-w-md ml-auto h-full">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>{isEditing ? '編輯飲品' : '新增飲品'}</DrawerTitle>
              <DrawerDescription>
                {isEditing ? '修改飲品資訊' : '請填寫飲品資訊'}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <button className="rounded-sm opacity-70 hover:opacity-100">
                <X className="w-4 h-4" />
                <span className="sr-only">關閉</span>
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* 名稱 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                名稱 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：珍珠奶茶"
                required
              />
            </div>

            {/* 分類 */}
            <div className="space-y-2">
              <Label htmlFor="category">分類</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  // 當切換到非「其他」時，清空自訂分類
                  setFormData({
                    ...formData,
                    category: value,
                    customCategory: value === 'other' ? formData.customCategory : '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic_tea">經典原萃（純茶系列）</SelectItem>
                  <SelectItem value="milk_tea">醇厚奶香（奶茶 / 拿鐵）</SelectItem>
                  <SelectItem value="fruit_tea">鮮調果茶（水果系列）</SelectItem>
                  <SelectItem value="special">特色特調（隱藏版 / 冰沙）</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 自訂分類（僅當選擇「其他」時顯示） */}
            {formData.category === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="customCategory">
                  自訂分類 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customCategory"
                  value={formData.customCategory}
                  onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                  placeholder="例如：期間限定、跨界聯名"
                  required
                />
              </div>
            )}

            {/* 售價 */}
            <div className="space-y-2">
              <Label htmlFor="price">
                售價 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                min="0"
                step="1"
                required
              />
            </div>

            {/* 狀態 */}
            <div className="space-y-2">
              <Label htmlFor="status">上架狀態</Label>
              <div className="flex items-center gap-3">
                <Switch
                  id="status"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, status: checked ? 'active' : 'inactive' })
                  }
                />
                <span className="text-sm text-muted-foreground">
                  {formData.status === 'active' ? '上架中' : '已下架'}
                </span>
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t">
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                style={{ backgroundColor: 'var(--df-accent)' }}
              >
                儲存
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

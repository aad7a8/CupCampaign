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
  // 👇 新增 categories 屬性
  categories: string[];
}

export function MenuDrawerForm({ open, onOpenChange, item, onSave, categories }: MenuDrawerFormProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    category: '',
    customCategory: '',
    price: '',
    status: 'active' as 'active' | 'inactive',
  });

  const isEditing = !!item;

  useEffect(() => {
    if (item) {
      // 編輯模式：直接使用既有的分類名稱
      setFormData({
        name: item.name,
        category: item.category,
        customCategory: '',
        price: item.price.toString(),
        status: item.status,
      });
    } else {
      // 新增模式：預設選擇動態分類的第一項（如果有的話）
      setFormData({
        name: '',
        category: categories.length > 0 ? categories[0] : '',
        customCategory: '',
        price: '',
        status: 'active',
      });
    }
  }, [item, open, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      return;
    }

    // 驗證：如果分類選擇「其他」，則自訂分類必填
    if (formData.category === 'other' && !formData.customCategory.trim()) {
      return;
    }

    // 👇 儲存時，如果選擇「其他」，直接把自訂分類作為真正的 category 存入資料庫
    const finalCategory = formData.category === 'other' ? formData.customCategory.trim() : formData.category;

    const saveData: Omit<MenuItem, 'id' | 'updatedAt'> & { id?: string } = {
      ...(isEditing && { id: item.id }),
      name: formData.name.trim(),
      category: finalCategory,
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
                  setFormData({
                    ...formData,
                    category: value,
                    customCategory: value === 'other' ? formData.customCategory : '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {/* 👇 動態渲染分類選項 */}
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  {/* 保留「其他」選項讓使用者能自由新增分類 */}
                  <SelectItem value="other">其他 (新增自訂分類)</SelectItem>
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
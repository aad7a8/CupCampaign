import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Upload, Package, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { MenuToolbar } from './menu-management/MenuToolbar';
import { MenuTable } from './menu-management/MenuTable';
import { MenuDrawerForm } from './menu-management/MenuDrawerForm';
import { MenuItem } from './menu-management/types';

export type { MenuItem };

const STORAGE_KEY = 'cupcampaign_menu_items';

type ImportItem = {
  name: string;
  category: string;
  price: number;
  status: 'active' | 'inactive';
};

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

export function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState('updated');

  // 1. 將 fetch 邏輯獨立出來，方便 CRUD 操作後重新呼叫
  const fetchMenuItems = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const resJson = await response.json();

      if (resJson.status === 'success' && resJson.data) {
        const items = resJson.data.map((item: any) => ({
          id: String(item.id),
          name: item.name,
          category: item.category,
          price: item.price,
          status: 'active',
          updatedAt: item.scraped_at ? new Date(item.scraped_at.replace(' ', 'T')) : new Date(),
        }));
        setMenuItems(items);
      } else {
        toast.error(resJson.message || '無法取得菜單資料');
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('網路連線錯誤，無法取得菜單');
      setMenuItems([]);
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(menuItems.map((item) => item.category).filter(Boolean));
    return Array.from(categories);
  }, [menuItems]);

  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...menuItems];

    if (searchQuery.trim()) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated': return b.updatedAt.getTime() - a.updatedAt.getTime();
        case 'price-desc': return b.price - a.price;
        case 'price-asc': return a.price - b.price;
        case 'name-asc': return a.name.localeCompare(b.name, 'zh-TW');
        case 'name-desc': return b.name.localeCompare(a.name, 'zh-TW');
        default: return 0;
      }
    });

    return filtered;
  }, [menuItems, searchQuery, categoryFilter, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const active = menuItems.filter((item) => item.status === 'active').length;
    const inactive = menuItems.filter((item) => item.status === 'inactive').length;
    return { active, inactive, total: menuItems.length };
  }, [menuItems]);

  const handleAdd = () => {
    setEditingItem(null);
    setDrawerOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  };

  // 2. 串接真實的 新增 (POST) 與 更新 (PUT) API
  const handleSave = async (data: Omit<MenuItem, 'id' | 'updatedAt'> & { id?: string }) => {
    try {
      if (data.id) {
        // 更新 (PUT)
        const res = await fetch(`/api/admin/products/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();

        if (result.status === 'success') {
          toast.success('已更新品項');
        } else {
          toast.error(result.message || '更新失敗');
        }
      } else {
        // 新增 (POST) - 注意後端要求的是包含 products 的陣列格式
        const res = await fetch(`/api/admin/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            products: [{ name: data.name, category: data.category, price: data.price }]
          }),
        });
        const result = await res.json();

        if (result.status === 'success') {
          toast.success('已新增品項');
        } else {
          toast.error(result.message || '新增失敗');
        }
      }

      // 無論新增或編輯成功，重新抓取最新資料
      await fetchMenuItems();

    } catch (error) {
      console.error('Save error:', error);
      toast.error('系統連線錯誤');
    } finally {
      setDrawerOpen(false);
      setEditingItem(null);
    }
  };

  // 3. 串接真實的 複製 (POST) API
  const handleDuplicate = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{ name: `${item.name} (複製)`, category: item.category, price: item.price }]
        }),
      });
      const result = await res.json();

      if (result.status === 'success') {
        toast.success('已複製');
        await fetchMenuItems();
      } else {
        toast.error(result.message || '複製失敗');
      }
    } catch (e) {
      toast.error('系統連線錯誤');
    }
  };

  const handleToggleStatus = (id: string) => {
    // 註：資料庫目前未包含 status 欄位，此處先維持前端本地狀態切換，不打 API。
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'active' ? 'inactive' : 'active', updatedAt: new Date() }
          : item
      )
    );
  };

  // 4. 串接真實的 刪除 (DELETE) API
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await res.json();

      if (result.status === 'success') {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success('已刪除');
        await fetchMenuItems(); // 刪除後重新抓取資料
      } else {
        toast.error(result.message || '刪除失敗');
      }
    } catch (error) {
      toast.error('刪除時發生連線錯誤');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredAndSortedItems.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // 5. 確保批次匯入打真實的 POST API
  const bulkImportMenuItems = async (
    items: ImportItem[]
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    try {
      const res = await fetch(`/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 將匯入的項目對應到後端需要的格式
          products: items.map(i => ({ name: i.name, category: i.category, price: i.price }))
        }),
      });

      const result = await res.json();
      if (result.status === 'success') {
        await fetchMenuItems(); // 匯入成功後更新列表
        return { success: items.length, failed: 0, errors: [] };
      } else {
        return { success: 0, failed: items.length, errors: [result.message] };
      }
    } catch (e) {
      return { success: 0, failed: items.length, errors: ['系統連線異常'] };
    }
  };

  const parseExcelAndImport = async (file: File) => {
    try {
      setIsImporting(true);

      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];

      if (rows.length === 0) {
        toast.error('Excel 檔案為空');
        return;
      }

      const fieldMapping: Record<string, string> = {
        飲品: 'name', name: 'name', 分類: 'category', category: 'category', 售價: 'price', price: 'price', 狀態: 'status', status: 'status',
      };

      const headers = Object.keys(rows[0]);
      const headerMap: Record<string, string> = {};
      headers.forEach((header) => {
        const normalizedHeader = header.trim();
        if (fieldMapping[normalizedHeader]) {
          headerMap[fieldMapping[normalizedHeader]] = normalizedHeader;
        }
      });

      const requiredFields = ['name', 'category', 'price'];
      const missingFields = requiredFields.filter((field) => !headerMap[field]);

      if (missingFields.length > 0) {
        const missingFieldNames = missingFields.map((f) => {
          if (f === 'name') return '飲品/name';
          if (f === 'category') return '分類/category';
          if (f === 'price') return '售價/price';
          return f;
        }).join('、');
        toast.error(`缺少必填欄位：${missingFieldNames}`);
        return;
      }

      const validationErrors: ValidationError[] = [];
      const validItems: ImportItem[] = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const errors: string[] = [];

        const nameValue = row[headerMap.name]?.toString().trim() || '';
        const categoryValue = row[headerMap.category]?.toString().trim() || '';
        const priceValue = row[headerMap.price]?.toString().trim() || '';
        const statusValue = row[headerMap.status]?.toString().trim() || '';

        if (!nameValue) errors.push('飲品名稱');
        if (!categoryValue) errors.push('分類');
        if (!priceValue) errors.push('售價');

        let price = 0;
        if (priceValue) {
          const parsedPrice = parseFloat(priceValue);
          if (isNaN(parsedPrice) || parsedPrice <= 0) {
            errors.push('售價必須為大於 0 的數字');
          } else {
            price = parsedPrice;
          }
        }

        if (errors.length > 0) {
          validationErrors.push({ row: rowNumber, field: errors.join('、'), message: `第 ${rowNumber} 行：缺少或無效的欄位（${errors.join('、')}）` });
          return;
        }

        let status: 'active' | 'inactive' = 'active';
        if (statusValue) {
          const normalizedStatus = statusValue.toLowerCase().trim();
          if (normalizedStatus === 'active' || normalizedStatus === '上架中' || normalizedStatus === '上架') status = 'active';
          else if (normalizedStatus === 'inactive' || normalizedStatus === '下架' || normalizedStatus === '已下架') status = 'inactive';
        }

        validItems.push({ name: nameValue, category: categoryValue, price, status });
      });

      if (validationErrors.length > 0) {
        toast.error(`Excel 檔案驗證失敗，請修正後再重新匯入。`, { duration: 10000 });
        return;
      }

      if (validItems.length === 0) {
        toast.error('沒有有效的資料可匯入');
        return;
      }

      const result = await bulkImportMenuItems(validItems);

      if (result.failed === 0) {
        toast.success(`匯入完成：成功 ${result.success} 筆`);
      } else {
        toast.warning(`匯入完成：成功 ${result.success} 筆、失敗 ${result.failed} 筆`, { duration: 8000 });
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('匯入錯誤:', error);
      toast.error(error instanceof Error ? `匯入失敗：${error.message}` : '匯入失敗，請檢查檔案格式');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      toast.error('只支援 Excel 檔（.xlsx / .xls）');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    await parseExcelAndImport(file);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1 text-gray-800">菜單管理</h2>
          <p className="text-sm text-muted-foreground">管理飲品、售價與上架狀態</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
          <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
            {isImporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />匯入中…</> : <><Upload className="w-4 h-4 mr-2" />匯入</>}
          </Button>
          <Button onClick={handleAdd} style={{ backgroundColor: 'var(--df-accent)' }}>
            <Plus className="w-4 h-4 mr-2" />新增飲品
          </Button>
        </div>
      </div>

      {menuItems.length > 0 && (
        <div className="flex gap-3">
          <Badge variant="secondary" className="px-3 py-1.5 text-sm">
            上架中 <span className="ml-1 font-semibold">{stats.active}</span>
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-sm">
            已下架 <span className="ml-1 font-semibold">{stats.inactive}</span>
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-sm">
            總飲品 <span className="ml-1 font-semibold">{stats.total}</span>
          </Badge>
        </div>
      )}

      {menuItems.length > 0 && (
        <MenuToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          categories={uniqueCategories}
        />
      )}

      {filteredAndSortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border rounded-lg">
          {menuItems.length === 0 ? (
            <>
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">尚無飲品</h3>
              <p className="text-sm text-muted-foreground mb-6">開始新增您的第一個飲品吧</p>
              <Button onClick={handleAdd} style={{ backgroundColor: 'var(--df-accent)' }}>
                <Plus className="w-4 h-4 mr-2" />新增飲品
              </Button>
            </>
          ) : (
            <>
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">找不到符合條件的飲品</h3>
              <p className="text-sm text-muted-foreground">請嘗試調整搜尋或篩選條件</p>
            </>
          )}
        </div>
      ) : (
        <div className="max-w-[1400px] mx-auto">
          <MenuTable
            items={filteredAndSortedItems}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectItem={handleSelectItem}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        </div>
      )}

      <MenuDrawerForm
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={editingItem}
        onSave={handleSave}
        categories={uniqueCategories}
      />
    </div>
  );
}
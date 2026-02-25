import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Upload, Package, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { MenuToolbar } from './menu-management/MenuToolbar';
import { MenuTable } from './menu-management/MenuTable';
import { MenuDrawerForm } from './menu-management/MenuDrawerForm';
import { MenuItem } from './menu-management/types';

// 重新導出類型以供其他模組使用
export type { MenuItem };

// localStorage key
const STORAGE_KEY = 'cupcampaign_menu_items';

// 匯入項目類型
type ImportItem = {
  name: string;
  category: string;
  price: number;
  status: 'active' | 'inactive';
};

// 驗證錯誤類型
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

  // Filter & Sort 狀態
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState('updated');

  // 從 localStorage 載入資料
  // 新用戶註冊後，如果沒有資料，應該顯示空狀態而不是預設資料
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // 將 updatedAt 字串轉回 Date
          const items = parsed.map((item: any) => ({
            ...item,
            updatedAt: new Date(item.updatedAt),
          }));
          // 如果有保存的資料，使用保存的資料；否則顯示空狀態
          setMenuItems(items);
        } catch {
          // 解析失敗時顯示空狀態
          setMenuItems([]);
        }
      } else {
        // 沒有保存的資料時顯示空狀態（新用戶）
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      // 發生錯誤時顯示空狀態
      setMenuItems([]);
    }
  }, []);

  // 儲存到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menuItems));
  }, [menuItems]);

  // 過濾與排序後的資料
  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...menuItems];

    // 搜尋
    if (searchQuery.trim()) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 分類篩選
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    // 狀態篩選
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        case 'price-desc':
          return b.price - a.price;
        case 'price-asc':
          return a.price - b.price;
        case 'name-asc':
          return a.name.localeCompare(b.name, 'zh-TW');
        case 'name-desc':
          return b.name.localeCompare(a.name, 'zh-TW');
        default:
          return 0;
      }
    });

    return filtered;
  }, [menuItems, searchQuery, categoryFilter, statusFilter, sortBy]);

  // 統計資料
  const stats = useMemo(() => {
    const active = menuItems.filter((item) => item.status === 'active').length;
    const inactive = menuItems.filter((item) => item.status === 'inactive').length;
    return {
      active,
      inactive,
      total: menuItems.length,
    };
  }, [menuItems]);

  // 處理新增
  const handleAdd = () => {
    setEditingItem(null);
    setDrawerOpen(true);
  };

  // 處理編輯
  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  };

  // 處理儲存（新增或更新）
  const handleSave = (data: Omit<MenuItem, 'id' | 'updatedAt'> & { id?: string }) => {
    if (data.id) {
      // 更新
      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === data.id
            ? { ...data, id: data.id, updatedAt: new Date() }
            : item
        )
      );
      toast.success('已儲存');
    } else {
      // 新增
      const newItem: MenuItem = {
        ...data,
        id: Date.now().toString(),
        updatedAt: new Date(),
      };
      setMenuItems((prev) => [...prev, newItem]);
      toast.success('已儲存');
    }
    setDrawerOpen(false);
    setEditingItem(null);
  };

  // 處理複製
  const handleDuplicate = (item: MenuItem) => {
    const duplicated: MenuItem = {
      ...item,
      id: Date.now().toString(),
      name: `${item.name} (複製)`,
      updatedAt: new Date(),
    };
    setMenuItems((prev) => [...prev, duplicated]);
    toast.success('已複製');
  };

  // 處理切換狀態
  const handleToggleStatus = (id: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === 'active' ? 'inactive' : 'active',
              updatedAt: new Date(),
            }
          : item
      )
    );
  };

  // 處理刪除
  const handleDelete = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success('已刪除');
  };

  // 處理選擇
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

  // 處理匯入按鈕點擊
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // 批次匯入 API（模擬後端 API）
  const bulkImportMenuItems = async (
    items: ImportItem[]
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    // 模擬 API 延遲
    await new Promise((resolve) => setTimeout(resolve, 500));

    const errors: string[] = [];
    const successfulItems: MenuItem[] = [];

    // 使用 Promise.allSettled 批次處理
    const results = await Promise.allSettled(
      items.map(async (item, index) => {
        try {
          // 模擬 API 呼叫（實際應該呼叫後端）
          // 這裡直接更新 localStorage，因為專案目前使用 localStorage
          const newItem: MenuItem = {
            ...item,
            id: Date.now().toString() + index.toString() + Math.random().toString(36).substr(2, 9),
            updatedAt: new Date(),
          };

          // 模擬可能的失敗情況（例如名稱重複）
          if (Math.random() < 0.05) {
            // 5% 機率失敗（模擬）
            throw new Error(`飲品 "${item.name}" 匯入失敗`);
          }

          return newItem;
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : `匯入 "${item.name}" 時發生錯誤`;
          errors.push(errorMsg);
          throw error;
        }
      })
    );

    // 收集成功的項目
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        successfulItems.push(result.value);
      }
    });

    // 一次性更新狀態
    if (successfulItems.length > 0) {
      setMenuItems((prev) => [...prev, ...successfulItems]);
    }

    return {
      success: successfulItems.length,
      failed: errors.length,
      errors,
    };
  };

  // 解析 Excel 並匯入
  const parseExcelAndImport = async (file: File) => {
    try {
      setIsImporting(true);

      // 讀取檔案為 ArrayBuffer
      const buffer = await file.arrayBuffer();

      // 解析 Excel
      const wb = XLSX.read(buffer, { type: 'array' });

      // 讀取第一個工作表
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];

      // 轉換為 JSON
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];

      if (rows.length === 0) {
        toast.error('Excel 檔案為空');
        return;
      }

      // 欄位 mapping（支援中英欄位）
      const fieldMapping: Record<string, string> = {
        飲品: 'name',
        name: 'name',
        分類: 'category',
        category: 'category',
        售價: 'price',
        price: 'price',
        狀態: 'status',
        status: 'status',
      };

      // 取得第一列作為欄位名稱
      const headers = Object.keys(rows[0]);
      const headerMap: Record<string, string> = {};
      headers.forEach((header) => {
        const normalizedHeader = header.trim();
        if (fieldMapping[normalizedHeader]) {
          headerMap[fieldMapping[normalizedHeader]] = normalizedHeader;
        }
      });

      // 驗證必填欄位是否存在
      const requiredFields = ['name', 'category', 'price'];
      const missingFields = requiredFields.filter(
        (field) => !headerMap[field]
      );

      if (missingFields.length > 0) {
        const missingFieldNames = missingFields
          .map((f) => {
            if (f === 'name') return '飲品/name';
            if (f === 'category') return '分類/category';
            if (f === 'price') return '售價/price';
            return f;
          })
          .join('、');
        toast.error(`缺少必填欄位：${missingFieldNames}`);
        return;
      }

      // 驗證和轉換資料
      const validationErrors: ValidationError[] = [];
      const validItems: ImportItem[] = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2; // Excel 行號（第一列是標題）
        const errors: string[] = [];

        // 取得欄位值
        const nameValue = row[headerMap.name]?.toString().trim() || '';
        const categoryValue = row[headerMap.category]?.toString().trim() || '';
        const priceValue = row[headerMap.price]?.toString().trim() || '';
        const statusValue = row[headerMap.status]?.toString().trim() || '';

        // 驗證必填欄位
        if (!nameValue) {
          errors.push('飲品名稱');
        }
        if (!categoryValue) {
          errors.push('分類');
        }
        if (!priceValue) {
          errors.push('售價');
        }

        // 驗證價格
        let price = 0;
        if (priceValue) {
          const parsedPrice = parseFloat(priceValue);
          if (isNaN(parsedPrice) || parsedPrice <= 0) {
            errors.push('售價必須為大於 0 的數字');
          } else {
            price = parsedPrice;
          }
        }

        // 如果有錯誤，記錄
        if (errors.length > 0) {
          validationErrors.push({
            row: rowNumber,
            field: errors.join('、'),
            message: `第 ${rowNumber} 行：缺少或無效的欄位（${errors.join('、')}）`,
          });
          return;
        }

        // 處理狀態欄位
        let status: 'active' | 'inactive' = 'active';
        if (statusValue) {
          const normalizedStatus = statusValue.toLowerCase().trim();
          if (
            normalizedStatus === 'active' ||
            normalizedStatus === '上架中' ||
            normalizedStatus === '上架'
          ) {
            status = 'active';
          } else if (
            normalizedStatus === 'inactive' ||
            normalizedStatus === '下架' ||
            normalizedStatus === '已下架'
          ) {
            status = 'inactive';
          }
        }

        // 加入有效項目
        validItems.push({
          name: nameValue,
          category: categoryValue,
          price,
          status,
        });
      });

      // 如果有驗證錯誤，顯示錯誤摘要
      if (validationErrors.length > 0) {
        const errorCount = validationErrors.length;
        const displayErrors = validationErrors.slice(0, 10);
        const remainingCount = errorCount - 10;

        let errorMessage = `Excel 檔案驗證失敗，共 ${errorCount} 筆錯誤：\n\n`;
        errorMessage += displayErrors.map((e) => e.message).join('\n');
        if (remainingCount > 0) {
          errorMessage += `\n\n...還有 ${remainingCount} 筆錯誤`;
        }
        errorMessage += '\n\n請修正 Excel 檔案後再重新匯入。';

        toast.error(errorMessage, {
          duration: 10000,
        });
        return;
      }

      if (validItems.length === 0) {
        toast.error('沒有有效的資料可匯入');
        return;
      }

      // 呼叫批次匯入 API
      const result = await bulkImportMenuItems(validItems);

      // 顯示結果
      if (result.failed === 0) {
        toast.success(`匯入完成：成功 ${result.success} 筆`);
      } else {
        const errorDetails =
          result.errors.length > 0
            ? `\n\n錯誤詳情：\n${result.errors.slice(0, 5).join('\n')}${
                result.errors.length > 5
                  ? `\n...還有 ${result.errors.length - 5} 筆錯誤`
                  : ''
              }`
            : '';
        toast.warning(
          `匯入完成：成功 ${result.success} 筆、失敗 ${result.failed} 筆${errorDetails}`,
          {
            duration: 8000,
          }
        );
      }

      // 清空檔案輸入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('匯入錯誤:', error);
      toast.error(
        error instanceof Error
          ? `匯入失敗：${error.message}`
          : '匯入失敗，請檢查檔案格式'
      );
    } finally {
      setIsImporting(false);
    }
  };

  // 處理檔案選擇
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 驗證副檔名
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      toast.error('只支援 Excel 檔（.xlsx / .xls）');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // 解析並匯入
    await parseExcelAndImport(file);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1 text-gray-800">菜單管理</h2>
          <p className="text-sm text-muted-foreground">管理飲品、售價與上架狀態</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                匯入中…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                匯入
              </>
            )}
          </Button>
          <Button
            onClick={handleAdd}
            style={{ backgroundColor: 'var(--df-accent)' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            新增飲品
          </Button>
        </div>
      </div>

      {/* 統計 Chips */}
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

      {/* Toolbar */}
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
        />
      )}

      {/* Table 或空狀態 */}
      {filteredAndSortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border rounded-lg">
          {menuItems.length === 0 ? (
            <>
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">尚無飲品</h3>
              <p className="text-sm text-muted-foreground mb-6">
                開始新增您的第一個飲品吧
              </p>
              <Button
                onClick={handleAdd}
                style={{ backgroundColor: 'var(--df-accent)' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                新增飲品
              </Button>
            </>
          ) : (
            <>
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">找不到符合條件的飲品</h3>
              <p className="text-sm text-muted-foreground">
                請嘗試調整搜尋或篩選條件
              </p>
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

      {/* Drawer Form */}
      <MenuDrawerForm
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={editingItem}
        onSave={handleSave}
      />
    </div>
  );
}

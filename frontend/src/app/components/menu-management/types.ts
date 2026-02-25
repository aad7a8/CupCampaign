// 菜單項目類型定義
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  customCategory?: string; // 當 category 為 'other' 時使用
  price: number;
  status: 'active' | 'inactive';
  updatedAt: Date;
}

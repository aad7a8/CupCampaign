import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Plus, Trash2, Save, Coffee, Tags } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

export interface MenuItem {
  id: number;
  category: string;
  name: string;
  price: string;
  ingredients: string;
}

interface BrandSetupPageProps {
  onComplete: (brandData: { items: MenuItem[] }) => void;
}

export function BrandSetupPage({ onComplete }: BrandSetupPageProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState<MenuItem[]>([
    { id: Date.now(), category: '', name: '', price: '', ingredients: '' }
  ]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), category: '', name: '', price: '', ingredients: '' }]);
  };

  const handleDeleteItem = (id: number) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: number, field: keyof MenuItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSave = () => {
    if (items.some(i => !i.name.trim())) { alert(t('alerts.itemNameRequired')); return; }

    onComplete({ items });
  };

  // --- 樣式設定變數 ---
  const INPUT_STYLE = "h-10 w-full bg-slate-100 border-0 focus-visible:ring-2 focus-visible:ring-blue-500/20 text-slate-900 placeholder:text-slate-400";
  const SELECT_STYLE = "h-10 w-full bg-slate-100 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-700";

  return (
    <div className="min-h-screen p-8 flex justify-center items-start bg-slate-50 overflow-y-auto">
      <Card className="w-full max-w-5xl shadow-xl border-0">

        <CardHeader className="rounded-t-lg text-white" style={{ backgroundColor: '#3A5A78' }}>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Coffee className="w-6 h-6" />
                {t('brandSetup.title')}
              </CardTitle>
              <CardDescription className="text-slate-300 opacity-90">
                {t('brandSetup.subtitle')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 px-8 pb-8 space-y-10">

          {/* 菜單建置 */}
          <section className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-600 rounded-full" />
                <h3 className="font-bold text-lg text-slate-800">{t('brandSetup.section2')}</h3>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50" onClick={handleAddItem}>
                  <Plus className="w-4 h-4" /> {t('brandSetup.addItem')}
                </Button>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
              <Table className="table-fixed w-full">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[15%] font-bold text-slate-700">{t('brandSetup.category')}</TableHead>
                    <TableHead className="w-[25%] font-bold text-slate-700">{t('brandSetup.itemName')}</TableHead>
                    <TableHead className="w-[15%] font-bold text-slate-700">{t('brandSetup.price')}</TableHead>
                    <TableHead className="w-[40%] font-bold text-blue-700 bg-blue-50/50">
                      <div className="flex items-center gap-2">
                        <Tags className="w-4 h-4" /> {t('brandSetup.ingredients')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell className="p-2 align-middle">
                        <Input
                          value={item.category}
                          onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                          className={INPUT_STYLE}
                          placeholder={t('brandSetup.categoryPlaceholder')}
                        />
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        <Input
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          className={`${INPUT_STYLE} font-medium ${!item.name.trim() ? 'ring-2 ring-red-100 bg-red-50' : ''}`}
                          placeholder={t('brandSetup.itemPlaceholder')}
                        />
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        <Input
                          value={item.price}
                          onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                          type="number"
                          className={INPUT_STYLE}
                          placeholder={t('brandSetup.pricePlaceholder')}
                        />
                      </TableCell>

                      <TableCell className="bg-blue-50/10 p-2 align-middle">
                        <Input
                          value={item.ingredients}
                          onChange={(e) => handleItemChange(item.id, 'ingredients', e.target.value)}
                          className={INPUT_STYLE}
                          placeholder={t('brandSetup.ingredientsPlaceholder')}
                        />
                      </TableCell>

                      <TableCell className="p-2 align-middle text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              className="h-12 px-10 text-lg font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: '#C4A484', color: 'white' }}
            >
              <Save className="w-5 h-5 mr-2" />
              {t('brandSetup.saveButton')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
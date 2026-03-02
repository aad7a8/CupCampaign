import { HistoryRecord } from '../types';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import { Button } from '@/app/components/ui/button';

interface HistoryDrawerProps {
  record: HistoryRecord | null;
  open: boolean;
  onClose: () => void;
  onCopy: (record: HistoryRecord) => void;
}

export function HistoryDrawer({ record, open, onClose }: HistoryDrawerProps) {
  if (!record) return null;

  // 取得完整文案（優先順序：copyContent > caption > content > copyText）
  const fullText = record.copyContent ?? 
                   (record as any).caption ?? 
                   (record as any).content ?? 
                   (record as any).copyText ?? 
                   '';

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>文案</DrawerTitle>
        </DrawerHeader>

        <div className="px-6 pb-6 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="whitespace-pre-wrap text-sm leading-6 text-gray-800 select-text">
              {fullText || '此貼文沒有文案內容'}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 border-t pt-4 flex justify-end">
          <DrawerClose asChild>
            <Button variant="outline">關閉</Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

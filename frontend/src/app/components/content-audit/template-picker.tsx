import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';

export interface Template {
  id: string;
  name: string;
  aspectRatios: string[];
  textPlacement: 'top' | 'middle' | 'bottom';
  safeMargin: number;
}

export const TEMPLATES: Template[] = [
  {
    id: 'product-only',
    name: '純產品',
    aspectRatios: ['1:1', '4:5'],
    textPlacement: 'bottom',
    safeMargin: 0.1,
  },
  {
    id: 'product-with-title',
    name: '產品+標題字',
    aspectRatios: ['1:1', '4:5', '9:16'],
    textPlacement: 'top',
    safeMargin: 0.15,
  },
  {
    id: 'banner',
    name: '活動 Banner',
    aspectRatios: ['1.91:1', '1:1'],
    textPlacement: 'bottom',
    safeMargin: 0.2,
  },
  {
    id: 'minimal',
    name: '極簡風格',
    aspectRatios: ['1:1', '4:5'],
    textPlacement: 'bottom',
    safeMargin: 0.05,
  },
  {
    id: 'vibrant',
    name: '活力風格',
    aspectRatios: ['1:1', '9:16'],
    textPlacement: 'top',
    safeMargin: 0.1,
  },
];

interface TemplatePickerProps {
  selectedTemplate: string;
  onTemplateChange: (templateId: string) => void;
}

export function TemplatePicker({ selectedTemplate, onTemplateChange }: TemplatePickerProps) {
  return (
    <div className="space-y-2">
      <Label>範本選擇</Label>
      <Select value={selectedTemplate} onValueChange={onTemplateChange}>
        <SelectTrigger>
          <SelectValue placeholder="選擇範本" />
        </SelectTrigger>
        <SelectContent>
          {TEMPLATES.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedTemplate && (
        <p className="text-xs text-muted-foreground">
          範本：{TEMPLATES.find(t => t.id === selectedTemplate)?.name}
        </p>
      )}
    </div>
  );
}

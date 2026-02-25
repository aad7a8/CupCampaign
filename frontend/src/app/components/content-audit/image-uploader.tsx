import { useRef, useState } from 'react';
import { Upload, AlertTriangle, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';

interface ImageMeta {
  width: number;
  height: number;
  size: number;
}

interface ImageUploaderProps {
  value?: string | null;
  onImageUpload: (file: File, preview: string, meta: ImageMeta) => void;
  onClear?: () => void;
}

export function ImageUploader({ value, onImageUpload, onClear }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [quality, setQuality] = useState<{
    hasLowResolution: boolean;
    isOversized: boolean;
    meta: ImageMeta | null;
  } | null>(null);

  const validateImage = (file: File): Promise<{ meta: ImageMeta; hasLowResolution: boolean; isOversized: boolean }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const meta = {
            width: img.width,
            height: img.height,
            size: file.size,
          };
          resolve({
            meta,
            hasLowResolution: img.width < 1024 || img.height < 1024,
            isOversized: file.size > 10 * 1024 * 1024, // 10MB
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('請上傳圖片檔案');
      return;
    }

    const validation = await validateImage(file);
    setQuality({
      hasLowResolution: validation.hasLowResolution,
      isOversized: validation.isOversized,
      meta: validation.meta,
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      onImageUpload(file, reader.result as string, validation.meta);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    }
    setQuality(null);
  };

  const handleReplace = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label>產品照片上傳</Label>
      
      {value ? (
        // Image Preview Mode
        <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden aspect-square bg-gray-50 group">
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleReplace}
              className="bg-white/95 hover:bg-white shadow-md"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              更換圖片
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleClear}
              className="bg-white/95 hover:bg-white shadow-md text-red-600 hover:text-red-700 border-red-300"
            >
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : (
        // Dropzone Mode
        <div
          className={cn(
            "border-2 border-dashed rounded-lg transition-colors cursor-pointer min-h-[280px] flex items-center justify-center",
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center text-center p-6">
            <Upload className="w-8 h-8 mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-1">
              {isDragging ? '放開以上傳' : '點擊或拖曳上傳圖片'}
            </p>
            <p className="text-xs text-gray-400">
              支援 JPG、PNG、WEBP
            </p>
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="text-xs text-muted-foreground">
        <p>• 建議：背景單純、解析度至少 1024px、避免水印</p>
      </div>

      {/* Quality Warnings */}
      {quality && (
        <div className="space-y-2">
          {quality.hasLowResolution && (
            <Badge variant="outline" className="text-orange-600 border-orange-600 w-full justify-start">
              <AlertTriangle className="w-3 h-3 mr-1" />
              解析度偏低 ({quality.meta?.width}×{quality.meta?.height})，可能影響生成品質
            </Badge>
          )}
          {quality.isOversized && (
            <Badge variant="outline" className="text-orange-600 border-orange-600 w-full justify-start">
              <AlertTriangle className="w-3 h-3 mr-1" />
              檔案過大 ({((quality.meta?.size || 0) / 1024 / 1024).toFixed(2)}MB)
            </Badge>
          )}
          {!quality.hasLowResolution && !quality.isOversized && (
            <Badge variant="outline" className="text-green-600 border-green-600 w-full justify-start">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              圖片品質良好
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
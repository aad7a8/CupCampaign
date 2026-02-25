import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/components/ui/utils';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

export type GenerationStatus = 'idle' | 'queued' | 'generating' | 'done';

export interface GeneratedImage {
  id: string;
  url: string;
}

type Stage = 'waiting_input' | 'copy_generating' | 'copy_ready' | 'image_generating' | 'done';

interface GeneratedGalleryProps {
  uploadedImage: string | null;
  generatedImages: GeneratedImage[];
  selectedImage: string | null;
  generationStatus: GenerationStatus;
  generationProgress: number;
  onSelectImage: (imageId: string) => void;
  onRegenerate: () => void;
  stage?: Stage;
}

// Mock 生成圖片：使用 Canvas 對原圖做簡單變化
export function generateMockImages(originalImageUrl: string): Promise<GeneratedImage[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas1 = document.createElement('canvas');
      const canvas2 = document.createElement('canvas');
      const canvas3 = document.createElement('canvas');
      const ctx1 = canvas1.getContext('2d')!;
      const ctx2 = canvas2.getContext('2d')!;
      const ctx3 = canvas3.getContext('2d')!;

      const width = img.width;
      const height = img.height;

      [canvas1, canvas2, canvas3].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
      });

      // Variant 1: 亮度/對比調整
      ctx1.drawImage(img, 0, 0);
      const imageData1 = ctx1.getImageData(0, 0, width, height);
      for (let i = 0; i < imageData1.data.length; i += 4) {
        imageData1.data[i] = Math.min(255, imageData1.data[i] * 1.1); // R
        imageData1.data[i + 1] = Math.min(255, imageData1.data[i + 1] * 1.1); // G
        imageData1.data[i + 2] = Math.min(255, imageData1.data[i + 2] * 1.1); // B
      }
      ctx1.putImageData(imageData1, 0, 0);

      // Variant 2: 輕微模糊 + 漸層 overlay
      ctx2.drawImage(img, 0, 0);
      ctx2.filter = 'blur(1px)';
      ctx2.drawImage(img, 0, 0);
      ctx2.filter = 'none';
      const gradient = ctx2.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(255, 182, 193, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 192, 203, 0.1)');
      ctx2.fillStyle = gradient;
      ctx2.fillRect(0, 0, width, height);

      // Variant 3: 銳化 + 不同裁切（中心裁切 90%）
      const cropSize = Math.min(width, height) * 0.9;
      const cropX = (width - cropSize) / 2;
      const cropY = (height - cropSize) / 2;
      canvas3.width = cropSize;
      canvas3.height = cropSize;
      ctx3.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);
      const imageData3 = ctx3.getImageData(0, 0, cropSize, cropSize);
      // 簡單銳化
      for (let i = 0; i < imageData3.data.length; i += 4) {
        imageData3.data[i] = Math.min(255, imageData3.data[i] * 1.05);
        imageData3.data[i + 1] = Math.min(255, imageData3.data[i + 1] * 1.05);
        imageData3.data[i + 2] = Math.min(255, imageData3.data[i + 2] * 1.05);
      }
      ctx3.putImageData(imageData3, 0, 0);

      resolve([
        { id: '1', url: canvas1.toDataURL() },
        { id: '2', url: canvas2.toDataURL() },
        { id: '3', url: canvas3.toDataURL() },
      ]);
    };
    img.src = originalImageUrl;
  });
}

export function GeneratedGallery({
  uploadedImage,
  generatedImages,
  selectedImage,
  generationStatus,
  generationProgress,
  onSelectImage,
  onRegenerate,
  stage = 'waiting_input',
}: GeneratedGalleryProps) {
  return (
    <div>
      {/* Generated Images - Always visible at top */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">生成結果</h4>
          {stage === 'done' && generatedImages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onRegenerate}>
              重新生成
            </Button>
          )}
        </div>

        {/* waiting_input: Show placeholder */}
        {stage === 'waiting_input' && (
          <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg">
            <div className="space-y-2">
              <div className="text-gray-400">等待生成</div>
              <div className="text-xs">請先上傳圖片、選擇產品和範本，然後點擊「AI 產生圖」</div>
            </div>
          </div>
        )}

        {/* copy_generating: Show placeholder (copy is generating, no image yet) */}
        {stage === 'copy_generating' && (
          <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg">
            <div className="space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              <div className="text-gray-400">文案生成中...</div>
            </div>
          </div>
        )}

        {/* copy_ready: Show placeholder (waiting for user to select copy style) */}
        {stage === 'copy_ready' && (
          <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg">
            <div className="space-y-2">
              <div className="text-gray-400">等待選擇文案風格</div>
              <div className="text-xs">請在左側選擇一個文案風格，系統將自動生成圖片</div>
            </div>
          </div>
        )}

        {/* image_generating: Show loading state */}
        {stage === 'image_generating' && (
          <>
            {generationStatus === 'queued' && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-muted-foreground">排隊中...</p>
              </div>
            )}

            {generationStatus === 'generating' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>生成中...</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <Progress value={generationProgress} />
                </div>
              </div>
            )}
          </>
        )}

        {/* done: Show generated images */}
        {stage === 'done' && generationStatus === 'done' && generatedImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {generatedImages.map((img) => {
              const isSelected = selectedImage === img.id;
              return (
                <div
                  key={img.id}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                    isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => onSelectImage(img.id)}
                >
                  <ImageWithFallback
                    src={img.url}
                    alt={`Generated ${img.id}`}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-1">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
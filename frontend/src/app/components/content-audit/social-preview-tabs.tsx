import { useState, useEffect } from 'react';
import { Instagram, Facebook, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { cn } from '@/app/components/ui/utils';

interface SocialPreviewTabsProps {
  selectedGeneratedImage: string | null;
  selectedCopy: string;
  productName: string;
  hasGeneratedImages: boolean;
}

type AspectRatio = '1:1' | '4:5' | '9:16' | '1.91:1';

const ASPECT_RATIOS: Record<string, { label: string; ratio: string }> = {
  '1:1': { label: '1:1 (正方形)', ratio: '1/1' },
  '4:5': { label: '4:5 (直式)', ratio: '4/5' },
  '9:16': { label: '9:16 (限動)', ratio: '9/16' },
  '1.91:1': { label: '1.91:1 (橫式)', ratio: '1.91/1' },
};

export function SocialPreviewTabs({ 
  selectedGeneratedImage, 
  selectedCopy, 
  productName,
  hasGeneratedImages 
}: SocialPreviewTabsProps) {
  const [igAspectRatio, setIgAspectRatio] = useState<AspectRatio>('1:1');
  const [fbAspectRatio, setFbAspectRatio] = useState<AspectRatio>('1.91:1');
  const [activeTab, setActiveTab] = useState<string>('generated');

  // Smart default tab selection
  useEffect(() => {
    if (hasGeneratedImages && selectedGeneratedImage) {
      // If has generated images, default to "generated" tab
      setActiveTab('generated');
    } else {
      // No generated images, default to "generated" (will show empty state)
      setActiveTab('generated');
    }
  }, [hasGeneratedImages, selectedGeneratedImage]);

  // Determine default tab value
  const getDefaultTab = () => {
    return 'generated';
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={getDefaultTab()} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="generated">
          <ImageIcon className="w-4 h-4 mr-1" />
          生成圖
        </TabsTrigger>
        <TabsTrigger value="ig-post">
          <Instagram className="w-4 h-4 mr-1" />
          IG 貼文
        </TabsTrigger>
        <TabsTrigger value="ig-story">
          <Instagram className="w-4 h-4 mr-1" />
          IG 限動
        </TabsTrigger>
        <TabsTrigger value="fb-post">
          <Facebook className="w-4 h-4 mr-1" />
          FB 貼文
        </TabsTrigger>
      </TabsList>

      <TabsContent value="generated" className="mt-4">
        {selectedGeneratedImage ? (
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <ImageWithFallback
              src={selectedGeneratedImage}
              alt="Generated"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            請先生成圖片
          </div>
        )}
      </TabsContent>

      <TabsContent value="ig-post" className="mt-4 space-y-3">
        {selectedGeneratedImage ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">比例</span>
              <Select value={igAspectRatio} onValueChange={(v) => setIgAspectRatio(v as AspectRatio)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">{ASPECT_RATIOS['1:1'].label}</SelectItem>
                  <SelectItem value="4:5">{ASPECT_RATIOS['4:5'].label}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <InstagramPostPreview
              image={selectedGeneratedImage}
              copy={selectedCopy}
              productName={productName}
              aspectRatio={igAspectRatio}
            />
          </>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            請先生成圖片
          </div>
        )}
      </TabsContent>

      <TabsContent value="ig-story" className="mt-4">
        {selectedGeneratedImage ? (
          <InstagramStoryPreview
            image={selectedGeneratedImage}
            copy={selectedCopy}
            productName={productName}
          />
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            請先生成圖片
          </div>
        )}
      </TabsContent>

      <TabsContent value="fb-post" className="mt-4 space-y-3">
        {selectedGeneratedImage ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">比例</span>
              <Select value={fbAspectRatio} onValueChange={(v) => setFbAspectRatio(v as AspectRatio)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.91:1">{ASPECT_RATIOS['1.91:1'].label}</SelectItem>
                  <SelectItem value="1:1">{ASPECT_RATIOS['1:1'].label}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FacebookPostPreview
              image={selectedGeneratedImage}
              copy={selectedCopy}
              productName={productName}
              aspectRatio={fbAspectRatio}
            />
          </>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            請先生成圖片
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function InstagramPostPreview({
  image,
  copy,
  productName,
  aspectRatio,
}: {
  image: string;
  copy: string;
  productName: string;
  aspectRatio: AspectRatio;
}) {
  const ratio = ASPECT_RATIOS[aspectRatio].ratio;
  
  return (
    <div className="bg-white border rounded-lg p-4 max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
        <div className="w-8 h-8 rounded-full bg-gray-300"></div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{productName}</div>
          <div className="text-xs text-gray-500">Sponsored</div>
        </div>
      </div>

      <div className={cn("bg-gray-100 rounded-lg overflow-hidden mb-3")} style={{ aspectRatio: ratio }}>
        <ImageWithFallback
          src={image}
          alt="Post"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="text-sm space-y-1">
        <div className="font-semibold">{productName}</div>
        <div className="text-gray-700 whitespace-pre-line" style={{ 
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>{copy}</div>
        <div className="text-blue-600 text-xs">查看更多</div>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t text-gray-500 text-sm">
        <span>❤️ 0</span>
        <span>💬 0</span>
        <span>📤</span>
      </div>
    </div>
  );
}

function InstagramStoryPreview({
  image,
  copy,
  productName,
}: {
  image: string;
  copy: string;
  productName: string;
}) {
  return (
    <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-1 max-w-xs mx-auto" style={{ aspectRatio: '9/16' }}>
      <div className="bg-black rounded-lg h-full relative overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={image}
            alt="Story"
            className="w-full h-full object-cover opacity-80"
          />
        </div>

        <div className="absolute inset-0 flex flex-col justify-between p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white"></div>
              <span className="text-sm font-semibold">{productName}</span>
            </div>
            <span className="text-xs">1h</span>
          </div>

          <div className="bg-black/50 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-sm font-semibold mb-1">{productName}</div>
            <div className="text-xs" style={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>{copy}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FacebookPostPreview({
  image,
  copy,
  productName,
  aspectRatio,
}: {
  image: string;
  copy: string;
  productName: string;
  aspectRatio: AspectRatio;
}) {
  const ratio = ASPECT_RATIOS[aspectRatio].ratio;
  
  return (
    <div className="bg-white border rounded-lg p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
        <div className="w-10 h-10 rounded-full bg-gray-300"></div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{productName}</div>
          <div className="text-xs text-gray-500">Sponsored · 1h</div>
        </div>
      </div>

      <div className="text-sm mb-3 whitespace-pre-line">{copy}</div>

      <div className={cn("bg-gray-100 rounded-lg overflow-hidden")} style={{ aspectRatio: ratio }}>
        <ImageWithFallback
          src={image}
          alt="Post"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t text-gray-500 text-sm">
        <div className="flex items-center gap-4">
          <span>👍 0</span>
          <span>💬 0</span>
          <span>分享</span>
        </div>
        <span>儲存</span>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Instagram, Facebook, LayoutTemplate } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { cn } from '@/app/components/ui/utils';

interface SocialPreviewTabsProps {
  selectedGeneratedImage: string | null;
  selectedCopy: string;
  productName: string;
  hasGeneratedImages: boolean;
}

export function SocialPreviewTabs({ 
  selectedGeneratedImage, 
  selectedCopy, 
  productName,
  hasGeneratedImages 
}: SocialPreviewTabsProps) {
  const [activeTab, setActiveTab] = useState<string>('ig-post');

  useEffect(() => {
    if (activeTab === 'generated') {
      setActiveTab('ig-post');
    }
  }, [hasGeneratedImages, selectedGeneratedImage, activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6 h-10 p-1 bg-slate-100/50 rounded-lg">
        <TabsTrigger value="ig-post" className="flex items-center justify-center gap-2">
          <Instagram className="w-4 h-4" />
          <span className="truncate text-xs sm:text-sm">IG 貼文</span>
        </TabsTrigger>
        <TabsTrigger value="fb-post" className="flex items-center justify-center gap-2">
          <Facebook className="w-4 h-4" />
          <span className="truncate text-xs sm:text-sm">FB 貼文</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ig-post" className="mt-0 outline-none space-y-3">
        {selectedGeneratedImage ? (
          <InstagramPostPreview
            image={selectedGeneratedImage}
            copy={selectedCopy}
            productName={productName}
          />
        ) : (
          <EmptyState />
        )}
      </TabsContent>

      <TabsContent value="fb-post" className="mt-0 outline-none space-y-3">
        {selectedGeneratedImage ? (
          <FacebookPostPreview
            image={selectedGeneratedImage}
            copy={selectedCopy}
            productName={productName}
          />
        ) : (
          <EmptyState />
        )}
      </TabsContent>
    </Tabs>
  );
}

// ==========================================
// 優化後的 Empty State (與其他步驟風格一致)
// ==========================================
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[260px] text-center p-8 border border-dashed border-border rounded-lg bg-slate-50/50">
      <div className="bg-white p-3 rounded-full shadow-sm mb-3">
        <LayoutTemplate className="w-6 h-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">尚未建立預覽</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        完成上方圖片生成後<br />
        即可在此預覽各社群平台的發佈效果
      </p>
    </div>
  );
}

// ==========================================
// Preview Components 
// ==========================================

function InstagramPostPreview({
  image,
  copy,
  productName,
}: {
  image: string;
  copy: string;
  productName: string;
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-3 max-w-[320px] mx-auto shadow-sm">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
        <div className="w-6 h-6 rounded-full bg-slate-200"></div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800">{productName || '商品名稱'}</div>
          <div className="text-[10px] text-slate-500">Sponsored</div>
        </div>
      </div>

      {/* 這裡固定比例為 1/1 */}
      <div className={cn("bg-slate-100 rounded-lg overflow-hidden mb-2")} style={{ aspectRatio: '1/1' }}>
        <ImageWithFallback
          src={image}
          alt="Post"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="text-sm space-y-1">
        <div className="font-semibold text-sm text-slate-800">{productName || '商品名稱'}</div>
        <div className="text-slate-600 whitespace-pre-line text-xs" style={{ 
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>{copy || '文案內容將顯示於此...'}</div>
        <div className="text-slate-500 text-xs mt-1">查看更多</div>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-slate-500 text-xs">
        <span className="flex items-center gap-1">♡ 讚</span>
        <span className="flex items-center gap-1">💬 留言</span>
        <span className="flex items-center gap-1">➤ 分享</span>
      </div>
    </div>
  );
}

function FacebookPostPreview({
  image,
  copy,
  productName,
}: {
  image: string;
  copy: string;
  productName: string;
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-3 max-w-[380px] mx-auto shadow-sm">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
        <div className="w-8 h-8 rounded-full bg-slate-200"></div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800">{productName || '商品名稱'}</div>
          <div className="text-[10px] text-slate-500">Sponsored · 1h</div>
        </div>
      </div>

      <div className="text-xs mb-3 text-slate-700 leading-relaxed whitespace-pre-line">
        {copy || '文案內容將顯示於此...'}
      </div>

      {/* 這裡固定比例為 1/1 */}
      <div className={cn("bg-slate-100 rounded-lg overflow-hidden border border-border/50")} style={{ aspectRatio: '1/1' }}>
        <ImageWithFallback
          src={image}
          alt="Post"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-slate-500 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">👍 讚</span>
          <span className="flex items-center gap-1">💬 留言</span>
          <span className="flex items-center gap-1">➦ 分享</span>
        </div>
      </div>
    </div>
  );
}
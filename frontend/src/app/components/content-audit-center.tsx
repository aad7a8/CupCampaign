import React, { useState, useEffect } from 'react';
import { Edit2, Image as ImageIcon, Send, CheckCircle2, Loader2, Pencil, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { ImageUploader } from './content-audit/image-uploader';
import { GeneratedGallery, generateMockImages, GenerationStatus, GeneratedImage } from './content-audit/generated-gallery';
import { SocialPreviewTabs } from './content-audit/social-preview-tabs';
import { TEMPLATES } from './content-audit/template-picker';
import { cn } from '@/app/components/ui/utils';
import { BobaProgress } from '@/app/components/ui/BobaProgress';
import { useBobaFakeProgress } from '@/app/hooks/useBobaFakeProgress';
import { TeaFlowProgressBar } from '@/app/components/ui/TeaFlowProgressBar';
import { useTeaFlowFakeProgress } from '@/app/hooks/useTeaFlowFakeProgress';
import { Instagram, Facebook, Link2 } from 'lucide-react';

type Stage = 'waiting_input' | 'copy_generating' | 'copy_ready' | 'image_generating' | 'done';

interface CopyStyle {
  id: string;
  name: string;
  icon: string;
  content: string;
  editedText?: string;
}

interface ImageMeta {
  width: number;
  height: number;
  size: number;
}

export function ContentAuditCenter() {
  // Mock products data
  const products = ['烤糖奶蓋草莓紅', '青蛙汁'];

  // State definitions
  const [stage, setStage] = useState<Stage>('waiting_input');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedMeta, setUploadedMeta] = useState<ImageMeta | null>(null);
  const [copyCandidates, setCopyCandidates] = useState<CopyStyle[]>([]);
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [template, setTemplate] = useState<string>(TEMPLATES[0].id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCopyId, setEditingCopyId] = useState<string | null>(null);
  const [editTextValue, setEditTextValue] = useState<string>('');

  const { progress, status, start, finish, reset } = useBobaFakeProgress({ expectedMs: 60000 });
  const [showBobaProgress, setShowBobaProgress] = useState(false);
  const [selectedStyleName, setSelectedStyleName] = useState<string>('');
  const [publishPlatform, setPublishPlatform] = useState<'ig' | 'fb' | 'sync'>('fb');

  const {
    progress: teaFlowProgress,
    status: teaFlowStatus,
    start: teaFlowStart,
    finish: teaFlowFinish,
    reset: teaFlowReset
  } = useTeaFlowFakeProgress({ expectedMs: 60000 });
  const [showTeaFlowProgress, setShowTeaFlowProgress] = useState(false);

  // Reset & Handlers
  const resetState = () => {
    setCopyCandidates([]);
    setSelectedCopyId(null);
    setGeneratedImages([]);
    setSelectedImage(null);
    setGenerationStatus('idle');
    setGenerationProgress(0);
    setStage('waiting_input');
    setErrorMessage(null);
    setIsEditDialogOpen(false);
    setEditingCopyId(null);
    setEditTextValue('');
    reset();
    setShowBobaProgress(false);
    teaFlowReset();
    setShowTeaFlowProgress(false);
    setSelectedStyleName('');
  };

  const handleImageUpload = (file: File, preview: string, meta: ImageMeta) => {
    setUploadedImage(preview);
    setUploadedMeta(meta);
    resetState();
  };

  const handleImageClear = () => {
    setUploadedImage(null);
    setUploadedMeta(null);
    resetState();
  };

  const handleProductChange = (value: string) => {
    setSelectedProduct(value);
    resetState();
  };

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    resetState();
  };

  const generateCopies = async (productName: string, templateId: string): Promise<CopyStyle[]> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return [
      {
        id: 'survival',
        name: '社畜生存',
        icon: '🔋', 
        content: `🧨 過年比上班還累？這杯是你的避難所！\n面對親戚連環拷問「年終、結婚、買房」，根本是比上班更累的無薪情緒加班。加上低溫來襲，你需要的不是溝通，而是${productName} 🍓！\n把濃郁烤糖奶蓋當耳塞，用酸甜草莓紅堵住靈魂拷問。每一口醇厚奶香，都在撫平被問到千瘡百孔的心。撐住啊各位！喝完這杯，我們才有力氣微笑點頭說「阿姨您說得對」。\n#老賴茶棧 #烤糖奶蓋草莓紅 #過年生存指南`
      },
      {
        id: 'meme',
        name: '時事迷因',
        icon: '😂',
        content: `💸 刮刮樂又做公益？沒關係，我們還有草莓自由！\n財富自由的列車今年又沒停在你這站嗎？既然沒辦法一夜暴富，就在初二這天，用一杯 ${productName} 實現「草莓自由」！🍓\n現烤焦糖脆片像極了被現實擊碎的發財夢，但搭上綿密奶蓋與招牌草莓紅，一口喝下直接原地復活！投資刮刮樂有賺有賠，投資這杯絕對穩賺不賠。快 @ 那個刮到懷疑人生的苦主，請他喝一杯壓壓驚！\n#老賴茶棧 #烤糖奶蓋草莓紅 #財富自由`
      },
      {
        id: 'ritual',
        name: '質感儀式',
        icon: '✨', 
        content: `🍓 喧囂退去，留一份冬日的溫柔給自己。\n在拜年與喧鬧的縫隙裡，外頭仍吹著初春冷風，你需要為自己按下的暫停鍵。${productName}，不只是手搖，更是專屬的感官儀式。\n指尖傳來杯身的溫熱，鼻息間是炙烤後的迷人糖香；綿密奶蓋如冬雪覆蓋在草莓紅茶上，酸甜與濃郁交織出美好時光的切片。這個初二午後，給自己留一首歌的時間，享受這份季節限定的小確幸。\n#老賴茶棧 #烤糖奶蓋草莓紅 #儀式感`
      }
    ];
  };

  const handleGenerateCopiesClick = async () => {
    if (!uploadedImage) {
      setErrorMessage('請先上傳產品圖片');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    if (!selectedProduct) {
      setErrorMessage('請先選擇產品名稱');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setStage('copy_generating');
    setCopyCandidates([]);
    setSelectedCopyId(null);
    setErrorMessage(null);
    setShowBobaProgress(true);
    start();

    setTimeout(() => {
      finish();
      setTimeout(() => {
        setShowBobaProgress(false);
        generateCopies(selectedProduct, template)
          .then((copies) => {
            setCopyCandidates(copies);
            setStage('copy_ready');
          })
          .catch(() => {
            setErrorMessage('文案生成失敗，請重試');
            setStage('waiting_input');
            setTimeout(() => setErrorMessage(null), 3000);
          });
      }, 1000);
    }, 6000);
  };

  const handleGenerateImage = async (copyId?: string) => {
    if (!uploadedImage || (!copyId && !selectedCopyId)) return;

    setStage('image_generating');
    setGenerationStatus('queued');
    setGeneratedImages([]);
    setSelectedImage(null);

    setTimeout(() => {
      setGenerationStatus('generating');
      setGenerationProgress(0);

      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => (prev >= 90 ? 90 : prev + 10));
      }, 200);

      generateMockImages(uploadedImage)
        .then((images: GeneratedImage[]) => {
          clearInterval(progressInterval);
          setGenerationProgress(100);
          setGeneratedImages(images);
          setGenerationStatus('done');
          setStage('done');
          if (images.length > 0) setSelectedImage(images[0].id);
        })
        .catch(() => {
          clearInterval(progressInterval);
          setGenerationStatus('idle');
          setStage('copy_ready');
        });
    }, 500);
  };

  const handleSelectImage = (imageId: string) => setSelectedImage(imageId);
  const handleRegenerate = () => selectedCopyId && handleGenerateImage();

  const handleEditCopy = (e: React.MouseEvent, copyId: string) => {
    e.stopPropagation();
    const copy = copyCandidates.find(c => c.id === copyId);
    if (copy) {
      setEditingCopyId(copyId);
      setEditTextValue(copy.editedText ?? copy.content);
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveEdit = () => {
    if (!editingCopyId || !editTextValue.trim()) return;
    setCopyCandidates(prev => prev.map(copy =>
      copy.id === editingCopyId ? { ...copy, editedText: editTextValue.trim() } : copy
    ));
    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingCopyId(null);
    setEditTextValue('');
  };

  const handleSelectCopyStyle = (copyId: string) => {
    setSelectedCopyId(copyId);
    setErrorMessage(null);

    const copy = copyCandidates.find(c => c.id === copyId);
    setSelectedStyleName(copy?.name || '此風格');
    setGeneratedImages([]);
    setSelectedImage(null);

    setShowTeaFlowProgress(true);
    teaFlowStart();
    setStage('image_generating');
    setGenerationStatus('generating');
    setGenerationProgress(0);

    setTimeout(() => {
      teaFlowFinish();
      setTimeout(() => {
        setShowTeaFlowProgress(false);
        if (uploadedImage) {
          generateMockImages(uploadedImage)
            .then((images: GeneratedImage[]) => {
              setGeneratedImages(images);
              setGenerationStatus('done');
              setStage('done');
              if (images.length > 0) setSelectedImage(images[0].id);
            })
            .catch(() => {
              setGenerationStatus('idle');
              setStage('copy_ready');
              setErrorMessage('圖片生成失敗，請重試');
              setTimeout(() => setErrorMessage(null), 3000);
            });
        }
      }, 1200);
    }, 6000);
  };

  const selectedCopyText = selectedCopyId
    ? copyCandidates.find(c => c.id === selectedCopyId)?.editedText ?? copyCandidates.find(c => c.id === selectedCopyId)?.content ?? ''
    : '';

  const selectedGeneratedImageUrl = selectedImage
    ? generatedImages.find(img => img.id === selectedImage)?.url || null
    : generatedImages.length > 0 ? generatedImages[0].url : null;

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen" style={{ backgroundColor: 'var(--df-bg)' }}>

      {/* ================= Col 1: 產品資訊輸入 ================= */}
      <div className="flex-[0.3] p-4 space-y-4 flex flex-col">
        <div className="mb-2">
          <h2 className="text-xl font-semibold">內容審核中心</h2>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground">第一步：產品與素材輸入</h3>
          <Card className="shadow-sm">
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">產品照片上傳</Label>
                <div className="flex justify-center w-full">
                  <div className="w-full max-w-[300px]">
                    <ImageUploader
                      value={uploadedImage}
                      onImageUpload={handleImageUpload}
                      onClear={handleImageClear}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">產品名稱</Label>
                <Select
                  value={selectedProduct}
                  onValueChange={handleProductChange}
                  disabled={stage === 'copy_generating' || stage === 'image_generating'}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="請選擇產品" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product} value={product}>{product}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleGenerateCopiesClick}
                  disabled={!uploadedImage || !selectedProduct || stage === 'copy_generating' || stage === 'image_generating'}
                  className="w-full h-10"
                  style={{ backgroundColor: 'var(--df-header)', color: 'white' }}
                >
                  {stage === 'copy_generating' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成中…</>
                  ) : (
                    <><ImageIcon className="w-4 h-4 mr-2" />生成多風格文案</>
                  )}
                </Button>
                {showBobaProgress && (
                  <div className="mt-3">
                    <BobaProgress progress={progress} status={status} showCounter={true} size="md" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ================= Col 2: 文案選擇 ================= */}
      <div className="flex-[0.3] p-6 border-l border-border bg-gray-50/50 flex flex-col h-full overflow-hidden">
        <div className="shrink-0 mb-4">
          <h3 className="font-semibold text-sm text-muted-foreground">第二步：選擇行銷文案</h3>
          {errorMessage && (
            <div className="mt-3 p-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex-1 grid grid-rows-3 gap-4 min-h-0 pb-1">
          {stage === 'copy_generating' && [1, 2, 3].map((i) => (
            <Card key={i} className="flex flex-col min-h-0 h-full">
              <CardContent className="px-5 pb-5 pt-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between mb-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /><div className="h-4 w-4 bg-gray-200 rounded animate-pulse" /></div>
                  <div className="space-y-2"><div className="h-3 w-full bg-gray-200 rounded animate-pulse" /><div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" /></div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(stage === 'copy_ready' || stage === 'image_generating' || stage === 'done') &&
            copyCandidates.map((copy) => {
              const isSelected = selectedCopyId === copy.id;
              return (
                <Card key={copy.id} className={cn("flex flex-col relative transition-all min-h-0 h-full overflow-hidden", isSelected ? "ring-2 ring-primary border-primary bg-white shadow-sm" : "border-border hover:bg-white hover:shadow-sm")}>
                  <CardHeader className="pb-2 pt-4 px-4 shrink-0">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2"><span className="text-lg">{copy.icon}</span>{copy.name}</span>
                      <Button variant="ghost" size="sm" onClick={(e) => handleEditCopy(e, copy.id)} className="h-6 w-6 p-0" disabled={stage === 'image_generating'}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-2">
                      <p className="text-xs whitespace-pre-line leading-relaxed text-muted-foreground">{copy.editedText ?? copy.content}</p>
                    </div>
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="w-full shrink-0 h-[42px]"
                      disabled={stage === 'image_generating'}
                      onClick={(e) => { e.stopPropagation(); handleSelectCopyStyle(copy.id); }}
                    >
                      {isSelected ? <><CheckCircle2 className="w-4 h-4 mr-2" /> 已選擇</> : '套用此風格產圖'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

          {stage === 'waiting_input' && (
            <div className="row-span-3 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-lg h-full bg-slate-50/50">
              <div className="bg-white p-3 rounded-full shadow-sm mb-4">
                <FileText className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <h4 className="text-sm font-medium text-foreground mb-1">尚未生成文案</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                請先於左側上傳商品圖片並選擇名稱<br />
                點擊「生成多風格文案」即可開始
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ================= Col 3: 圖像生成與實境發佈預覽 ================= */}
      <div className="flex-[0.4] p-6 overflow-y-auto border-l border-border bg-white flex flex-col h-full">
        <div className="mb-4 shrink-0">
          <h3 className="font-semibold mb-4 text-sm text-muted-foreground">第三步：圖像生成與微調</h3>
          {showTeaFlowProgress && (
            <div className="mb-4">
              <TeaFlowProgressBar
                progress={teaFlowProgress}
                status={teaFlowStatus}
                label={selectedStyleName ? `正在套用「${selectedStyleName}」...` : '正在生成圖片...'}
                showCounter={true}
                compact={true}
              />
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            <GeneratedGallery
              uploadedImage={null}
              generatedImages={generatedImages}
              selectedImage={selectedImage}
              generationStatus={generationStatus}
              generationProgress={generationProgress}
              onSelectImage={handleSelectImage}
              onRegenerate={handleRegenerate}
              stage={stage}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 pb-1">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-semibold text-sm text-muted-foreground">第四步：發佈預覽與確認</h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <SocialPreviewTabs
              selectedGeneratedImage={selectedGeneratedImageUrl}
              selectedCopy={selectedCopyText}
              productName={selectedProduct}
              hasGeneratedImages={generatedImages.length > 0}
            />
          </div>

          <div className="pt-4 mt-auto shrink-0 flex flex-col gap-3 border-t border-border/50">
            <div>
              <Label className="text-sm font-medium mb-2 block">發布平台</Label>
              <div className="flex gap-2 bg-slate-50/80 p-1.5 rounded-lg border border-border/40">
                {/* IG 按鈕 */}
                <Button
                  variant={publishPlatform === 'ig' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "flex-1 transition-colors shadow-sm",
                    publishPlatform === 'ig'
                      ? "bg-[#c5a484] hover:bg-[#b39374] text-white border-transparent"
                      : "bg-white hover:bg-slate-50 text-foreground"
                  )}
                  onClick={() => setPublishPlatform('ig')}
                >
                  <Instagram className="w-4 h-4 mr-2" /> IG
                </Button>
                
                {/* FB 按鈕 */}
                <Button
                  variant={publishPlatform === 'fb' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "flex-1 transition-colors shadow-sm",
                    publishPlatform === 'fb' 
                      ? "bg-[#c5a484] hover:bg-[#b39374] text-white border-transparent" 
                      : "bg-white hover:bg-slate-50 text-foreground"
                  )}
                  onClick={() => setPublishPlatform('fb')}
                >
                  <Facebook className="w-4 h-4 mr-2" /> Facebook
                </Button>
                
                {/* 同步發佈按鈕 */}
                <Button
                  variant={publishPlatform === 'sync' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "flex-1 transition-colors shadow-sm",
                    publishPlatform === 'sync'
                      ? "bg-[#c5a484] hover:bg-[#b39374] text-white border-transparent"
                      : "bg-white hover:bg-slate-50 text-foreground"
                  )}
                  onClick={() => setPublishPlatform('sync')}
                >
                  <Link2 className="w-4 h-4 mr-2" /> 同步發佈
                </Button>
              </div>
            </div>

            <Button
              className="w-full h-[42px] text-md font-medium shadow-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--df-accent)', color: 'white' }}
              disabled={!selectedImage || teaFlowStatus === 'running'}
            >
              <Send className="w-5 h-5 mr-2" />
              確認發布
            </Button>
          </div>
        </div>
      </div>

      {/* ================= Edit Copy Dialog ================= */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open: boolean) => {
          if (!open) handleCancelEdit();
          else setIsEditDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>編輯文案</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-textarea">文案內容</Label>
              <Textarea
                id="edit-textarea"
                value={editTextValue}
                onChange={(e) => setEditTextValue(e.target.value)}
                placeholder="請輸入文案內容"
                className="min-h-[200px]"
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>取消</Button>
            <Button onClick={handleSaveEdit} disabled={!editTextValue.trim()}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
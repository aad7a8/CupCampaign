import React, { useState, useEffect } from 'react';
import { Edit2, Image as ImageIcon, Send, CheckCircle2, Loader2, Pencil } from 'lucide-react';
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
import { cn } from '@/app/components/ui/utils';
import { BobaProgress } from '@/app/components/ui/BobaProgress';
import { useBobaFakeProgress } from '@/app/hooks/useBobaFakeProgress';
import { TeaFlowProgressBar } from '@/app/components/ui/TeaFlowProgressBar';
import { useTeaFlowFakeProgress } from '@/app/hooks/useTeaFlowFakeProgress';

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
  const products = ['烤楊奶茶鮮萃紅', '青蛙汁'];

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCopyId, setEditingCopyId] = useState<string | null>(null);
  const [editTextValue, setEditTextValue] = useState<string>('');

  const { progress, status, start, finish, reset } = useBobaFakeProgress({ expectedMs: 60000 });
  const [showBobaProgress, setShowBobaProgress] = useState(false);

  const { 
    progress: teaFlowProgress, 
    status: teaFlowStatus, 
    start: teaFlowStart, 
    finish: teaFlowFinish, 
    reset: teaFlowReset 
  } = useTeaFlowFakeProgress({ expectedMs: 60000 });
  const [showTeaFlowProgress, setShowTeaFlowProgress] = useState(false);
  const [selectedStyleName, setSelectedStyleName] = useState<string>('');

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

  const generateCopies = async (productName: string): Promise<CopyStyle[]> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return [
      {
        id: 'trendy',
        name: '潮流風格',
        icon: '🔥',
        content: `${productName} 絕對是今年冬天最chill的選擇～濃郁烤糖遇上酸甜草莓，每一口都是驚喜💕 限時開賣中，tag你的姊妹一起來打卡！`
      },
      {
        id: 'literary',
        name: '文青風格',
        icon: '📖',
        content: `冬日午後，一杯${productName}。\n\n溫暖的烤糖香氣，包裹著莓果的清新，如同舊時光裡那些美好的片段。\n\n季節限定，與你分享這份冬季的小確幸。`
      },
      {
        id: 'humor',
        name: '幽默風格',
        icon: '😄',
        content: `老闆說：「這杯${productName}賣不好就扣你薪水！」\n我說：「那我先喝三杯壓壓驚。」\n\n結果...我真的連喝三杯 🤣\n#太好喝了吧 #減肥明天再說`
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
    setShowBobaProgress(true);
    start();
    
    setTimeout(() => {
      finish();
      setTimeout(() => {
        setShowBobaProgress(false);
        generateCopies(selectedProduct)
          .then((copies) => {
            setCopyCandidates(copies);
            setStage('copy_ready');
          })
          .catch(() => {
            setErrorMessage('文案生成失敗');
            setStage('waiting_input');
          });
      }, 1000);
    }, 3000);
  };

  const handleGenerateImage = async (copyId?: string) => {
    if (!uploadedImage) return;
    const copyIdToUse = copyId || selectedCopyId;
    if (!copyIdToUse) return;
    const copy = copyCandidates.find(c => c.id === copyIdToUse);
    if (!copy) return;

    setStage('image_generating');
    setGenerationStatus('generating');
    
    generateMockImages(uploadedImage)
      .then((images) => {
        setGeneratedImages(images);
        setGenerationStatus('done');
        setStage('done');
        if (images.length > 0) setSelectedImage(images[0].id);
      })
      .catch((error) => {
        setGenerationStatus('idle');
        setStage('copy_ready');
        setErrorMessage(`圖片生成失敗: ${error.message}`);
      });
  };

  const handleSelectImage = (imageId: string) => setSelectedImage(imageId);

  const handleRegenerate = () => {
    if (selectedCopyId) handleGenerateImage();
  };

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
    setIsEditDialogOpen(false);
    setEditingCopyId(null);
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingCopyId(null);
  };

  const handleSelectCopyStyle = async (copyId: string) => {
    setSelectedCopyId(copyId);
    setErrorMessage(null);
    const copy = copyCandidates.find(c => c.id === copyId);
    const styleName = copy?.name || '此風格';
    const finalPrompt = copy?.editedText ?? copy?.content;
    setSelectedStyleName(styleName);

    setShowTeaFlowProgress(true);
    teaFlowStart();
    setStage('image_generating');
    setGenerationStatus('generating');
  
    try {
      const responseBlob = await fetch(uploadedImage!);
      const blob = await responseBlob.blob();
      const formData = new FormData();
      formData.append('file', blob, 'product_image.jpg');
      // formData.append('prompt', finalPrompt || '');

      const response = await fetch('/api/upload_and_generate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.status === 'success') {
        teaFlowFinish();
        const newGeneratedImage: GeneratedImage = {
          id: Date.now().toString(),
          url: data.image_data,
          alt: styleName
        };
        setTimeout(() => {
          setShowTeaFlowProgress(false);
          setGeneratedImages([newGeneratedImage]);
          setGenerationStatus('done');
          setStage('done');
          setSelectedImage(newGeneratedImage.id);
        }, 1200);
      } else {
        throw new Error(data.error || '圖片生成失敗');
      }
    } catch (error: any) {
      teaFlowReset();
      setShowTeaFlowProgress(false);
      setErrorMessage(error.message);
      setStage('copy_ready');
      setGenerationStatus('idle');
    }
  };

  const selectedCopyText = selectedCopyId 
    ? (copyCandidates.find(c => c.id === selectedCopyId)?.editedText || copyCandidates.find(c => c.id === selectedCopyId)?.content || '')
    : '';

  const selectedGeneratedImageUrl = selectedImage 
    ? generatedImages.find(img => img.id === selectedImage)?.url || null
    : generatedImages.length > 0 ? generatedImages[0].url : null;

  return (
    <div className="h-full flex" style={{ backgroundColor: 'var(--df-bg)' }}>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6 pr-4 max-w-4xl">
          <div>
            <h2 className="text-2xl font-semibold mb-1">內容審核中心</h2>
            <p className="text-sm text-muted-foreground">AI 多風格產出 · 人工最後審核</p>
          </div>
          
          <Card>
            <CardHeader><CardTitle className="text-base">產品資訊輸入</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>產品名稱</Label>
                    <Select value={selectedProduct} onValueChange={handleProductChange} disabled={stage === 'copy_generating' || stage === 'image_generating'}>
                      <SelectTrigger><SelectValue placeholder="請選擇產品" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4 space-y-3">
                    <div className="text-sm font-medium">行銷</div>
                    <Button onClick={handleGenerateCopiesClick} disabled={!uploadedImage || !selectedProduct || stage === 'copy_generating' || stage === 'image_generating'} className="w-full" style={{ backgroundColor: 'var(--df-header)', color: 'white' }}>
                      {stage === 'copy_generating' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成中…</> : <><ImageIcon className="w-4 h-4 mr-2" />文案產生</>}
                    </Button>
                    {showBobaProgress && <div className="mt-3"><BobaProgress progress={progress} status={status} showCounter size="md" /></div>}
                  </div>
                </div>
                <div className="space-y-2">
                  <ImageUploader value={uploadedImage} onImageUpload={handleImageUpload} onClear={handleImageClear} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div>
            <h3 className="font-semibold mb-4">AI 多風格文案對比</h3>
            {errorMessage && <div className="mb-3 p-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded">{errorMessage}</div>}
            
            {stage === 'copy_generating' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-full"><CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /><div className="h-4 w-4 bg-gray-200 rounded animate-pulse" /></div>
                    <div className="space-y-2"><div className="h-3 w-full bg-gray-200 rounded animate-pulse" /><div className="h-3 w-full bg-gray-200 rounded animate-pulse" /></div>
                    <div className="h-8 w-full bg-gray-200 rounded animate-pulse" />
                  </CardContent></Card>
                ))}
              </div>
            )}
            
            {(stage === 'copy_ready' || stage === 'image_generating' || stage === 'done') ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                {copyCandidates.map((copy) => {
                  const isSelected = selectedCopyId === copy.id;
                  return (
                    <Card key={copy.id} className={cn("relative transition-all h-full flex flex-col", isSelected ? "ring-2 ring-primary border-primary" : "border-border hover:bg-muted/20 hover:shadow-md")}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2"><span className="text-lg">{copy.icon}</span>{copy.name}</span>
                          <Button variant="ghost" size="sm" onClick={(e) => handleEditCopy(e, copy.id)} className="h-6 w-6 p-0" disabled={stage === 'image_generating'}><Pencil className="w-3 h-3" /></Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <p className="text-xs whitespace-pre-line leading-relaxed text-muted-foreground flex-1">{copy.editedText ?? copy.content}</p>
                      </CardContent>
                      <div className="p-4 pt-0 border-t border-border mt-auto space-y-2">
                        {copy.editedText && <div className="text-xs text-muted-foreground text-center">已編輯</div>}
                        <Button variant={isSelected ? "default" : "outline"} size="sm" className="w-full" disabled={stage === 'image_generating'} onClick={() => handleSelectCopyStyle(copy.id)}>
                          {isSelected ? <><CheckCircle2 className="w-4 h-4 mr-2" />已選擇</> : '選擇此風格'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : stage === 'waiting_input' && (
              <div className="text-center py-8 text-sm text-muted-foreground">請上傳圖片、選擇產品並點擊文案產生</div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto border-l" style={{ backgroundColor: 'white' }}>
        <div>
          <h3 className="font-semibold mb-4">圖像預覽與模擬</h3>
          {showTeaFlowProgress && (
            <div className="mb-4">
              <TeaFlowProgressBar progress={teaFlowProgress} status={teaFlowStatus} label={selectedStyleName ? `正在套用「${selectedStyleName}」...` : '正在生成圖片...'} showCounter compact />
            </div>
          )}
          <GeneratedGallery uploadedImage={null} generatedImages={generatedImages} selectedImage={selectedImage} generationStatus={generationStatus} generationProgress={generationProgress} onSelectImage={handleSelectImage} onRegenerate={handleRegenerate} stage={stage} />
          <div className="mt-6">
            <SocialPreviewTabs selectedGeneratedImage={selectedGeneratedImageUrl} selectedCopy={selectedCopyText} productName={selectedProduct} hasGeneratedImages={generatedImages.length > 0} />
          </div>
          <div className="mt-6 space-y-2">
            <Button className="w-full" style={{ backgroundColor: 'var(--df-accent)', color: 'white' }} disabled={!selectedImage || teaFlowStatus === 'running'}><Send className="w-4 h-4 mr-2" />確認發布</Button>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">產品:</span><span className="font-medium">{selectedProduct || '未選擇'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">狀態:</span><Badge variant="outline" className="text-yellow-600 border-yellow-600">待審核</Badge></div>
          </div>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>編輯文案</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4"><div className="space-y-2"><Label htmlFor="edit-textarea">文案內容</Label><Textarea id="edit-textarea" value={editTextValue} onChange={(e) => setEditTextValue(e.target.value)} className="min-h-[200px]" rows={8} /></div></div>
          <DialogFooter><Button variant="outline" onClick={handleCancelEdit}>取消</Button><Button onClick={handleSaveEdit} disabled={!editTextValue.trim()}>儲存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
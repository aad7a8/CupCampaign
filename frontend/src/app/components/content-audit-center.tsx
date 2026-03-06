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
import { useGenerationPolling } from '@/app/hooks/useGenerationPolling';
import { TeaFlowProgressBar } from '@/app/components/ui/TeaFlowProgressBar';
import { useTeaFlowFakeProgress } from '@/app/hooks/useTeaFlowFakeProgress';
import { Instagram, Facebook, Link2 } from 'lucide-react';
import { toast } from 'sonner';

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
  // 替換原本的寫死資料，改用 State 儲存從 API 抓來的產品列表
  const [products, setProducts] = useState<{ id: string, name: string }[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

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

  const {
    progress: bobaProgress,
    status: bobaStatus,
    stageText: bobaStageText,
    result: generationResult,
    error: generationError,
    startGeneration,
    reset: generationReset,
  } = useGenerationPolling();
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

  // 從後端 API 取得產品列表
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await fetch('/api/admin/products', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // 確保夾帶 JWT Cookie
        });

        const resJson = await response.json();

        if (resJson.status === 'success' && resJson.data) {
          // 將回傳的產品資料存入 state
          setProducts(resJson.data);
        } else {
          toast.error(resJson.message || '無法取得菜單資料');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('網路連線錯誤，無法取得產品列表');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

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
    generationReset();
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

  // 當 generationResult 變化時，解析為 CopyStyle[] 並填入 copyCandidates
  useEffect(() => {
    if (generationResult && bobaStatus === 'done') {
      if (generationResult.options && generationResult.options.length > 0) {
        const icons = ['🔥', '💡', '🌟'];
        const copies: CopyStyle[] = generationResult.options.map((opt, i) => ({
          id: `topic-${i}`,
          name: opt.topic_title,
          icon: icons[i % icons.length],
          content: opt.threads_copy,
        }));
        setCopyCandidates(copies);
        setStage('copy_ready');
      }
      setShowBobaProgress(false);
    }
  }, [generationResult, bobaStatus]);

  // 當 generationError 變化時，顯示錯誤
  useEffect(() => {
    if (generationError) {
      setErrorMessage(generationError);
      setStage('waiting_input');
      setShowBobaProgress(false);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }, [generationError]);

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

    startGeneration({ drink_name: selectedProduct });
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

  const handleSelectCopyStyle = async (copyId: string) => {
    // --- [保留] 原本的 UI 與進度條狀態設定 ---
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
    // ------------------------------------

    try {
      // 1. 準備圖片與參數
      const responseBlob = await fetch(uploadedImage!);
      const blob = await responseBlob.blob();
      const formData = new FormData();
      formData.append('file', blob, 'product_image.jpg');
      formData.append('product_name', selectedProduct);
      formData.append('copywriting', finalPrompt || '');

      // 2. 呼叫後端 API 啟動非同步任務
      const response = await fetch('/api/upload_and_generate', {
        method: 'POST',
        body: formData,
      });

      const startData = await response.json();

      // 判斷後端是否成功啟動任務並回傳 task_id
      if (startData.status === 'pending' && startData.task_id) {
        const taskId = startData.task_id;

        // 3. 啟動輪詢計時器 (每 3 秒檢查一次)
        const pollTimer = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/upload_and_generate/status/${taskId}`);
            const data = await statusRes.json();

            if (data.status === 'success') {
              // 生成成功：清除計時器，執行原本的成功邏輯
              clearInterval(pollTimer);
              teaFlowFinish();

              const newGeneratedImage: GeneratedImage = {
                id: Date.now().toString(),
                url: data.image_data, // 這裡是後端轉好的 Base64
                alt: styleName
              };

              setTimeout(() => {
                setShowTeaFlowProgress(false);
                setGeneratedImages([newGeneratedImage]);
                setGenerationStatus('done');
                setStage('done');
                setSelectedImage(newGeneratedImage.id);
              }, 1200);

            } else if (data.status === 'error') {
              // 生成失敗：清除計時器，拋出錯誤
              clearInterval(pollTimer);
              throw new Error(data.error || '影像合成過程中發生錯誤');
            }
            // 如果 data.status 為 'processing'，則不做事，等待下一次 Interval

          } catch (pollError: any) {
            clearInterval(pollTimer);
            handleImageError(pollError.message);
          }
        }, 3000);

      } else {
        throw new Error(startData.message || '伺服器拒絕了生圖請求');
      }

    } catch (error: any) {
      handleImageError(error.message);
    }
  };

  // 輔助函式：統一處理錯誤時的 UI 狀態回歸
  const handleImageError = (msg: string) => {
    teaFlowReset();
    setShowTeaFlowProgress(false);
    setErrorMessage(msg);
    setStage('copy_ready');
    setGenerationStatus('idle');
  };

  const handleConfirmPublish = async () => {
    if (!selectedGeneratedImageUrl) {
      setErrorMessage('請先選擇要發佈的圖片');
      return;
    }

    try {
      setStage('image_generating'); // 藉用此狀態顯示 Loading 
      setErrorMessage(null);

      // 1. 將 Blob URL 轉換為 Base64
      const response = await fetch(selectedGeneratedImageUrl);
      const blob = await response.blob();

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result;

        // 2. 準備傳送給後端的資料
        const payload = {
          product_name: selectedProduct,
          final_text: selectedCopyText,
          image_data: base64data,
          platform: publishPlatform, // 傳送目前選中的平台：'ig', 'fb', 或 'sync'
        };

        const res = await fetch('/api/content/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (result.status === 'success') {
          // 可以加上一個成功提示，例如使用 Toast 或簡單的 alert
          alert(result.message);
          setStage('done');
        } else {
          setErrorMessage(result.message || '發佈失敗，請稍後再試');
          setStage('done');
        }
      };
    } catch (error) {
      console.error('Publish Error:', error);
      setErrorMessage('發佈過程中發生連線錯誤');
      setStage('done');
    }
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
                  disabled={isLoadingProducts || stage === 'copy_generating' || stage === 'image_generating'}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={isLoadingProducts ? "載入產品中..." : "請選擇產品"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {/* 使用從 API 取得的 products 進行渲染 */}
                    {products.length > 0 ? (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.name}>
                          {product.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        尚無產品資料
                      </SelectItem>
                    )}
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
                    <BobaProgress progress={bobaProgress} status={bobaStatus} stageText={bobaStageText} showCounter={true} size="md" />
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
              // --- 修改處：綁定點擊事件 ---
              onClick={handleConfirmPublish}
              // --- 修改處：調整 Disable 邏輯 ---
              disabled={!selectedImage || teaFlowStatus === 'running' || stage === 'image_generating'}
            >
              {/* --- 修改處：增加 Loading 圖示 --- */}
              {stage === 'image_generating' ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 處理中...</>
              ) : (
                <><Send className="w-5 h-5 mr-2" /> 確認發布</>
              )}
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
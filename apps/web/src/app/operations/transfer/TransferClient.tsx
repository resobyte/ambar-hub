'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getShelfByBarcode,
  getShelfStock,
  transferShelfStock,
  Shelf,
  ShelfStockItem,
} from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, ArrowRight, Check, Package } from 'lucide-react';

type ScreenState = 'source_shelf' | 'select_product' | 'target_shelf' | 'confirm' | 'success';
type FeedbackType = 'success' | 'error' | null;

interface SelectedProduct {
  productId: string;
  barcode: string;
  name: string;
  availableQuantity: number;
  transferQuantity: number;
}

export function TransferClient() {
  const router = useRouter();
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);

  const [screenState, setScreenState] = useState<ScreenState>('source_shelf');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [sourceBarcode, setSourceBarcode] = useState('');
  const [sourceShelf, setSourceShelf] = useState<Shelf | null>(null);
  const [sourceStock, setSourceStock] = useState<ShelfStockItem[]>([]);

  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);

  const [targetBarcode, setTargetBarcode] = useState('');
  const [targetShelf, setTargetShelf] = useState<Shelf | null>(null);

  const showError = (message: string) => {
    setFeedback('error');
    setErrorMessage(message);
    setTimeout(() => setFeedback(null), 1500);
  };

  const showSuccess = () => {
    setFeedback('success');
    setTimeout(() => setFeedback(null), 500);
  };

  const focusCurrentInput = useCallback(() => {
    setTimeout(() => {
      if (screenState === 'source_shelf') {
        sourceInputRef.current?.focus();
      } else if (screenState === 'select_product') {
        productSearchRef.current?.focus();
      } else if (screenState === 'target_shelf') {
        targetInputRef.current?.focus();
      }
    }, 100);
  }, [screenState]);

  useEffect(() => {
    focusCurrentInput();
  }, [focusCurrentInput]);

  const handleSourceScan = async () => {
    if (!sourceBarcode.trim()) return;

    setLoading(true);
    try {
      const shelfResult = await getShelfByBarcode(sourceBarcode.trim());
      if (shelfResult.success && shelfResult.data) {
        setSourceShelf(shelfResult.data);

        const stockResult = await getShelfStock(shelfResult.data.id);
        if (stockResult.success && stockResult.data) {
          const stockWithQty = stockResult.data.filter(s => s.quantity > 0);
          setSourceStock(stockWithQty);
          if (stockWithQty.length === 0) {
            showError('Bu rafta stok yok');
            setSourceBarcode('');
            setLoading(false);
            return;
          }
        }

        showSuccess();
        setTimeout(() => {
          setScreenState('select_product');
          setFeedback(null);
        }, 500);
      } else {
        showError('Raf bulunamadı');
        setSourceBarcode('');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Raf bulunamadı');
      setSourceBarcode('');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (stock: ShelfStockItem) => {
    setSelectedProduct({
      productId: stock.productId,
      barcode: stock.product?.barcode || '',
      name: stock.product?.name || 'Bilinmeyen Ürün',
      availableQuantity: stock.quantity,
      transferQuantity: stock.quantity,
    });
    showSuccess();
    setTimeout(() => {
      setScreenState('target_shelf');
      setFeedback(null);
    }, 300);
  };

  const handleProductScan = () => {
    if (!productSearch.trim()) return;

    const found = sourceStock.find(
      s =>
        s.product?.barcode?.toLowerCase() === productSearch.trim().toLowerCase() ||
        s.product?.name?.toLowerCase().includes(productSearch.trim().toLowerCase())
    );

    if (found) {
      handleProductSelect(found);
    } else {
      showError('Ürün bu rafta bulunamadı');
    }
    setProductSearch('');
  };

  const handleTargetScan = async () => {
    if (!targetBarcode.trim()) return;

    if (targetBarcode.trim() === sourceBarcode.trim()) {
      showError('Kaynak ve hedef raf aynı olamaz');
      setTargetBarcode('');
      return;
    }

    setLoading(true);
    try {
      const shelfResult = await getShelfByBarcode(targetBarcode.trim());
      if (shelfResult.success && shelfResult.data) {
        setTargetShelf(shelfResult.data);
        showSuccess();
        setTimeout(() => {
          setScreenState('confirm');
          setFeedback(null);
        }, 500);
      } else {
        showError('Hedef raf bulunamadı');
        setTargetBarcode('');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Hedef raf bulunamadı');
      setTargetBarcode('');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!sourceShelf || !targetShelf || !selectedProduct) return;

    setLoading(true);
    try {
      await transferShelfStock(
        sourceShelf.id,
        targetShelf.id,
        selectedProduct.productId,
        selectedProduct.transferQuantity
      );
      showSuccess();
      setScreenState('success');
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Transfer başarısız');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setScreenState('source_shelf');
    setSourceBarcode('');
    setSourceShelf(null);
    setSourceStock([]);
    setProductSearch('');
    setSelectedProduct(null);
    setTargetBarcode('');
    setTargetShelf(null);
    setFeedback(null);
    setErrorMessage('');
  };

  const bgColor = feedback === 'success' ? 'bg-green-500' : feedback === 'error' ? 'bg-red-500' : 'bg-background';

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300`}>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/operations')}
            className={feedback ? 'text-white hover:bg-white/20' : ''}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className={`text-xl font-bold ${feedback ? 'text-white' : ''}`}>Raf Transferi</h1>
        </div>

        {feedback === 'error' && (
          <div className="text-white text-center py-2 text-lg font-semibold mb-4">
            {errorMessage}
          </div>
        )}

        {screenState === 'source_shelf' && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20' : 'bg-card border'}`}>
              <p className={`text-sm font-medium mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                KAYNAK RAF
              </p>
              <Input
                ref={sourceInputRef}
                value={sourceBarcode}
                onChange={(e) => setSourceBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSourceScan()}
                placeholder="Raf barkodunu okutun..."
                className={`text-lg h-14 ${feedback ? 'bg-white/10 border-white/30 text-white placeholder:text-white/50' : ''}`}
                disabled={loading}
                autoFocus
              />
            </div>
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className={`w-8 h-8 animate-spin ${feedback ? 'text-white' : ''}`} />
              </div>
            )}
          </div>
        )}

        {screenState === 'select_product' && sourceShelf && (
          <div className="space-y-4">
            <div className={`rounded-xl p-3 ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
              <p className={`text-xs font-medium ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>KAYNAK RAF</p>
              <p className="font-mono font-semibold">{sourceShelf.barcode}</p>
            </div>

            <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20' : 'bg-card border'}`}>
              <p className={`text-sm font-medium mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                ÜRÜN SEÇ VEYA BARKOD OKUT
              </p>
              <Input
                ref={productSearchRef}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProductScan()}
                placeholder="Barkod veya ürün adı..."
                className={`text-lg h-12 mb-3 ${feedback ? 'bg-white/10 border-white/30 text-white placeholder:text-white/50' : ''}`}
                disabled={loading}
              />

              <ScrollArea className="h-[50vh]">
                <div className="space-y-2">
                  {sourceStock.map((stock) => (
                    <button
                      key={stock.productId}
                      onClick={() => handleProductSelect(stock)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        feedback ? 'bg-white/10 hover:bg-white/20' : 'bg-muted hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm leading-tight ${feedback ? 'text-white' : ''}`}>
                            {stock.product?.name || 'Bilinmeyen Ürün'}
                          </p>
                          <p className={`text-xs font-mono mt-1 ${feedback ? 'text-white/50' : 'text-muted-foreground'}`}>
                            {stock.product?.barcode}
                          </p>
                        </div>
                        <Badge variant="secondary" className={feedback ? 'bg-white/20 text-white' : ''}>
                          {stock.quantity} adet
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {screenState === 'target_shelf' && selectedProduct && (
          <div className="space-y-4">
            <div className={`rounded-xl p-3 ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 opacity-70" />
                <p className={`text-xs font-medium ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>ÜRÜN</p>
              </div>
              <p className="font-medium text-sm">{selectedProduct.name}</p>
              <p className={`text-xs font-mono ${feedback ? 'text-white/50' : 'text-muted-foreground'}`}>
                {selectedProduct.barcode}
              </p>
            </div>

            <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20' : 'bg-card border'}`}>
              <p className={`text-sm font-medium mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                TRANSFER ADEDİ
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={selectedProduct.availableQuantity}
                  value={selectedProduct.transferQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setSelectedProduct({
                      ...selectedProduct,
                      transferQuantity: Math.min(Math.max(1, val), selectedProduct.availableQuantity),
                    });
                  }}
                  className={`text-lg h-12 text-center ${feedback ? 'bg-white/10 border-white/30 text-white' : ''}`}
                />
                <Button
                  variant="outline"
                  onClick={() => setSelectedProduct({ ...selectedProduct, transferQuantity: selectedProduct.availableQuantity })}
                  className={feedback ? 'border-white/30 text-white hover:bg-white/20' : ''}
                >
                  Hepsi ({selectedProduct.availableQuantity})
                </Button>
              </div>
            </div>

            <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20' : 'bg-card border'}`}>
              <p className={`text-sm font-medium mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                HEDEF RAF
              </p>
              <Input
                ref={targetInputRef}
                value={targetBarcode}
                onChange={(e) => setTargetBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTargetScan()}
                placeholder="Hedef raf barkodunu okutun..."
                className={`text-lg h-14 ${feedback ? 'bg-white/10 border-white/30 text-white placeholder:text-white/50' : ''}`}
                disabled={loading}
              />
            </div>

            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className={`w-8 h-8 animate-spin ${feedback ? 'text-white' : ''}`} />
              </div>
            )}
          </div>
        )}

        {screenState === 'confirm' && sourceShelf && targetShelf && selectedProduct && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
              <p className={`text-sm font-medium mb-3 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                TRANSFER ÖZET
              </p>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 text-center">
                  <p className={`text-xs ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>KAYNAK</p>
                  <p className="font-mono font-semibold">{sourceShelf.barcode}</p>
                </div>
                <ArrowRight className="w-5 h-5 opacity-50" />
                <div className="flex-1 text-center">
                  <p className={`text-xs ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>HEDEF</p>
                  <p className="font-mono font-semibold">{targetShelf.barcode}</p>
                </div>
              </div>

              <div className={`p-3 rounded-lg ${feedback ? 'bg-white/10' : 'bg-muted'}`}>
                <p className="font-medium text-sm">{selectedProduct.name}</p>
                <p className={`text-xs font-mono ${feedback ? 'text-white/50' : 'text-muted-foreground'}`}>
                  {selectedProduct.barcode}
                </p>
                <Badge className="mt-2">{selectedProduct.transferQuantity} adet</Badge>
              </div>
            </div>

            <Button
              onClick={handleTransfer}
              disabled={loading}
              className="w-full h-14 text-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
              Transfer Et
            </Button>
          </div>
        )}

        {screenState === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Transfer Tamamlandı!</h2>
            <p className="text-muted-foreground mb-6">
              {selectedProduct?.transferQuantity} adet ürün başarıyla transfer edildi.
            </p>
            <div className="space-y-2">
              <Button onClick={resetAll} className="w-full">
                Yeni Transfer
              </Button>
              <Button variant="outline" onClick={() => router.push('/operations')} className="w-full">
                Ana Menü
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

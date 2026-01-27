'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getReceivingShelves,
  getShelfStock,
  getShelfByBarcode,
  transferShelfStock,
  Shelf,
  ShelfStockItem,
} from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, ArrowRight, Check, RotateCcw, Warehouse, ArrowLeft } from 'lucide-react';

type ScreenState = 'select_receiving_shelf' | 'select_product' | 'transfer' | 'success';
type FeedbackType = 'success' | 'error' | null;

interface TransferItem {
  productId: string;
  barcode: string;
  name: string;
  availableQuantity: number;
  transfers: { shelfId: string; shelfBarcode: string; quantity: number }[];
}

export function ReceivingClient() {
  const router = useRouter();
  const receivingShelfInputRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const [screenState, setScreenState] = useState<ScreenState>('select_receiving_shelf');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [receivingShelfBarcode, setReceivingShelfBarcode] = useState('');
  const [receivingShelf, setReceivingShelf] = useState<Shelf | null>(null);
  const [receivingStock, setReceivingStock] = useState<ShelfStockItem[]>([]);

  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<TransferItem | null>(null);

  const [targetBarcode, setTargetBarcode] = useState('');
  const [targetShelf, setTargetShelf] = useState<Shelf | null>(null);
  const [transferQuantity, setTransferQuantity] = useState(1);

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const now = new Date().toLocaleTimeString('tr-TR');
    setLogs(prev => [`${now} ${msg}`, ...prev].slice(0, 30));
  };

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
      if (screenState === 'select_receiving_shelf') {
        receivingShelfInputRef.current?.focus();
      } else if (screenState === 'select_product') {
        productSearchRef.current?.focus();
      } else if (screenState === 'transfer') {
        if (!targetShelf) {
          targetInputRef.current?.focus();
        } else {
          quantityInputRef.current?.focus();
        }
      }
    }, 100);
  }, [screenState, targetShelf]);

  useEffect(() => {
    focusCurrentInput();
  }, [focusCurrentInput]);

  const handleReceivingShelfScan = async () => {
    if (!receivingShelfBarcode.trim()) return;

    setLoading(true);
    try {
      const shelfResult = await getShelfByBarcode(receivingShelfBarcode.trim());
      if (shelfResult.success && shelfResult.data) {
        const shelf = shelfResult.data;
        
        // Only accept RECEIVING type shelves
        if (shelf.type !== 'RECEIVING') {
          showError(`Bu raf mal kabul rafı değil (Tip: ${shelf.type}). Lütfen mal kabul rafı seçin.`);
          setReceivingShelfBarcode('');
          setLoading(false);
          return;
        }

        setReceivingShelf(shelf);
        addLog(`Mal kabul rafı: ${shelf.barcode}`);

        const stockResult = await getShelfStock(shelf.id);
        if (stockResult.success && stockResult.data) {
          const stockWithQty = stockResult.data.filter(s => s.quantity > 0);
          setReceivingStock(stockWithQty);
          addLog(`${stockWithQty.length} ürün mevcut`);
        }

        setReceivingShelfBarcode('');
        setScreenState('select_product');
        showSuccess();
      } else {
        showError('Raf bulunamadı');
        setReceivingShelfBarcode('');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Raf bulunamadı');
      setReceivingShelfBarcode('');
    } finally {
      setLoading(false);
    }
  };

  const loadReceivingShelf = async () => {
    if (!receivingShelf) return;
    
    setLoading(true);
    try {
      const stockResult = await getShelfStock(receivingShelf.id);
      if (stockResult.success && stockResult.data) {
        const stockWithQty = stockResult.data.filter(s => s.quantity > 0);
        setReceivingStock(stockWithQty);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Yükleme hatası');
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
      transfers: [],
    });
    setTransferQuantity(stock.quantity);
    addLog(`Ürün seçildi: ${stock.product?.barcode}`);
    showSuccess();
    setTimeout(() => {
      setScreenState('transfer');
      setFeedback(null);
    }, 300);
  };

  const handleProductScan = () => {
    if (!productSearch.trim()) return;

    const found = receivingStock.find(
      s =>
        s.product?.barcode?.toLowerCase() === productSearch.trim().toLowerCase() ||
        s.product?.name?.toLowerCase().includes(productSearch.trim().toLowerCase())
    );

    if (found) {
      handleProductSelect(found);
    } else {
      showError('Ürün mal kabul rafında bulunamadı');
      addLog(`Ürün bulunamadı: ${productSearch.trim()}`);
    }
    setProductSearch('');
  };

  const handleTargetScan = async () => {
    if (!targetBarcode.trim()) return;

    if (receivingShelf && targetBarcode.trim() === receivingShelf.barcode) {
      showError('Hedef raf mal kabul rafı olamaz');
      setTargetBarcode('');
      return;
    }

    setLoading(true);
    try {
      const shelfResult = await getShelfByBarcode(targetBarcode.trim());
      if (shelfResult.success && shelfResult.data) {
        setTargetShelf(shelfResult.data);
        addLog(`Hedef raf: ${shelfResult.data.barcode}`);
        showSuccess();
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
    if (!receivingShelf || !targetShelf || !selectedProduct) return;

    if (transferQuantity <= 0) {
      showError('Geçersiz miktar');
      return;
    }

    if (transferQuantity > selectedProduct.availableQuantity) {
      showError(`Maksimum ${selectedProduct.availableQuantity} adet transfer edilebilir`);
      return;
    }

    setLoading(true);
    try {
      await transferShelfStock(
        receivingShelf.id,
        targetShelf.id,
        selectedProduct.productId,
        transferQuantity
      );

      addLog(`Transfer: ${transferQuantity}x → ${targetShelf.barcode}`);

      const newTransfers = [
        ...selectedProduct.transfers,
        { shelfId: targetShelf.id, shelfBarcode: targetShelf.barcode, quantity: transferQuantity },
      ];

      const newAvailable = selectedProduct.availableQuantity - transferQuantity;

      if (newAvailable <= 0) {
        showSuccess();
        setScreenState('success');
        addLog('Ürün transferi tamamlandı');
      } else {
        setSelectedProduct({
          ...selectedProduct,
          availableQuantity: newAvailable,
          transfers: newTransfers,
        });
        setTargetShelf(null);
        setTargetBarcode('');
        setTransferQuantity(newAvailable);
        showSuccess();
        addLog(`Kalan: ${newAvailable} adet`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Transfer başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleNewProduct = async () => {
    setSelectedProduct(null);
    setTargetShelf(null);
    setTargetBarcode('');
    setTransferQuantity(1);

    await loadReceivingShelf();
    setScreenState('select_product');
  };

  const handleResetReceivingShelf = () => {
    setReceivingShelf(null);
    setReceivingShelfBarcode('');
    setReceivingStock([]);
    setSelectedProduct(null);
    setTargetShelf(null);
    setTargetBarcode('');
    setTransferQuantity(1);
    setScreenState('select_receiving_shelf');
  };

  const bgColor = feedback === 'success' ? 'bg-green-500' : feedback === 'error' ? 'bg-red-500' : 'bg-background';

  const remainingQty = selectedProduct?.availableQuantity || 0;

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300`}>
      <div className="p-4 overflow-auto">
          {feedback === 'error' && (
            <div className="text-white text-center py-2 text-lg font-semibold mb-4">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/operations')}
              className={feedback ? 'text-white hover:bg-white/20' : ''}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Warehouse className="w-5 h-5" />
            <h2 className={`font-semibold ${feedback ? 'text-white' : ''}`}>Mal Kabul</h2>
            {receivingShelf && (
              <div className={`ml-auto rounded-lg px-3 py-1.5 ${feedback ? 'bg-white/20 text-white' : 'bg-muted'}`}>
                <p className={`text-xs ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>KAYNAK RAF</p>
                <p className="font-mono font-semibold text-sm">{receivingShelf.barcode}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetReceivingShelf}
                  className={`mt-1 text-xs ${feedback ? 'text-white/70 hover:text-white hover:bg-white/20' : ''}`}
                >
                  Değiştir
                </Button>
              </div>
            )}
          </div>

          {screenState === 'select_receiving_shelf' && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20' : 'bg-card border'}`}>
                <p className={`text-sm font-medium mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                  MAL KABUL RAFI BARKODUNU GİRİN
                </p>
                <Input
                  ref={receivingShelfInputRef}
                  value={receivingShelfBarcode}
                  onChange={(e) => setReceivingShelfBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReceivingShelfScan()}
                  placeholder="Mal kabul rafı barkodunu okutun..."
                  className={`text-lg h-14 ${feedback ? 'bg-white/10 border-white/30 text-white placeholder:text-white/50' : ''}`}
                  disabled={loading}
                  autoFocus
                />
                {loading && (
                  <div className="flex justify-center mt-4">
                    <Loader2 className={`w-6 h-6 animate-spin ${feedback ? 'text-white' : ''}`} />
                  </div>
                )}
              </div>
            </div>
          )}

          {screenState === 'select_product' && (
            <div className="space-y-4 max-w-lg mx-auto">
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
                  autoFocus
                />

                {receivingStock.length === 0 ? (
                  <div className={`text-center py-8 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Mal kabul rafında ürün yok</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[60vh]">
                    <div className="space-y-2">
                      {receivingStock.map((stock) => (
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
                )}
              </div>
            </div>
          )}

          {screenState === 'transfer' && selectedProduct && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 opacity-70" />
                  <p className={`text-xs font-medium ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>ÜRÜN</p>
                </div>
                <p className="font-medium">{selectedProduct.name}</p>
                <p className={`text-sm font-mono ${feedback ? 'text-white/50' : 'text-muted-foreground'}`}>
                  {selectedProduct.barcode}
                </p>
                <Badge className="mt-2" variant={feedback ? 'outline' : 'default'}>
                  Kalan: {remainingQty} adet
                </Badge>

                {selectedProduct.transfers.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${feedback ? 'border-white/20' : 'border-border'}`}>
                    <p className={`text-xs mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                      YAPILAN TRANSFERLERİ
                    </p>
                    {selectedProduct.transfers.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="font-mono">{t.shelfBarcode}</span>
                        <span>{t.quantity} adet</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20' : 'bg-card border'}`}>
                <p className={`text-sm font-medium mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                  HEDEF RAF
                </p>
                {!targetShelf ? (
                  <Input
                    ref={targetInputRef}
                    value={targetBarcode}
                    onChange={(e) => setTargetBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTargetScan()}
                    placeholder="Hedef raf barkodunu okutun..."
                    className={`text-lg h-14 ${feedback ? 'bg-white/10 border-white/30 text-white placeholder:text-white/50' : ''}`}
                    disabled={loading}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-semibold text-lg">{targetShelf.barcode}</p>
                      {targetShelf.name && targetShelf.name !== targetShelf.barcode && (
                        <p className={`text-sm ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {targetShelf.name}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTargetShelf(null);
                        setTargetBarcode('');
                      }}
                      className={feedback ? 'border-white/30 text-white hover:bg-white/20' : ''}
                    >
                      Değiştir
                    </Button>
                  </div>
                )}
              </div>

              {targetShelf && (
                <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20' : 'bg-card border'}`}>
                  <p className={`text-sm font-medium mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                    TRANSFER ADEDİ
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={quantityInputRef}
                      type="number"
                      min={1}
                      max={remainingQty}
                      value={transferQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setTransferQuantity(Math.min(Math.max(1, val), remainingQty));
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleTransfer()}
                      className={`text-lg h-12 text-center flex-1 ${feedback ? 'bg-white/10 border-white/30 text-white' : ''}`}
                    />
                    <Button
                      variant="outline"
                      onClick={() => setTransferQuantity(remainingQty)}
                      className={feedback ? 'border-white/30 text-white hover:bg-white/20' : ''}
                    >
                      Hepsi ({remainingQty})
                    </Button>
                  </div>
                </div>
              )}

              {targetShelf && (
                <Button
                  onClick={handleTransfer}
                  disabled={loading}
                  className="w-full h-14 text-lg"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="w-5 h-5 mr-2" />
                  )}
                  Transfer Et ({transferQuantity} adet)
                </Button>
              )}

              {loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className={`w-8 h-8 animate-spin ${feedback ? 'text-white' : ''}`} />
                </div>
              )}
            </div>
          )}

          {screenState === 'success' && selectedProduct && (
            <div className="text-center py-8 max-w-lg mx-auto">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Transfer Tamamlandı!</h2>
              <p className="text-muted-foreground mb-4">{selectedProduct.name}</p>

              {selectedProduct.transfers.length > 0 && (
                <div className="bg-muted rounded-xl p-4 mb-6 text-left">
                  <p className="text-sm font-medium text-muted-foreground mb-2">TRANSFERLERİ</p>
                  {selectedProduct.transfers.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1">
                      <span className="font-mono">{t.shelfBarcode}</span>
                      <Badge>{t.quantity} adet</Badge>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleNewProduct} className="w-full h-14">
                <RotateCcw className="w-5 h-5 mr-2" />
                Yeni Ürün
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}

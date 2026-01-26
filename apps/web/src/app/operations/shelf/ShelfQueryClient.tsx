'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getShelfByBarcode,
  getShelfStock,
  Shelf,
  ShelfStockItem,
} from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, LayoutGrid, Package, Search } from 'lucide-react';

type FeedbackType = 'success' | 'error' | null;

export function ShelfQueryClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [barcode, setBarcode] = useState('');
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [shelfStock, setShelfStock] = useState<ShelfStockItem[]>([]);

  const showError = (message: string) => {
    setFeedback('error');
    setErrorMessage(message);
    setTimeout(() => setFeedback(null), 1500);
  };

  const showSuccess = () => {
    setFeedback('success');
    setTimeout(() => setFeedback(null), 500);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!barcode.trim()) return;

    setLoading(true);
    setShelf(null);
    setShelfStock([]);

    try {
      const shelfResult = await getShelfByBarcode(barcode.trim());
      
      if (shelfResult.success && shelfResult.data) {
        setShelf(shelfResult.data);
        
        const stockResult = await getShelfStock(shelfResult.data.id);
        if (stockResult.success && stockResult.data) {
          setShelfStock(stockResult.data.filter(s => s.quantity > 0));
        }
        
        showSuccess();
      } else {
        showError('Raf bulunamadı');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Raf bulunamadı');
    } finally {
      setLoading(false);
      setBarcode('');
      inputRef.current?.focus();
    }
  };

  const totalStock = shelfStock.reduce((sum, s) => sum + s.quantity, 0);
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
          <h1 className={`text-xl font-bold ${feedback ? 'text-white' : ''}`}>Raf Sorgulama</h1>
        </div>

        {feedback === 'error' && (
          <div className="text-white text-center py-2 text-lg font-semibold mb-4">
            {errorMessage}
          </div>
        )}

        <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20' : 'bg-card border'} mb-4`}>
          <p className={`text-sm font-medium mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
            RAF BARKODU
          </p>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Raf barkodunu okutun..."
              className={`text-lg h-14 flex-1 ${feedback ? 'bg-white/10 border-white/30 text-white placeholder:text-white/50' : ''}`}
              disabled={loading}
              autoFocus
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !barcode.trim()}
              className="h-14 px-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className={`w-8 h-8 animate-spin ${feedback ? 'text-white' : ''}`} />
          </div>
        )}

        {shelf && !loading && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${feedback ? 'bg-white/20' : 'bg-primary/10'}`}>
                  <LayoutGrid className={`w-5 h-5 ${feedback ? 'text-white' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-mono font-bold text-xl">{shelf.barcode}</h2>
                  {shelf.name && shelf.name !== shelf.barcode && (
                    <p className={`text-sm ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {shelf.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg ${feedback ? 'bg-white/10' : 'bg-muted'}`}>
                  <p className={`text-xs ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>TOPLAM STOK</p>
                  <p className="text-2xl font-bold">{totalStock}</p>
                </div>
                <div className={`p-3 rounded-lg ${feedback ? 'bg-white/10' : 'bg-muted'}`}>
                  <p className={`text-xs ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>ÜRÜN ÇEŞİDİ</p>
                  <p className="text-2xl font-bold">{shelfStock.length}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className={feedback ? 'border-white/30 text-white' : ''}>
                  {shelf.type || 'Standart'}
                </Badge>
                {shelf.isShelvable && (
                  <Badge variant="default" className="bg-green-500">
                    Raflanabilir
                  </Badge>
                )}
              </div>
            </div>

            {shelfStock.length > 0 && (
              <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 opacity-70" />
                  <p className={`text-sm font-medium ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                    RAFTAKİ ÜRÜNLER
                  </p>
                </div>

                <ScrollArea className="max-h-[50vh]">
                  <div className="space-y-2">
                    {shelfStock.map((stock) => (
                      <div
                        key={stock.productId}
                        className={`p-3 rounded-lg ${feedback ? 'bg-white/10' : 'bg-muted'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-tight">
                              {stock.product?.name || 'Bilinmeyen Ürün'}
                            </p>
                            <p className={`text-xs font-mono mt-1 ${feedback ? 'text-white/50' : 'text-muted-foreground'}`}>
                              {stock.product?.barcode}
                            </p>
                          </div>
                          <Badge variant="default" className="text-lg px-3 py-1 shrink-0">
                            {stock.quantity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {shelfStock.length === 0 && (
              <div className={`rounded-xl p-6 text-center ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
                <Package className={`w-10 h-10 mx-auto mb-2 ${feedback ? 'text-white/50' : 'text-muted-foreground'}`} />
                <p className={feedback ? 'text-white/70' : 'text-muted-foreground'}>
                  Bu rafta ürün bulunmuyor
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

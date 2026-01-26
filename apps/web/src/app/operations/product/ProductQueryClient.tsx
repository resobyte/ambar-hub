'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getProductByBarcode,
  searchProductInShelves,
  Product,
  ShelfStock,
} from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, Package, LayoutGrid, Search } from 'lucide-react';

type FeedbackType = 'success' | 'error' | null;

export function ProductQueryClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [shelfStocks, setShelfStocks] = useState<ShelfStock[]>([]);

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
    setProduct(null);
    setShelfStocks([]);

    try {
      const productResult = await getProductByBarcode(barcode.trim());
      
      if (productResult.success && productResult.data) {
        setProduct(productResult.data);
        
        const stocks = await searchProductInShelves(barcode.trim());
        setShelfStocks(stocks);
        
        showSuccess();
      } else {
        showError('Ürün bulunamadı');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Ürün bulunamadı');
    } finally {
      setLoading(false);
      setBarcode('');
      inputRef.current?.focus();
    }
  };

  const totalStock = shelfStocks.reduce((sum, s) => sum + s.quantity, 0);
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
          <h1 className={`text-xl font-bold ${feedback ? 'text-white' : ''}`}>Ürün Sorgulama</h1>
        </div>

        {feedback === 'error' && (
          <div className="text-white text-center py-2 text-lg font-semibold mb-4">
            {errorMessage}
          </div>
        )}

        <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20' : 'bg-card border'} mb-4`}>
          <p className={`text-sm font-medium mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
            ÜRÜN BARKODU
          </p>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Barkod okutun veya yazın..."
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

        {product && !loading && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${feedback ? 'bg-white/20' : 'bg-primary/10'}`}>
                  <Package className={`w-5 h-5 ${feedback ? 'text-white' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg leading-tight">{product.name}</h2>
                  <p className={`text-sm font-mono ${feedback ? 'text-white/50' : 'text-muted-foreground'}`}>
                    {product.barcode}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg ${feedback ? 'bg-white/10' : 'bg-muted'}`}>
                  <p className={`text-xs ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>TOPLAM STOK</p>
                  <p className="text-2xl font-bold">{totalStock}</p>
                </div>
                <div className={`p-3 rounded-lg ${feedback ? 'bg-white/10' : 'bg-muted'}`}>
                  <p className={`text-xs ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>RAF SAYISI</p>
                  <p className="text-2xl font-bold">{shelfStocks.length}</p>
                </div>
              </div>

              {product.brand && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className={feedback ? 'border-white/30 text-white' : ''}>
                    {product.brand.name}
                  </Badge>
                  {product.category && (
                    <Badge variant="outline" className={feedback ? 'border-white/30 text-white' : ''}>
                      {product.category.name}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {shelfStocks.length > 0 && (
              <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <LayoutGrid className="w-4 h-4 opacity-70" />
                  <p className={`text-sm font-medium ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                    RAF KONUMLARI
                  </p>
                </div>

                <ScrollArea className="max-h-[40vh]">
                  <div className="space-y-2">
                    {shelfStocks.map((stock, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${feedback ? 'bg-white/10' : 'bg-muted'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono font-semibold">{stock.shelf.barcode}</p>
                            <p className={`text-xs ${feedback ? 'text-white/50' : 'text-muted-foreground'}`}>
                              {stock.warehouse.name}
                            </p>
                          </div>
                          <Badge variant="default" className="text-lg px-3 py-1">
                            {stock.quantity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {shelfStocks.length === 0 && (
              <div className={`rounded-xl p-6 text-center ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
                <LayoutGrid className={`w-10 h-10 mx-auto mb-2 ${feedback ? 'text-white/50' : 'text-muted-foreground'}`} />
                <p className={feedback ? 'text-white/70' : 'text-muted-foreground'}>
                  Bu ürün hiçbir rafta bulunmuyor
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

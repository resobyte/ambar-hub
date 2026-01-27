'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getRouteByName,
  getPickingProgress,
  scanPickingShelf,
  scanPickingBarcode,
  Route,
  PickingProgress,
  PickingItem,
} from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, MapPin, CheckCircle2, Package, ArrowRight, ArrowLeft, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ScreenState = 'route_input' | 'collecting';
type FeedbackType = 'success' | 'error' | null;

export function CollectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeInputRef = useRef<HTMLInputElement>(null);
  const shelfInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  // Route input state
  const [routeBarcode, setRouteBarcode] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('route_input');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);

  // Collecting state
  const [route, setRoute] = useState<Route | null>(null);
  const [progress, setProgress] = useState<PickingProgress | null>(null);
  const [shelfValidated, setShelfValidated] = useState(false);
  const [shelfBarcode, setShelfBarcode] = useState('');
  const [productBarcode, setProductBarcode] = useState('');
  const [currentShelf, setCurrentShelf] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // ROUTE_LENGTH = 7 (R000001)
  const ROUTE_LENGTH = 7;

  // Load route from URL on mount
  useEffect(() => {
    const routeParam = searchParams.get('route');
    if (routeParam && initialLoad) {
      setInitialLoad(false);
      loadRouteById(routeParam);
    } else if (!routeParam && initialLoad) {
      setInitialLoad(false);
    }
  }, [searchParams, initialLoad]);

  // Load route by ID (for URL param)
  const loadRouteById = async (routeId: string) => {
    setLoading(true);
    try {
      const progressResponse = await getPickingProgress(routeId);
      if (progressResponse.success && progressResponse.data) {
        setProgress(progressResponse.data);
        setRoute({ id: routeId, name: progressResponse.data.routeName } as Route);
        setScreenState('collecting');
      } else {
        // Invalid route, clear URL
        router.replace('/operations/collect');
      }
    } catch (err) {
      router.replace('/operations/collect');
    } finally {
      setLoading(false);
    }
  };

  // Focus management helper
  const focusCurrentInput = useCallback(() => {
    setTimeout(() => {
      if (screenState === 'route_input') {
        routeInputRef.current?.focus();
      } else if (screenState === 'collecting') {
        if (!shelfValidated) {
          shelfInputRef.current?.focus();
        } else {
          productInputRef.current?.focus();
        }
      }
    }, 100);
  }, [screenState, shelfValidated]);

  // Auto-focus on screen state change
  useEffect(() => {
    focusCurrentInput();
  }, [screenState, focusCurrentInput]);

  // Auto-focus when shelf validation changes
  useEffect(() => {
    focusCurrentInput();
  }, [shelfValidated, focusCurrentInput]);

  // Auto-focus when progress changes
  useEffect(() => {
    if (progress && !progress.isComplete) {
      focusCurrentInput();
    }
  }, [progress, focusCurrentInput]);

  // Clear feedback after delay and refocus
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
        setErrorMessage('');
        focusCurrentInput();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [feedback, focusCurrentInput]);

  // Handle route barcode input
  const handleRouteBarcodeChange = async (value: string) => {
    setRouteBarcode(value);

    // Auto-search when length matches
    if (value.length === ROUTE_LENGTH) {
      await searchRoute(value);
    }
  };

  const searchRoute = async (barcode: string) => {
    setLoading(true);
    try {
      const response = await getRouteByName(barcode);
      if (response.success && response.data) {
        setRoute(response.data);
        // Load progress
        const progressResponse = await getPickingProgress(response.data.id);
        if (progressResponse.success && progressResponse.data) {
          setProgress(progressResponse.data);
          setFeedback('success');
          // Update URL with route ID
          router.replace(`/operations/collect?route=${response.data.id}`, { scroll: false });
          setTimeout(() => {
            setScreenState('collecting');
            setFeedback(null);
          }, 500);
        }
      } else {
        showError('Rota bulunamadı');
      }
    } catch (err: any) {
      showError(err.message || 'Rota bulunamadı');
    } finally {
      setLoading(false);
      setRouteBarcode('');
      // Re-focus input after state updates
      focusCurrentInput();
    }
  };

  const showError = (message: string) => {
    setFeedback('error');
    setErrorMessage(message);
    setRouteBarcode('');
  };

  const showSuccess = () => {
    setFeedback('success');
  };

  // Handle shelf scan
  const handleShelfScan = async () => {
    if (!shelfBarcode.trim() || !route) return;

    setLoading(true);
    try {
      const result = await scanPickingShelf(route.id, shelfBarcode.trim());
      if (result.success) {
        setCurrentShelf(shelfBarcode.trim());
        setShelfValidated(true);
        showSuccess();
      } else {
        setFeedback('error');
        setErrorMessage(result.message || 'Yanlış raf!');
      }
    } catch (err: any) {
      setFeedback('error');
      setErrorMessage(err.message || 'Raf doğrulanamadı');
    } finally {
      setShelfBarcode('');
      setLoading(false);
      focusCurrentInput();
    }
  };


  // Handle product scan
  const handleProductScan = async () => {
    if (!productBarcode.trim() || !route) return;

    setLoading(true);
    try {
      const result = await scanPickingBarcode(route.id, productBarcode.trim(), quantity);
      if (result.success) {
        showSuccess();
        if (result.data.progress) {
          setProgress(result.data.progress);

          // Check if item complete or shelf changed
          const pendingItems = result.data.progress.items.filter(i => !i.isComplete);
          if (pendingItems.length > 0) {
            const nextItem = pendingItems[0];
            const nextShelfName = getShelfName(nextItem.shelfLocation);
            
            // If shelf changed, require new shelf scan
            if (nextShelfName !== currentShelf) {
              setShelfValidated(false);
              setCurrentShelf(null);
            }
          }

          // Reset quantity to 1 after successful scan
          setQuantity(1);

          // Check if complete
          if (result.data.progress.isComplete) {
            setTimeout(() => {
              setScreenState('route_input');
              setRoute(null);
              setProgress(null);
              setShelfValidated(false);
              setCurrentShelf(null);
              setQuantity(1);
              // Clear URL
              router.replace('/operations/collect', { scroll: false });
            }, 1500);
          }
        }
      } else {
        setFeedback('error');
        setErrorMessage(result.message || 'Ürün okutulamadı');
      }
    } catch (err: any) {
      setFeedback('error');
      setErrorMessage(err.message || 'Ürün okutulamadı');
    } finally {
      setProductBarcode('');
      setLoading(false);
      focusCurrentInput();
    }
  };

  // Get short shelf name (last part)
  const getShelfName = (shelfLocation?: string): string => {
    if (!shelfLocation) return '';
    const parts = shelfLocation.split(' > ');
    return parts[parts.length - 1] || shelfLocation;
  };

  // Get pending and next items
  const pendingItems = progress?.items.filter(i => !i.isComplete) || [];
  const currentItem = pendingItems[0];
  const nextItem = pendingItems[1];
  const progressPercent = progress
    ? Math.round((progress.pickedItems / progress.totalItems) * 100)
    : 0;
  const hasProductsNeedingTransfer = progress?.productsNeedingTransfer && progress.productsNeedingTransfer.length > 0;

  // Background color based on feedback
  const getBgClass = () => {
    if (feedback === 'success') return 'bg-green-500';
    if (feedback === 'error') return 'bg-red-500';
    return 'bg-background';
  };

  // Route input screen
  if (screenState === 'route_input') {
    return (
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center transition-colors duration-300 ${getBgClass()}`}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/operations')}
          className={`absolute top-4 left-4 ${feedback ? 'text-white hover:bg-white/20' : ''}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="text-center space-y-8 w-full max-w-md px-4">
          <div className={`transition-colors duration-300 ${feedback ? 'text-white' : ''}`}>
            <Package className="w-20 h-20 mx-auto mb-4 opacity-50" />
            <h1 className="text-3xl font-bold mb-2">Toplamaya Başla</h1>
            <p className="text-lg opacity-70">Rota barkodunu okutun</p>
          </div>

          <Input
            ref={routeInputRef}
            type="text"
            value={routeBarcode}
            onChange={(e) => handleRouteBarcodeChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && routeBarcode.length >= ROUTE_LENGTH) {
                searchRoute(routeBarcode);
              }
            }}
            className={`text-center text-3xl h-20 font-mono tracking-widest ${
              feedback === 'error' ? 'border-white bg-white/20 text-white placeholder:text-white/50' : ''
            }`}
            placeholder="R000001"
            autoFocus
            disabled={loading}
            maxLength={ROUTE_LENGTH}
          />

          {loading && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className={`w-6 h-6 animate-spin ${feedback ? 'text-white' : ''}`} />
              <span className={feedback ? 'text-white' : ''}>Aranıyor...</span>
            </div>
          )}

          {feedback === 'error' && errorMessage && (
            <p className="text-white text-xl font-semibold">{errorMessage}</p>
          )}
        </div>
      </div>
    );
  }

  // Collecting screen
  if (screenState === 'collecting' && progress) {
    return (
      <div
        className={`fixed inset-0 flex flex-col transition-colors duration-300 ${getBgClass()}`}
      >
        {/* Header */}
        <div className={`p-4 border-b ${feedback ? 'border-white/20' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/operations')}
                className={feedback ? 'text-white hover:bg-white/20' : ''}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className={feedback ? 'text-white' : ''}>
                <h1 className="text-xl font-bold">{progress.routeName}</h1>
                <p className="text-sm opacity-70">
                  {progress.totalOrders} sipariş • {progress.pickedItems}/{progress.totalItems} ürün
                </p>
              </div>
            </div>
            <Badge
              variant={feedback ? 'outline' : 'secondary'}
              className={`text-2xl px-4 py-2 ${feedback ? 'border-white text-white' : ''}`}
            >
              %{progressPercent}
            </Badge>
          </div>
          <Progress
            value={progressPercent}
            className={`h-3 ${feedback ? 'bg-white/30' : ''}`}
          />
        </div>

        {/* Products Needing Transfer Warning */}
        {progress.productsNeedingTransfer && progress.productsNeedingTransfer.length > 0 && (
          <div className="mx-4 mt-4 p-4 rounded-lg border border-red-300 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="font-semibold text-red-800">
                  Transfer Edilmesi Gereken Ürünler
                </p>
                <p className="text-sm text-red-700">
                  Aşağıdaki ürünler için satılabilir stok yetersiz. Transfer yapılana kadar toplama işlemi yapılamaz:
                </p>
                <div className="mt-3 space-y-2">
                  {progress.productsNeedingTransfer.map((product, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-md border border-red-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{product.productName}</p>
                          <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                            {product.barcode}
                          </code>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Gerekli</p>
                          <p className="font-semibold text-red-600">{product.requiredQuantity} adet</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Satılamaz rafta: <span className="font-medium text-amber-600">{product.availableInNonSellable} adet</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-red-200">
                  <p className="text-sm text-red-700 font-medium">
                    ⚠️ Transfer işlemi tamamlanana kadar toplama yapılamaz.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
                    onClick={() => router.push('/operations/transfer')}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Transfer Sayfasına Git
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Completion State */}
          {progress.isComplete ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white">
              <CheckCircle2 className="w-24 h-24 mb-4" />
              <h2 className="text-3xl font-bold mb-2">Tamamlandı!</h2>
              <p className="text-xl opacity-80">Tüm ürünler toplandı</p>
            </div>
          ) : (
            <>
              {/* Shelf Info - Compact */}
              {currentItem && (
                <div className="space-y-2">
                  {/* Current Shelf */}
                  <div
                    className={`rounded-lg p-3 flex items-center justify-between ${
                      feedback
                        ? 'bg-white/20'
                        : shelfValidated
                        ? 'bg-green-500 text-white'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-6 h-6" />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                          {shelfValidated ? 'DOĞRU RAFTA' : 'SIRADAKİ RAF'}
                        </p>
                        <span className="text-2xl font-bold">
                          {getShelfName(currentItem.shelfLocation)}
                        </span>
                      </div>
                    </div>
                    {shelfValidated && <CheckCircle2 className="w-6 h-6" />}
                  </div>

                  {/* Next Shelf Preview */}
                  {nextItem && getShelfName(nextItem.shelfLocation) !== getShelfName(currentItem?.shelfLocation) && (
                    <div className={`rounded-lg px-3 py-2 ${feedback ? 'bg-white/10 text-white' : 'bg-muted'}`}>
                      <div className="flex items-center gap-2 text-sm opacity-70">
                        <ArrowRight className="w-4 h-4" />
                        <span>Sonraki:</span>
                        <span className="font-semibold">{getShelfName(nextItem.shelfLocation)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Product Info */}
              {currentItem && (
                <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
                  <p className="font-medium text-lg mb-1 line-clamp-2">{currentItem.productName}</p>
                  <div className="flex items-center justify-between">
                    <code className={`text-sm font-mono ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {currentItem.barcode}
                    </code>
                    <Badge variant={feedback ? 'outline' : 'secondary'} className={`text-lg px-3 ${feedback ? 'border-white text-white' : ''}`}>
                      {currentItem.pickedQuantity}/{currentItem.totalQuantity}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="mt-auto">
                {!shelfValidated ? (
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${feedback ? 'text-white' : ''}`}>
                      Önce rafı okutun
                    </label>
                    <Input
                      ref={shelfInputRef}
                      type="text"
                      value={shelfBarcode}
                      onChange={(e) => setShelfBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleShelfScan();
                      }}
                      className={`text-center text-2xl h-16 font-mono ${
                        feedback === 'error' ? 'border-white bg-white/20 text-white' : ''
                      }`}
                      placeholder="Raf barkodu"
                      autoFocus
                      disabled={loading || hasProductsNeedingTransfer}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Product Barcode Input */}
                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${feedback ? 'text-white' : ''}`}>
                        Ürünü okutun
                      </label>
                      <Input
                        ref={productInputRef}
                        type="text"
                        value={productBarcode}
                        onChange={(e) => setProductBarcode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleProductScan();
                        }}
                        className={`text-center text-2xl h-16 font-mono ${
                          feedback === 'error' ? 'border-white bg-white/20 text-white' : ''
                        }`}
                        placeholder="Ürün barkodu"
                        autoFocus
                        disabled={loading || hasProductsNeedingTransfer}
                      />
                    </div>

                    {/* Quantity Input - Free text */}
                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${feedback ? 'text-white' : ''}`}>
                        Adet
                      </label>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className={`text-center text-2xl h-14 font-mono ${
                          feedback === 'error' ? 'border-white bg-white/20 text-white' : ''
                        }`}
                        placeholder="1"
                        min={1}
                        disabled={loading || hasProductsNeedingTransfer}
                      />
                    </div>
                  </div>
                )}

                {feedback === 'error' && errorMessage && (
                  <p className="text-white text-center text-lg font-semibold mt-4">
                    {errorMessage}
                  </p>
                )}

                {loading && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Loader2 className={`w-6 h-6 animate-spin ${feedback ? 'text-white' : ''}`} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}

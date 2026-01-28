'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getRouteByNameForPacking,
  startPackingSession,
  findOrderByProductBarcode,
  confirmProductScan,
  completePackingOrder,
  getCargoLabel,
  getConsumableByBarcode,
  getPackingSession,
  Order,
  PackingSession,
  PackingOrderItem,
} from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, CheckCircle2, Printer, Box, Truck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function openLabelForPrint(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

type ScreenState = 
  | 'route_input'
  | 'find_order'
  | 'scanning'
  | 'consumable'
  | 'printing'
  | 'complete';

type FeedbackType = 'success' | 'error' | null;

interface CurrentOrderState {
  order: Order;
  items: PackingOrderItem[];
}

export function PackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeInputRef = useRef<HTMLInputElement>(null);
  const findOrderInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const consumableInputRef = useRef<HTMLInputElement>(null);

  const [screenState, setScreenState] = useState<ScreenState>('route_input');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);

  const [routeBarcode, setRouteBarcode] = useState('');
  const [session, setSession] = useState<PackingSession | null>(null);
  const [currentOrder, setCurrentOrder] = useState<CurrentOrderState | null>(null);
  const [productBarcode, setProductBarcode] = useState('');
  const [consumableBarcode, setConsumableBarcode] = useState('');

  const [logs, setLogs] = useState<string[]>([]);
  const [remainingOrders, setRemainingOrders] = useState(0);

  const ROUTE_LENGTH = 7;

  const addLog = useCallback((msg: string) => {
    const now = new Date().toLocaleTimeString('tr-TR');
    setLogs(prev => [`${now} ${msg}`, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    const sessionParam = searchParams.get('session');
    if (sessionParam && initialLoad) {
      setInitialLoad(false);
      loadSession(sessionParam);
    } else if (!sessionParam && initialLoad) {
      setInitialLoad(false);
    }
  }, [searchParams, initialLoad]);

  const loadSession = async (sessionId: string) => {
    setLoading(true);
    try {
      const response = await getPackingSession(sessionId);
      if (response.success && response.data) {
        const sess = response.data;
        setSession(sess);
        const remaining = sess.totalOrders - sess.packedOrders;
        setRemainingOrders(remaining);
        
        if (remaining === 1 && sess.items && sess.items.length > 0) {
          const unpackedItems = sess.items.filter(i => !i.isComplete);
          if (unpackedItems.length > 0) {
            const firstItem = unpackedItems[0];
            if (firstItem.order) {
              const allItemsForOrder = sess.items.filter(i => i.orderId === firstItem.orderId);
              setCurrentOrder({
                order: firstItem.order,
                items: allItemsForOrder,
              });
              addLog(`Sipariş: ${firstItem.order.orderNumber}`);
            }
          }
          setScreenState('scanning');
        } else if (remaining > 1) {
          setScreenState('find_order');
          addLog(`${remaining} sipariş kaldı`);
        } else {
          setScreenState('scanning');
        }
      } else {
        router.replace('/operations/pack');
      }
    } catch {
      router.replace('/operations/pack');
    } finally {
      setLoading(false);
    }
  };

  const focusCurrentInput = useCallback(() => {
    setTimeout(() => {
      switch (screenState) {
        case 'route_input':
          routeInputRef.current?.focus();
          break;
        case 'find_order':
          findOrderInputRef.current?.focus();
          break;
        case 'scanning':
          scanInputRef.current?.focus();
          break;
        case 'consumable':
          consumableInputRef.current?.focus();
          break;
      }
    }, 100);
  }, [screenState]);

  useEffect(() => {
    focusCurrentInput();
  }, [screenState, focusCurrentInput]);

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

  const showError = (message: string) => {
    setFeedback('error');
    setErrorMessage(message);
    addLog(`HATA: ${message}`);
  };

  const showSuccess = () => {
    setFeedback('success');
  };

  const handleRouteBarcodeChange = async (value: string) => {
    setRouteBarcode(value);
    if (value.length === ROUTE_LENGTH) {
      await searchRoute(value);
    }
  };

  const searchRoute = async (barcode: string) => {
    setLoading(true);
    try {
      const response = await getRouteByNameForPacking(barcode);
      if (response.success && response.data) {
        const sessionResponse = await startPackingSession(response.data.id);
        if (sessionResponse.success && sessionResponse.data) {
          const sess = sessionResponse.data;
          setSession(sess);
          setRemainingOrders(sess.totalOrders);
          router.replace(`/operations/pack?session=${sess.id}`, { scroll: false });
          addLog(`Rota ${barcode} seçildi - ${sess.totalOrders} sipariş`);
          showSuccess();
          
          setTimeout(async () => {
            if (sess.totalOrders === 1 && sess.items && sess.items.length > 0) {
              const firstItem = sess.items[0];
              if (firstItem.order) {
                const allItemsForOrder = sess.items.filter(i => i.orderId === firstItem.orderId);
                setCurrentOrder({
                  order: firstItem.order,
                  items: allItemsForOrder,
                });
                addLog(`Sipariş: ${firstItem.order.orderNumber}`);
              }
              setScreenState('scanning');
            } else {
              setScreenState('find_order');
            }
            setFeedback(null);
          }, 500);
        } else {
          showError(sessionResponse.message || 'Paketleme başlatılamadı');
        }
      } else {
        showError('Rota bulunamadı');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Rota bulunamadı');
    } finally {
      setLoading(false);
      setRouteBarcode('');
      focusCurrentInput();
    }
  };

  const handleFindOrderScan = async () => {
    if (!productBarcode.trim() || !session) return;

    setLoading(true);
    try {
      const result = await findOrderByProductBarcode(session.id, productBarcode.trim());
      if (result.success && result.data?.order) {
        setCurrentOrder({
          order: result.data.order,
          items: result.data.allItemsForOrder || [],
        });
        addLog(`Sipariş bulundu: ${result.data.order.orderNumber}`);
        showSuccess();
        setTimeout(() => {
          setScreenState('scanning');
          setFeedback(null);
        }, 500);
      } else {
        showError(result.message || 'Ürün bulunamadı');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Ürün bulunamadı');
    } finally {
      setProductBarcode('');
      setLoading(false);
      focusCurrentInput();
    }
  };

  const handleProductScan = async () => {
    if (!productBarcode.trim() || !session) return;

    setLoading(true);
    try {
      let orderId = currentOrder?.order.id;
      
      if (!orderId) {
        const findResult = await findOrderByProductBarcode(session.id, productBarcode.trim());
        if (findResult.success && findResult.data?.order) {
          setCurrentOrder({
            order: findResult.data.order,
            items: findResult.data.allItemsForOrder || [],
          });
          orderId = findResult.data.order.id;
          addLog(`Sipariş: ${findResult.data.order.orderNumber}`);
        } else {
          showError(findResult.message || 'Ürün bulunamadı');
          setProductBarcode('');
          setLoading(false);
          focusCurrentInput();
          return;
        }
      }

      const result = await confirmProductScan(session.id, productBarcode.trim(), orderId);

      if (result.success) {
        addLog(`Ürün tarandı: ${productBarcode.trim()}`);
        
        if (result.data?.orderComplete) {
          addLog('Sipariş ürünleri tamamlandı');
          showSuccess();
          
          const routeConsumables = session.route?.routeConsumables;
          if (routeConsumables && routeConsumables.length > 0) {
            setTimeout(() => {
              completeOrderWithRouteConsumable(orderId!);
            }, 500);
          } else {
            setTimeout(() => {
              setScreenState('consumable');
              setFeedback(null);
            }, 500);
          }
        } else {
          setCurrentOrder(prev => prev ? {
            ...prev,
            items: result.data?.allItemsForOrder || prev.items,
          } : null);
          showSuccess();
        }
      } else {
        showError(result.message || 'Tarama başarısız');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'Tarama başarısız');
    } finally {
      setProductBarcode('');
      setLoading(false);
      focusCurrentInput();
    }
  };

  const completeOrderWithRouteConsumable = async (orderId: string) => {
    if (!session || !currentOrder) return;

    setLoading(true);
    try {
      const routeConsumables = session.route?.routeConsumables || [];
      const consumablesToSend = routeConsumables.map(rc => ({
        consumableId: rc.consumableId,
        quantity: Number(rc.quantity) || 1,
      }));

      const consumableNames = routeConsumables
        .map(rc => rc.consumable?.name || 'Sarf malzeme')
        .join(', ');
      addLog(`Ön tanımlı sarf: ${consumableNames}`);

      const completeResult = await completePackingOrder(
        session.id,
        orderId,
        consumablesToSend
      );

      if (completeResult.success) {
        setScreenState('printing');
        addLog('Sipariş tamamlandı, etiket yazdırılıyor...');
        showSuccess();

        const labelResult = await getCargoLabel(orderId);

        if (labelResult.success && labelResult.data?.html) {
          openLabelForPrint(labelResult.data.html);
          addLog('Etiket sekmede açıldı, yazdırma iletişim kutusu açılacak');
        } else {
          addLog('Etiket bulunamadı');
        }

        setTimeout(async () => {
          if (completeResult.data?.sessionComplete) {
            setScreenState('complete');
            addLog('Tüm siparişler tamamlandı!');
          } else {
            const updatedSession = await getPackingSession(session.id);
            if (updatedSession.success && updatedSession.data) {
              const sess = updatedSession.data;
              setSession(sess);
              const newRemaining = sess.totalOrders - sess.packedOrders;
              setRemainingOrders(newRemaining);
              
              if (newRemaining === 1 && sess.items) {
                const unpackedItems = sess.items.filter(i => !i.isComplete);
                if (unpackedItems.length > 0) {
                  const firstItem = unpackedItems[0];
                  if (firstItem.order) {
                    const allItemsForOrder = sess.items.filter(i => i.orderId === firstItem.orderId);
                    setCurrentOrder({
                      order: firstItem.order,
                      items: allItemsForOrder,
                    });
                    addLog(`Sipariş: ${firstItem.order.orderNumber}`);
                  }
                }
                setScreenState('scanning');
              } else {
                setCurrentOrder(null);
                setScreenState('find_order');
                addLog(`${newRemaining} sipariş kaldı`);
              }
            }
            setFeedback(null);
          }
        }, 2000);
      } else {
        showError(completeResult.message || 'Sipariş tamamlanamadı');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'İşlem başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleConsumableScan = async () => {
    if (!consumableBarcode.trim() || !session || !currentOrder) return;

    setLoading(true);
    try {
      const consumableResult = await getConsumableByBarcode(consumableBarcode.trim());
      if (!consumableResult.success || !consumableResult.data) {
        showError('Sarf malzeme bulunamadı');
        setConsumableBarcode('');
        setLoading(false);
        focusCurrentInput();
        return;
      }

      const consumable = consumableResult.data;
      addLog(`Sarf malzeme: ${consumable.name}`);

      const completeResult = await completePackingOrder(
        session.id,
        currentOrder.order.id,
        [{ consumableId: consumable.id, quantity: 1 }]
      );

      if (completeResult.success) {
        setScreenState('printing');
        addLog('Sipariş tamamlandı, etiket yazdırılıyor...');
        showSuccess();

        const labelResult = await getCargoLabel(currentOrder.order.id);

        if (labelResult.success && labelResult.data?.html) {
          openLabelForPrint(labelResult.data.html);
          addLog('Etiket sekmede açıldı, yazdırma iletişim kutusu açılacak');
        } else {
          addLog('Etiket bulunamadı');
        }

        setTimeout(async () => {
          if (completeResult.data?.sessionComplete) {
            setScreenState('complete');
            addLog('Tüm siparişler tamamlandı!');
          } else {
            const updatedSession = await getPackingSession(session.id);
            if (updatedSession.success && updatedSession.data) {
              const sess = updatedSession.data;
              setSession(sess);
              const newRemaining = sess.totalOrders - sess.packedOrders;
              setRemainingOrders(newRemaining);
              
              if (newRemaining === 1 && sess.items) {
                const unpackedItems = sess.items.filter(i => !i.isComplete);
                if (unpackedItems.length > 0) {
                  const firstItem = unpackedItems[0];
                  if (firstItem.order) {
                    const allItemsForOrder = sess.items.filter(i => i.orderId === firstItem.orderId);
                    setCurrentOrder({
                      order: firstItem.order,
                      items: allItemsForOrder,
                    });
                    addLog(`Sipariş: ${firstItem.order.orderNumber}`);
                  }
                }
                setScreenState('scanning');
              } else {
                setCurrentOrder(null);
                setScreenState('find_order');
                addLog(`${newRemaining} sipariş kaldı`);
              }
            }
            setFeedback(null);
          }
        }, 2000);
      } else {
        showError(completeResult.message || 'Sipariş tamamlanamadı');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError(error.message || 'İşlem başarısız');
    } finally {
      setConsumableBarcode('');
      setLoading(false);
    }
  };

  const getBgClass = () => {
    if (feedback === 'success') return 'bg-green-500';
    if (feedback === 'error') return 'bg-red-500';
    return 'bg-background';
  };

  const getProgressPercent = () => {
    if (!session) return 0;
    return Math.round((session.packedOrders / session.totalOrders) * 100);
  };

  const LogPanel = () => (
    <div className={`w-full h-full flex flex-col ${feedback ? 'bg-white/10' : 'bg-muted/50'} rounded-lg p-2`}>
      <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
        İŞLEM GEÇMİŞİ
      </p>
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {logs.length === 0 ? (
            <p className={`text-xs ${feedback ? 'text-white/50' : 'text-muted-foreground'}`}>
              Henüz işlem yok
            </p>
          ) : (
            logs.map((log, idx) => (
              <p key={idx} className={`text-xs ${feedback ? 'text-white/80' : 'text-foreground'}`}>
                {log}
              </p>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const OrderInfoCard = ({ order, items }: { order: Order; items: PackingOrderItem[] }) => {
    const completedItems = items.filter(i => i.isComplete).length;
    const totalItems = items.length;

    return (
      <div className={`rounded-xl p-4 ${feedback ? 'bg-white/20 text-white' : 'bg-card border'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 opacity-70" />
            <span className="font-mono font-semibold">
              {order.cargoTrackingNumber || '-'}
            </span>
          </div>
          <Badge variant={feedback ? 'outline' : 'secondary'} className={feedback ? 'border-white text-white' : ''}>
            #{order.orderNumber}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-sm ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
            {totalItems} ürün
          </span>
          <Badge variant={completedItems === totalItems ? 'default' : 'outline'}>
            {completedItems}/{totalItems} tarandı
          </Badge>
        </div>
      </div>
    );
  };

  const getProductName = (barcode: string, order: Order | undefined): string => {
    if (!order?.items) return barcode;
    const orderItem = order.items.find(i => i.barcode === barcode);
    return orderItem?.productName || barcode;
  };

  if (screenState === 'route_input') {
    return (
      <div className={`fixed inset-0 flex flex-col items-center justify-center transition-colors duration-300 ${getBgClass()}`}>
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
            <Box className="w-20 h-20 mx-auto mb-4 opacity-50" />
            <h1 className="text-3xl font-bold mb-2">Paketlemeye Başla</h1>
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

  if (screenState === 'find_order' && session) {
    return (
      <div className={`fixed inset-0 flex flex-col transition-colors duration-300 ${getBgClass()}`}>
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
                <h1 className="text-xl font-bold">{session.route?.name || 'Paketleme'}</h1>
                <p className="text-sm opacity-70">
                  {session.packedOrders}/{session.totalOrders} sipariş paketlendi
                </p>
              </div>
            </div>
            <Badge
              variant={feedback ? 'outline' : 'secondary'}
              className={`text-2xl px-4 py-2 ${feedback ? 'border-white text-white' : ''}`}
            >
              %{getProgressPercent()}
            </Badge>
          </div>
          <Progress value={getProgressPercent()} className={`h-3 ${feedback ? 'bg-white/30' : ''}`} />
        </div>

        <div className="flex-1 flex gap-4 p-4 min-h-0">
          <div className="w-1/3 min-h-0">
            <LogPanel />
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div className={`rounded-xl p-6 text-center ${feedback ? 'bg-white/20 text-white' : 'bg-muted'}`}>
              <Package className={`w-12 h-12 mx-auto mb-3 ${feedback ? 'text-white' : 'text-muted-foreground'}`} />
              <h2 className="text-xl font-bold mb-1">Ürün Barkodu Okutun</h2>
              <p className={`text-sm ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                Siparişi bulmak için herhangi bir ürün barkodu okutun
              </p>
              <p className={`text-lg font-semibold mt-2 ${feedback ? 'text-white' : 'text-primary'}`}>
                {remainingOrders} sipariş bekliyor
              </p>
            </div>

            <div className="mt-auto space-y-2">
              <Input
                ref={findOrderInputRef}
                type="text"
                value={productBarcode}
                onChange={(e) => setProductBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFindOrderScan();
                }}
                className={`text-center text-2xl h-16 font-mono ${
                  feedback === 'error' ? 'border-white bg-white/20 text-white' : ''
                }`}
                placeholder="Ürün barkodu"
                autoFocus
                disabled={loading}
              />

              {feedback === 'error' && errorMessage && (
                <p className="text-white text-center text-lg font-semibold mt-4">{errorMessage}</p>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Loader2 className={`w-6 h-6 animate-spin ${feedback ? 'text-white' : ''}`} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screenState === 'scanning' && session) {
    return (
      <div className={`fixed inset-0 flex flex-col transition-colors duration-300 ${getBgClass()}`}>
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
                <h1 className="text-xl font-bold">{session.route?.name || 'Paketleme'}</h1>
                <p className="text-sm opacity-70">
                  {session.packedOrders}/{session.totalOrders} sipariş paketlendi
                </p>
              </div>
            </div>
            <Badge
              variant={feedback ? 'outline' : 'secondary'}
              className={`text-2xl px-4 py-2 ${feedback ? 'border-white text-white' : ''}`}
            >
              %{getProgressPercent()}
            </Badge>
          </div>
          <Progress value={getProgressPercent()} className={`h-3 ${feedback ? 'bg-white/30' : ''}`} />
        </div>

        <div className="flex-1 flex gap-4 p-4 min-h-0">
          <div className="w-1/3 min-h-0">
            <LogPanel />
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-auto">
            {currentOrder ? (
              <>
                <OrderInfoCard order={currentOrder.order} items={currentOrder.items} />

                <div className={`rounded-xl p-3 flex-1 overflow-auto ${feedback ? 'bg-white/10 text-white' : 'bg-muted'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                    SİPARİŞ ÜRÜNLERİ
                  </p>
                  <div className="space-y-3">
                    {currentOrder.items.map((item, idx) => (
                      <div key={idx} className={`p-2 rounded-lg ${item.isComplete ? (feedback ? 'bg-white/10' : 'bg-green-500/10 border border-green-500/30') : (feedback ? 'bg-white/5' : 'bg-background border')}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm leading-tight ${item.isComplete ? (feedback ? 'text-white/70' : 'text-green-700') : ''}`}>
                              {getProductName(item.barcode, currentOrder.order)}
                            </p>
                            <p className={`text-xs font-mono mt-1 ${feedback ? 'text-white/50' : 'text-muted-foreground'}`}>
                              {item.barcode}
                            </p>
                          </div>
                          <Badge variant={item.isComplete ? 'default' : 'outline'} className={`text-xs shrink-0 ${item.isComplete ? 'bg-green-500' : ''}`}>
                            {item.scannedQuantity}/{item.requiredQuantity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className={`rounded-xl p-6 text-center ${feedback ? 'bg-white/20 text-white' : 'bg-muted'}`}>
                <Package className={`w-12 h-12 mx-auto mb-3 ${feedback ? 'text-white' : 'text-muted-foreground'}`} />
                <h2 className="text-xl font-bold mb-1">Ürün Barkodu Okutun</h2>
                <p className={`text-sm ${feedback ? 'text-white/70' : 'text-muted-foreground'}`}>
                  Sipariş bilgisi yükleniyor...
                </p>
              </div>
            )}

            <div className="mt-auto space-y-2">
              <Input
                ref={scanInputRef}
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
                disabled={loading}
              />

              {feedback === 'error' && errorMessage && (
                <p className="text-white text-center text-lg font-semibold mt-4">{errorMessage}</p>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Loader2 className={`w-6 h-6 animate-spin ${feedback ? 'text-white' : ''}`} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screenState === 'consumable' && session && currentOrder) {
    return (
      <div className={`fixed inset-0 flex flex-col transition-colors duration-300 ${getBgClass()}`}>
        <div className={`p-4 border-b ${feedback ? 'border-white/20' : 'border-border'}`}>
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl font-bold">Sarf Malzeme</h1>
                <p className="text-sm opacity-70">#{currentOrder.order.orderNumber}</p>
              </div>
            </div>
            <Badge variant={feedback ? 'outline' : 'secondary'} className={feedback ? 'border-white text-white' : ''}>
              {currentOrder.order.cargoTrackingNumber || '-'}
            </Badge>
          </div>
        </div>

        <div className="flex-1 flex gap-4 p-4 min-h-0">
          <div className="w-1/3 min-h-0">
            <LogPanel />
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div className={`rounded-xl p-6 text-center ${feedback ? 'bg-white/20' : 'bg-green-500'} text-white`}>
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Ürünler Tamamlandı!</h2>
              <p className="opacity-80">Şimdi sarf malzeme barkodunu okutun</p>
            </div>

            <OrderInfoCard order={currentOrder.order} items={currentOrder.items} />

            <div className="mt-auto space-y-2">
              <label className={`text-sm font-medium ${feedback ? 'text-white' : ''}`}>
                Kutu/Poşet Barkodu
              </label>
              <Input
                ref={consumableInputRef}
                type="text"
                value={consumableBarcode}
                onChange={(e) => setConsumableBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConsumableScan();
                }}
                className={`text-center text-2xl h-16 font-mono ${
                  feedback === 'error' ? 'border-white bg-white/20 text-white' : ''
                }`}
                placeholder="Sarf malzeme barkodu"
                autoFocus
                disabled={loading}
              />

              {feedback === 'error' && errorMessage && (
                <p className="text-white text-center text-lg font-semibold mt-4">{errorMessage}</p>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Loader2 className={`w-6 h-6 animate-spin ${feedback ? 'text-white' : ''}`} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screenState === 'printing') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-blue-500 text-white">
        <Printer className="w-24 h-24 mb-6 animate-pulse" />
        <h1 className="text-3xl font-bold mb-2">Etiket Yazdırılıyor</h1>
        <p className="text-xl opacity-80">Lütfen bekleyin...</p>
      </div>
    );
  }

  if (screenState === 'complete') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-green-500 text-white">
        <CheckCircle2 className="w-24 h-24 mb-6" />
        <h1 className="text-3xl font-bold mb-2">Rota Tamamlandı!</h1>
        <p className="text-xl opacity-80 mb-8">Tüm siparişler paketlendi</p>
        <button
          onClick={() => {
            setSession(null);
            setCurrentOrder(null);
            setLogs([]);
            setScreenState('route_input');
            router.replace('/operations/pack');
          }}
          className="px-8 py-4 bg-white text-green-600 rounded-xl text-xl font-semibold"
        >
          Yeni Rota Başlat
        </button>
      </div>
    );
  }

  return null;
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    getRoutes,
    getPickingProgress,
    scanPickingBarcode,
    bulkScanPicking,
    completePickingManually,
    Route,
    RouteStatus,
    PickingProgress,
    PickingItem,
} from '@/lib/api';

export function PickingClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState<PickingProgress | null>(null);
    const [barcode, setBarcode] = useState('');
    const [bulkBarcodes, setBulkBarcodes] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [lastScannedItem, setLastScannedItem] = useState<PickingItem | null>(null);
    const [quantity, setQuantity] = useState(1);


    const selectedRouteId = searchParams.get('route');

    const fetchRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRoutes([RouteStatus.COLLECTING]);
            setRoutes(response.data || []);
        } catch (err) {
            console.error('Failed to fetch routes:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadProgress = useCallback(async (routeId: string) => {
        try {
            const response = await getPickingProgress(routeId);
            setProgress(response.data);
        } catch (err) {
            console.error('Failed to load progress:', err);
        }
    }, []);

    useEffect(() => { fetchRoutes(); }, [fetchRoutes]);
    useEffect(() => {
        if (selectedRouteId) loadProgress(selectedRouteId);
    }, [selectedRouteId, loadProgress]);
    useEffect(() => {
        if (progress && barcodeInputRef.current) barcodeInputRef.current.focus();
    }, [progress]);

    const handleSelectRoute = (routeId: string) => {
        router.push(`/picking?route=${routeId}`);
    };

    const handleScanBarcode = async () => {
        if (!barcode.trim() || !selectedRouteId) return;
        setProcessing(true);
        try {
            const result = await scanPickingBarcode(selectedRouteId, barcode.trim(), quantity);
            if (result.success) {
                setMessage({ type: 'success', text: result.message });
                setLastScannedItem(result.data.item || null);
                if (result.data.progress) {
                    setProgress(result.data.progress);
                    if (result.data.progress.isComplete) {
                        setMessage({ type: 'info', text: '🎉 Tüm ürünler toplandı! Rota hazır.' });
                        fetchRoutes();
                    }
                }
                setQuantity(1); // Reset quantity
            } else {
                setMessage({ type: 'error', text: result.message });
                setLastScannedItem(null);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Barkod okutulamadı' });
            setLastScannedItem(null);
        } finally {
            setBarcode('');
            setProcessing(false);
            barcodeInputRef.current?.focus();
        }
    };

    const handleBulkScan = async () => {
        if (!bulkBarcodes.trim() || !selectedRouteId) return;
        const barcodes = bulkBarcodes.split('\n').map(b => b.trim()).filter(Boolean);
        if (barcodes.length === 0) return;

        setProcessing(true);
        try {
            const result = await bulkScanPicking(selectedRouteId, barcodes);
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message
            });
            if (result.data.progress) {
                setProgress(result.data.progress);
                if (result.data.progress.isComplete) {
                    setMessage({ type: 'info', text: '🎉 Tüm ürünler toplandı! Rota hazır.' });
                    fetchRoutes();
                }
            }
            setBulkBarcodes('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Toplu okutma başarısız' });
        } finally {
            setProcessing(false);
        }
    };

    const handleCompleteManually = async () => {
        if (!selectedRouteId || !confirm('Toplamayı manuel olarak tamamlamak istediğinize emin misiniz?')) return;
        setProcessing(true);
        try {
            const result = await completePickingManually(selectedRouteId);
            setProgress(result.data);
            setMessage({ type: 'success', text: 'Toplama manuel olarak tamamlandı' });
            fetchRoutes();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'İşlem başarısız' });
        } finally {
            setProcessing(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleScanBarcode();
    };

    // Picking interface
    if (progress && selectedRouteId) {
        const completedItems = progress.items.filter(i => i.isComplete);
        const pendingItems = progress.items.filter(i => !i.isComplete);

        return (
            <div className="h-[calc(100vh-120px)] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => { router.push('/picking'); setProgress(null); }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-xl font-bold">{progress.routeName}</h1>
                                <p className="text-white/80 text-sm">
                                    {progress.totalOrders} sipariş • {progress.pickedItems}/{progress.totalItems} ürün
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {!progress.isComplete && (
                                <button
                                    onClick={handleCompleteManually}
                                    disabled={processing}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                                >
                                    Manuel Tamamla
                                </button>
                            )}
                            <div className="bg-white/20 px-4 py-2 rounded-lg">
                                <span className="text-2xl font-bold">{Math.round((progress.pickedItems / progress.totalItems) * 100)}%</span>
                            </div>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-500"
                            style={{ width: `${(progress.pickedItems / progress.totalItems) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                    {/* Left Panel - Barcode Input & Current Item */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {/* Message */}
                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                                message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                                    'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>{message.text}</div>
                        )}

                        {/* Barcode Input */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => setIsBulkMode(false)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!isBulkMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    Tek Tek
                                </button>
                                <button
                                    onClick={() => setIsBulkMode(true)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isBulkMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    Toplu
                                </button>
                            </div>


                            {!isBulkMode ? (
                                <div className="flex gap-2">
                                    <div className="w-24">
                                        <input
                                            type="number"
                                            min="1"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full text-xl p-3 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-0 text-center"
                                            placeholder="Adet"
                                            disabled={processing || progress.isComplete}
                                        />
                                    </div>
                                    <input
                                        ref={barcodeInputRef}
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        className="flex-1 text-xl p-3 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-0"
                                        placeholder="Barkodu okutun..."
                                        autoFocus
                                        disabled={processing || progress.isComplete}
                                    />
                                    <button
                                        onClick={handleScanBarcode}
                                        disabled={!barcode.trim() || processing || progress.isComplete}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                                    >
                                        OK
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <textarea
                                        value={bulkBarcodes}
                                        onChange={(e) => setBulkBarcodes(e.target.value)}
                                        rows={4}
                                        className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-0 font-mono text-sm"
                                        placeholder="Her satıra bir barkod..."
                                        disabled={processing || progress.isComplete}
                                    />
                                    <button
                                        onClick={handleBulkScan}
                                        disabled={!bulkBarcodes.trim() || processing || progress.isComplete}
                                        className="mt-2 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                                    >
                                        {processing ? 'İşleniyor...' : 'Toplu Okut'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Next Shelf Guidance */}
                        {pendingItems.length > 0 && pendingItems[0].shelfLocation && (
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white shadow-lg animate-pulse">
                                <div className="text-sm font-medium text-white/90 uppercase tracking-wider mb-1">SIRADAKİ RAF</div>
                                <div className="text-4xl font-bold flex items-center gap-3">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {pendingItems[0].shelfLocation}
                                </div>
                                <div className="mt-2 text-white/90 text-sm">
                                    Bu raftan <strong>{pendingItems[0].productName}</strong> alacaksınız.
                                </div>
                            </div>
                        )}

                        {/* Last Scanned Item Detail */}
                        {lastScannedItem && (
                            <div className="bg-white rounded-xl border-2 border-green-300 p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">✓</div>
                                    <span className="font-semibold text-green-700">Son Okutulan</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-500">Barkod</div>
                                        <div className="font-mono text-lg font-bold text-gray-900">{lastScannedItem.barcode}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">Ürün</div>
                                        <div className="font-medium text-gray-900">{lastScannedItem.productName}</div>
                                        {lastScannedItem.shelfLocation && (
                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                {lastScannedItem.shelfLocation}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">Adet</div>
                                        <div className="text-2xl font-bold text-indigo-600">{lastScannedItem.pickedQuantity} / {lastScannedItem.totalQuantity}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500 mb-1">Siparişler</div>
                                        <div className="flex flex-wrap gap-1">
                                            {(() => {
                                                let remainingPicked = lastScannedItem.pickedQuantity;
                                                return lastScannedItem.orders.map((o, idx) => {
                                                    const taken = Math.min(o.quantity, remainingPicked);
                                                    remainingPicked -= taken;
                                                    const isFull = taken >= o.quantity;
                                                    return (
                                                        <span key={idx} className={`text-xs px-1.5 py-0.5 rounded border ${isFull ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                            {o.orderNumber} {isFull && '✓'}
                                                        </span>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pending Items */}
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
                            <div className="px-4 py-3 border-b border-gray-200 bg-amber-50 flex justify-between items-center">
                                <h3 className="font-semibold text-amber-800">Bekleyen ({pendingItems.length})</h3>
                                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Sıralı Liste</span>
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                                {pendingItems.map((item, idx) => (
                                    <div key={item.barcode} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${idx === 0 ? 'bg-amber-50/50' : ''}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <div className="font-medium text-gray-900">{item.productName}</div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <code className="text-sm font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.barcode}</code>
                                                    {item.shelfLocation ? (
                                                        <span className="flex items-center gap-1 text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            {item.shelfLocation}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Raf yok</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-lg font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
                                                {item.pickedQuantity}/{item.totalQuantity}
                                            </div>
                                        </div>

                                        {/* Order details breakdown */}
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {(() => {
                                                let remainingPicked = item.pickedQuantity;
                                                return item.orders.map((o, i) => {
                                                    const taken = Math.min(o.quantity, remainingPicked);
                                                    remainingPicked -= taken;
                                                    const isFull = taken >= o.quantity;

                                                    return (
                                                        <div key={i} className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${isFull ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                                            <span className="font-medium">{o.orderNumber}</span>
                                                            <span className="text-gray-400">|</span>
                                                            <span>{taken}/{o.quantity}</span>
                                                            {isFull && <span className="ml-1 font-bold text-green-600">✓</span>}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Completed Items */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
                        <div className="px-4 py-3 border-b border-gray-200 bg-green-50">
                            <h3 className="font-semibold text-green-800">Tamamlanan ({completedItems.length})</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {completedItems.map((item) => (
                                <div key={item.barcode} className="px-4 py-3 border-b border-gray-100 bg-green-50/30 flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-gray-900">{item.productName}</div>
                                        <div className="text-sm font-mono text-gray-500">{item.barcode}</div>
                                    </div>
                                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">✓</div>
                                </div>
                            ))}
                            {completedItems.length === 0 && (
                                <div className="p-4 text-center text-gray-400 text-sm">Henüz tamamlanan ürün yok</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Completed State */}
                {progress.isComplete && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">🎉</div>
                        <h3 className="text-lg font-semibold text-green-800">Toplama Tamamlandı!</h3>
                        <button
                            onClick={() => router.push('/packing')}
                            className="mt-3 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                            Paketlemeye Git
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Route selection
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Toplama</h1>
                    <p className="text-gray-500 mt-1">Toplanacak rotayı seçin</p>
                </div>
                <button
                    onClick={() => router.push('/routes')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                    ← Rotalar
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : routes.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <div className="text-gray-400 text-4xl mb-3">📦</div>
                        <div className="text-gray-500">Toplanacak rota bulunmuyor</div>
                        <button
                            onClick={() => router.push('/routes')}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Rota Oluştur
                        </button>
                    </div>
                ) : (
                    routes.map((route) => (
                        <div
                            key={route.id}
                            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group"
                            onClick={() => handleSelectRoute(route.id)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">{route.name}</h3>
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">Toplanıyor</span>
                            </div>
                            {route.description && <p className="text-gray-500 text-sm mb-4">{route.description}</p>}
                            <div className="flex items-center justify-between text-sm">
                                <div className="text-gray-600">
                                    <span className="font-semibold text-gray-900">{route.totalOrderCount}</span> sipariş
                                </div>
                                <div className="text-gray-600">
                                    <span className="font-semibold text-indigo-600">{route.pickedItemCount || 0}</span>/{route.totalItemCount} ürün
                                </div>
                            </div>
                            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all"
                                    style={{ width: `${route.totalItemCount > 0 ? ((route.pickedItemCount || 0) / route.totalItemCount) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

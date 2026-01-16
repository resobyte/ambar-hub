'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    getRoutes,
    startPackingSession,
    getPackingSession,
    scanPackingBarcode,
    completePackingOrder,
    cancelPackingSession,
    Route,
    RouteStatus,
    PackingSession,
} from '@/lib/api';

export function PackingClient() {
    const router = useRouter();
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<PackingSession | null>(null);
    const [barcode, setBarcode] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [selectedCarrier, setSelectedCarrier] = useState<string>('aras');
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [packageBarcode, setPackageBarcode] = useState('');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        const now = new Date().toLocaleTimeString('tr-TR');
        setLogs(prev => [`${now} ${msg}`, ...prev].slice(0, 20));
    };

    const fetchRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRoutes([RouteStatus.READY]);
            setRoutes(response.data || []);
        } catch (err) {
            console.error('Failed to fetch routes:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRoutes(); }, [fetchRoutes]);
    useEffect(() => {
        if (session && barcodeInputRef.current) barcodeInputRef.current.focus();
    }, [session]);

    const handleStartSession = async (routeId: string) => {
        setProcessing(true);
        try {
            const response = await startPackingSession(routeId);
            setSession(response.data);
            addLog(`${response.data.route?.name || 'Rota'} seçildi.`);
            setMessage({ type: 'success', text: 'Paketleme oturumu başlatıldı' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Oturum başlatılamadı' });
        } finally {
            setProcessing(false);
        }
    };

    const handleScanBarcode = async () => {
        if (!barcode.trim() || !session) return;
        setProcessing(true);
        try {
            const result = await scanPackingBarcode(session.id, barcode.trim());
            if (result.success) {
                setMessage({ type: 'success', text: result.message });
                addLog(result.message);
                // Refresh session
                const updated = await getPackingSession(session.id);
                setSession(updated.data);
            } else {
                setMessage({ type: 'error', text: result.message });
                addLog(`HATA: ${result.message}`);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Barkod okutulamadı' });
            addLog(`HATA: ${err.message}`);
        } finally {
            setBarcode('');
            setProcessing(false);
            barcodeInputRef.current?.focus();
        }
    };

    const handleCompleteOrder = async () => {
        if (!session || !session.currentOrderId) return;
        setProcessing(true);
        try {
            const result = await completePackingOrder(session.id, session.currentOrderId);
            setMessage({ type: 'success', text: result.message });
            addLog(result.message);

            if (result.data.sessionComplete) {
                addLog('Tüm siparişler paketlendi!');
                setSession(null);
                fetchRoutes();
            } else {
                const updated = await getPackingSession(session.id);
                setSession(updated.data);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Sipariş tamamlanamadı' });
        } finally {
            setProcessing(false);
        }
    };

    const handleCancelSession = async () => {
        if (!session || !confirm('Oturumu iptal etmek istediğinize emin misiniz?')) return;
        try {
            await cancelPackingSession(session.id);
            setSession(null);
            addLog('Oturum iptal edildi');
            setMessage({ type: 'info', text: 'Oturum iptal edildi' });
        } catch (err) {
            console.error('Cancel failed:', err);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleScanBarcode();
    };

    // Packing session active
    if (session) {
        const currentItems = session.items?.filter(i => i.orderId === session.currentOrderId) || [];
        const scannedCount = currentItems.filter(i => i.isComplete).length;
        const totalCount = currentItems.length;

        // Route orders logic
        const ordersMap = new Map<string, {
            id: string;
            number: string;
            customer: string;
            totalItems: number;
            packedItems: number;
            isComplete: boolean;
        }>();

        session.items?.forEach(item => {
            if (!ordersMap.has(item.orderId)) {
                ordersMap.set(item.orderId, {
                    id: item.orderId,
                    number: item.order?.orderNumber || 'Bilinmiyor',
                    customer: item.order?.customer ? `${item.order.customer.firstName || ''} ${item.order.customer.lastName || ''}`.trim() : '-',
                    totalItems: 0,
                    packedItems: 0,
                    isComplete: true
                });
            }
            const order = ordersMap.get(item.orderId)!;
            order.totalItems += 1; // Count lines for simplicity or use item quantities
            if (item.isComplete) order.packedItems++;
            if (!item.isComplete) order.isComplete = false;
        });

        const routeOrders = Array.from(ordersMap.values());

        return (
            <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
                <div className="flex-1 flex gap-4 min-h-0">
                    {/* Left Sidebar - Log Only */}
                    <div className="w-56 flex flex-col gap-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-3 h-full overflow-hidden flex flex-col">
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">İşlem Logu</div>
                            <div className="space-y-1 text-xs overflow-y-auto flex-1">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-gray-600">{log}</div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col gap-4">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-4 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-xl font-bold">B2C Paketleme</h1>
                                    <p className="text-teal-100 text-sm">
                                        {session.route?.name} • Sipariş {session.packedOrders + 1}/{session.totalOrders}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowPackageModal(true)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                                    >
                                        Yeni Paket Okut
                                    </button>
                                    <button
                                        onClick={handleCancelSession}
                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm"
                                    >
                                        Koli Çıkış
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="flex items-center gap-4">
                            <div className="text-5xl font-bold text-teal-600">{scannedCount}/{totalCount}</div>
                            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-teal-500 transition-all"
                                    style={{ width: `${totalCount > 0 ? (scannedCount / totalCount) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Message */}
                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                                message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                                    'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>{message.text}</div>
                        )}

                        {/* Barcode Input */}
                        <div className="flex gap-2">
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="flex-1 text-xl p-3 rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:ring-0"
                                placeholder="Ürün barkodu okutun..."
                                autoFocus
                                disabled={processing}
                            />
                            <button
                                onClick={handleScanBarcode}
                                disabled={!barcode.trim() || processing}
                                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                            >
                                OK
                            </button>
                        </div>

                        {/* Current Order Items */}
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
                            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h3 className="font-semibold text-gray-800">Sipariş Ürünleri</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {currentItems.map((item, idx) => (
                                    <div key={item.id} className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between ${item.isComplete ? 'bg-green-50' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${item.isComplete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                {item.isComplete ? '✓' : idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-mono text-sm text-gray-900">{item.barcode}</div>
                                                <div className="text-xs text-gray-500">Adet: {item.requiredQuantity}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm">
                                            <span className={`px-2 py-1 rounded ${item.isComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {item.scannedQuantity}/{item.requiredQuantity}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {currentItems.length === 0 && (
                                    <div className="p-8 text-center text-gray-400">Sipariş yükleniyor...</div>
                                )}
                            </div>
                        </div>

                        {/* Complete Button */}
                        {scannedCount === totalCount && totalCount > 0 && (
                            <button
                                onClick={handleCompleteOrder}
                                disabled={processing}
                                className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-lg disabled:opacity-50"
                            >
                                Siparişi Tamamla ✓
                            </button>
                        )}
                    </div>
                </div>

                {/* Route Orders List */}
                <div className="h-64 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Rotadaki Siparişler</h2>
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="h-full overflow-x-auto overflow-y-auto">
                            <table className="w-full text-sm text-left relative">
                                <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3">Sipariş No</th>
                                        <th className="px-4 py-3">Müşteri</th>
                                        <th className="px-4 py-3 text-center">Durum</th>
                                        <th className="px-4 py-3 text-right">Ürünler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {routeOrders.map(order => (
                                        <tr key={order.id} className={`hover:bg-gray-50 ${order.isComplete ? 'bg-green-50/50' : ''}`}>
                                            <td className="px-4 py-3 font-medium text-gray-900">{order.number}</td>
                                            <td className="px-4 py-3 text-gray-600">{order.customer}</td>
                                            <td className="px-4 py-3 text-center">
                                                {order.isComplete ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">
                                                        Tamamlandı
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                                                        Hazırlanıyor
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600 font-mono">
                                                {order.packedItems}/{order.totalItems}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Route selection
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Paketleme</h1>
                    <p className="text-gray-500 mt-1">Paketlenecek rotayı seçin</p>
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
                        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : routes.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <div className="text-gray-400 text-4xl mb-3">📦</div>
                        <div className="text-gray-500">Paketlenecek rota bulunmuyor</div>
                        <p className="text-sm text-gray-400 mt-1">Önce toplama işlemini tamamlayın</p>
                        <button
                            onClick={() => router.push('/picking')}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Toplamaya Git
                        </button>
                    </div>
                ) : (
                    routes.map((route) => (
                        <div
                            key={route.id}
                            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-teal-300 hover:shadow-lg transition-all cursor-pointer group"
                            onClick={() => handleStartSession(route.id)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600">{route.name}</h3>
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">Rotada Toplanmış</span>
                            </div>
                            {route.description && <p className="text-gray-500 text-sm mb-4">{route.description}</p>}
                            <div className="flex items-center justify-between text-sm">
                                <div className="text-gray-600">
                                    <span className="font-semibold text-gray-900">{route.totalOrderCount}</span> sipariş
                                </div>
                                <div className="text-gray-600">
                                    <span className="font-semibold text-teal-600">{route.packedOrderCount || 0}</span>/{route.totalOrderCount} paketlendi
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Package Select Modal */}
            {showPackageModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Paket Seçimi</h2>
                        <p className="text-sm text-gray-600 mb-4">Paket barkodunu okutun</p>
                        <input
                            type="text"
                            value={packageBarcode}
                            onChange={(e) => setPackageBarcode(e.target.value)}
                            className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:ring-0"
                            placeholder="paket barkodunu giriniz"
                            autoFocus
                        />
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowPackageModal(false); setPackageBarcode(''); }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => { setShowPackageModal(false); addLog(`Paket: ${packageBarcode}`); setPackageBarcode(''); }}
                                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

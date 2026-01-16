'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    getRoutes,
    getRouteSuggestions,
    createRoute,
    deleteRoute,
    printRouteLabel,
    Route,
    RouteSuggestion,
    RouteStatus,
    getStores,
    Store
} from '@/lib/api';

export function RoutesClient() {
    const router = useRouter();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [suggestions, setSuggestions] = useState<RouteSuggestion[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<RouteStatus[]>([RouteStatus.COLLECTING, RouteStatus.READY]);
    const [storeFilter, setStoreFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<RouteSuggestion | null>(null);
    const [routeName, setRouteName] = useState('');
    const [routeDescription, setRouteDescription] = useState('');
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRoutes(statusFilter.length > 0 ? statusFilter : undefined);
            setRoutes(response.data || []);
        } catch (err) {
            console.error('Failed to fetch routes:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    const fetchSuggestions = useCallback(async () => {
        setLoadingSuggestions(true);
        try {
            const response = await getRouteSuggestions({
                storeId: storeFilter || undefined,
                type: typeFilter || undefined,
            });
            setSuggestions(response.data || []);
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
        } finally {
            setLoadingSuggestions(false);
        }
    }, [storeFilter, typeFilter]);

    const fetchStores = useCallback(async () => {
        try {
            const response = await getStores(1, 100);
            setStores(response.data || []);
        } catch (err) {
            console.error('Failed to fetch stores:', err);
        }
    }, []);

    useEffect(() => { fetchRoutes(); }, [fetchRoutes]);
    useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);
    useEffect(() => { fetchStores(); }, [fetchStores]);

    const handleSelectSuggestion = (suggestion: RouteSuggestion) => {
        setSelectedSuggestion(suggestion);
        setRouteName(suggestion.name);
        setRouteDescription(suggestion.description);
        setSelectedOrderIds(suggestion.orders.map(o => o.id));
        setIsModalOpen(true);
    };

    const handleCreateRoute = async () => {
        if (!routeName.trim() || selectedOrderIds.length === 0) {
            setError('Lütfen rota adı girin ve en az bir sipariş seçin');
            return;
        }
        setCreating(true);
        setError(null);
        try {
            const response = await createRoute({
                name: routeName.trim(),
                description: routeDescription.trim() || undefined,
                orderIds: selectedOrderIds,
            });
            if (response.data?.id) {
                try {
                    const labelHtml = await printRouteLabel(response.data.id);
                    const blob = new Blob([labelHtml], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                } catch (labelErr) {
                    console.error('Failed to print label:', labelErr);
                }
            }
            setIsModalOpen(false);
            setRouteName('');
            setRouteDescription('');
            setSelectedOrderIds([]);
            setSelectedSuggestion(null);
            fetchRoutes();
            fetchSuggestions();
        } catch (err: any) {
            setError(err.message || 'Rota oluşturulurken hata oluştu');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteRoute = async (routeId: string) => {
        if (!confirm('Bu rotayı iptal etmek istediğinize emin misiniz?')) return;
        try {
            await deleteRoute(routeId);
            fetchRoutes();
            fetchSuggestions();
        } catch (err) {
            console.error('Failed to delete route:', err);
        }
    };

    const handlePrintLabel = async (routeId: string) => {
        try {
            const labelHtml = await printRouteLabel(routeId);
            const blob = new Blob([labelHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error('Failed to print label:', err);
        }
    };

    const getStatusBadge = (status: RouteStatus) => {
        const styles: Record<RouteStatus, string> = {
            [RouteStatus.COLLECTING]: 'bg-indigo-100 text-indigo-800',
            [RouteStatus.READY]: 'bg-blue-100 text-blue-800',
            [RouteStatus.COMPLETED]: 'bg-green-100 text-green-800',
            [RouteStatus.CANCELLED]: 'bg-red-100 text-red-800',
        };
        const labels: Record<RouteStatus, string> = {
            [RouteStatus.COLLECTING]: 'Toplanıyor',
            [RouteStatus.READY]: 'Rotada Toplanmış',
            [RouteStatus.COMPLETED]: 'Tamamlandı',
            [RouteStatus.CANCELLED]: 'İptal',
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
    };

    const getTypeBadge = (type: string) => {
        const styles: Record<string, string> = {
            single_product: 'bg-green-100 text-green-800',
            single_product_multi: 'bg-blue-100 text-blue-800',
            mixed: 'bg-purple-100 text-purple-800',
        };
        const labels: Record<string, string> = {
            single_product: 'Tekli',
            single_product_multi: 'Tek Ürün Çoklu',
            mixed: 'Çoklu Ürün',
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800'}`}>{labels[type] || type}</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rotalar</h1>
                    <p className="text-gray-500 mt-1">Sipariş rotalarını oluşturun ve yönetin</p>
                </div>
                <button onClick={() => router.push('/packing')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Paketleme
                </button>
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <span className="text-sm font-medium text-gray-700">Durum:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={statusFilter.includes(RouteStatus.COLLECTING) && statusFilter.includes(RouteStatus.READY)}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setStatusFilter(prev => [...prev.filter(s => s !== RouteStatus.COLLECTING && s !== RouteStatus.READY), RouteStatus.COLLECTING, RouteStatus.READY]);
                            } else {
                                setStatusFilter(prev => prev.filter(s => s !== RouteStatus.COLLECTING && s !== RouteStatus.READY));
                            }
                        }}
                        className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={statusFilter.includes(RouteStatus.COMPLETED)}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setStatusFilter(prev => [...prev, RouteStatus.COMPLETED]);
                            } else {
                                setStatusFilter(prev => prev.filter(s => s !== RouteStatus.COMPLETED));
                            }
                        }}
                        className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Tamamlanan</span>
                </label>
            </div>

            {/* Routes Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Mevcut Rotalar</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rota Adı</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oluşturulma</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div></td></tr>
                            ) : routes.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Henüz rota bulunmuyor</td></tr>
                            ) : (
                                routes.map((route) => (
                                    <tr key={route.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <a href={`/routes/${route.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                                                {route.name}
                                            </a>
                                            {route.description && <div className="text-sm text-gray-500">{route.description}</div>}
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(route.status)}</td>
                                        <td className="px-6 py-4 text-gray-700">{route.totalOrderCount}</td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">{new Date(route.createdAt).toLocaleDateString('tr-TR')}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => router.push(`/routes/${route.id}`)} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200">Detay</button>
                                                {route.status === RouteStatus.COLLECTING && (
                                                    <button onClick={() => router.push(`/picking?route=${route.id}`)} className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Topla</button>
                                                )}
                                                {route.status === RouteStatus.READY && (
                                                    <button onClick={() => router.push('/packing')} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Paketle</button>
                                                )}
                                                <button onClick={() => handlePrintLabel(route.id)} className="px-2 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700">Etiket</button>
                                                {route.status !== RouteStatus.COMPLETED && route.status !== RouteStatus.CANCELLED && (
                                                    <button onClick={() => handleDeleteRoute(route.id)} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200">İptal</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Route Suggestions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Rota Önerileri</h2>
                    <div className="flex gap-4">
                        <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="rounded-lg border-gray-300 text-sm">
                            <option value="">Tüm Mağazalar</option>
                            {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                        </select>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border-gray-300 text-sm">
                            <option value="">Tüm Tipler</option>
                            <option value="single_product">Tekli</option>
                            <option value="single_product_multi">Tek Ürün Çoklu</option>
                            <option value="mixed">Çoklu Ürün</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öneri</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mağaza</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam Adet</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loadingSuggestions ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div></td></tr>
                            ) : suggestions.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Rota önerisi bulunamadı</td></tr>
                            ) : (
                                suggestions.map((suggestion) => (
                                    <tr key={suggestion.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{suggestion.name}</div>
                                            <div className="text-sm text-gray-500">{suggestion.description}</div>
                                        </td>
                                        <td className="px-6 py-4">{getTypeBadge(suggestion.type)}</td>
                                        <td className="px-6 py-4 text-gray-700">{suggestion.storeName || '-'}</td>
                                        <td className="px-6 py-4 text-gray-700">{suggestion.orderCount}</td>
                                        <td className="px-6 py-4 text-gray-700">{suggestion.totalQuantity}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleSelectSuggestion(suggestion)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                                                Rota Oluştur
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Route Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Rota Oluştur</h2>
                        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rota Adı</label>
                                <input type="text" value={routeName} onChange={(e) => setRouteName(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Rota adı girin" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (Opsiyonel)</label>
                                <textarea value={routeDescription} onChange={(e) => setRouteDescription(e.target.value)} rows={2} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Açıklama ekleyin" />
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600"><strong>{selectedOrderIds.length}</strong> sipariş seçildi</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setIsModalOpen(false); setError(null); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">İptal</button>
                            <button onClick={handleCreateRoute} disabled={creating} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                {creating ? 'Oluşturuluyor...' : 'Rota Oluştur'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

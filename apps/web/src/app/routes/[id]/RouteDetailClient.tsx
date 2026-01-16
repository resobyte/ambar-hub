'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getRoute,
    deleteRoute,
    printRouteLabel,
    Route,
    RouteStatus,
} from '@/lib/api';

interface Props {
    routeId: string;
}

export function RouteDetailClient({ routeId }: Props) {
    const router = useRouter();
    const [route, setRoute] = useState<Route | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRoute = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRoute(routeId);
            setRoute(response.data);
        } catch (err: any) {
            setError(err.message || 'Rota yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [routeId]);

    useEffect(() => { fetchRoute(); }, [fetchRoute]);

    const handlePrintLabel = async () => {
        try {
            const labelHtml = await printRouteLabel(routeId);
            const blob = new Blob([labelHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error('Print failed:', err);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Bu rotayı iptal etmek istediğinize emin misiniz?')) return;
        try {
            await deleteRoute(routeId);
            router.push('/routes');
        } catch (err) {
            console.error('Cancel failed:', err);
        }
    };

    const getStatusBadge = (status: RouteStatus) => {
        const config: Record<RouteStatus, { bg: string; text: string; label: string }> = {
            [RouteStatus.COLLECTING]: { bg: 'bg-amber-500', text: 'text-white', label: 'Toplanıyor' },
            [RouteStatus.READY]: { bg: 'bg-emerald-500', text: 'text-white', label: 'Hazır' },
            [RouteStatus.COMPLETED]: { bg: 'bg-blue-500', text: 'text-white', label: 'Tamamlandı' },
            [RouteStatus.CANCELLED]: { bg: 'bg-red-500', text: 'text-white', label: 'İptal' },
        };
        const { bg, text, label } = config[status];
        return <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${bg} ${text}`}>{label}</span>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (error || !route) {
        return (
            <div className="text-center py-12">
                <div className="text-red-500 text-lg">{error || 'Rota bulunamadı'}</div>
                <Link href="/routes" className="mt-4 inline-block text-primary hover:underline">Rotalara Dön</Link>
            </div>
        );
    }

    const infoItems = [
        { label: 'Rota Takip Kodu', value: route.id.slice(0, 8).toUpperCase() },
        { label: 'Rota Adı', value: route.name },
        { label: 'Açıklama', value: route.description || '-' },
        { label: 'Toplam Sipariş', value: route.totalOrderCount },
        { label: 'Toplam Ürün', value: route.totalItemCount },
        { label: 'Toplanan Ürün', value: route.pickedItemCount || 0 },
        { label: 'Paketlenen Sipariş', value: route.packedOrderCount || 0 },
        { label: 'Oluşturma Zamanı', value: new Date(route.createdAt).toLocaleString('tr-TR') },
    ];

    const actionButtons = [
        { label: 'Siparişler', color: 'bg-rose-600 hover:bg-rose-700', onClick: () => { } },
        { label: 'Ürünler', color: 'bg-rose-600 hover:bg-rose-700', onClick: () => { } },
        { label: 'Rotayı Yazdır', color: 'bg-teal-600 hover:bg-teal-700', onClick: handlePrintLabel },
        { label: 'Rota Etiketini Yazdır', color: 'bg-teal-600 hover:bg-teal-700', onClick: handlePrintLabel },
        { label: 'Toplamaya Git', color: 'bg-blue-600 hover:bg-blue-700', onClick: () => router.push(`/picking?route=${routeId}`) },
        { label: 'Paketlemeye Git', color: 'bg-green-600 hover:bg-green-700', onClick: () => router.push('/packing'), disabled: route.status !== RouteStatus.READY },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/routes" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Rota Detay ({route.id.slice(0, 8).toUpperCase()})</h1>
                    </div>
                </div>
                {getStatusBadge(route.status)}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info Panel - Left */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="divide-y divide-gray-100">
                        {infoItems.map((item, idx) => (
                            <div key={idx} className="flex px-6 py-3">
                                <div className="w-48 font-medium text-gray-600">{item.label}</div>
                                <div className="flex-1 text-gray-900">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions Panel - Right */}
                <div className="space-y-3">
                    {actionButtons.map((btn, idx) => (
                        <button
                            key={idx}
                            onClick={btn.onClick}
                            disabled={btn.disabled}
                            className={`w-full py-3 px-4 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${btn.color}`}
                        >
                            {btn.label}
                        </button>
                    ))}

                    {route.status !== RouteStatus.COMPLETED && route.status !== RouteStatus.CANCELLED && (
                        <button
                            onClick={handleCancel}
                            className="w-full py-3 px-4 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
                        >
                            Rotayı İptal Et
                        </button>
                    )}
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Rota Siparişleri</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sipariş No</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Müşteri</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ürün Adedi</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {route.orders && route.orders.length > 0 ? (
                                route.orders.map((order: any, idx: number) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{order.orderNumber || order.id.slice(0, 8)}</td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {order.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                                                {order.status || 'Rotada'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button className="px-3 py-1 bg-rose-600 text-white text-xs rounded hover:bg-rose-700">
                                                    Rotadan Kaldır
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        Bu rotada sipariş bulunmuyor
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

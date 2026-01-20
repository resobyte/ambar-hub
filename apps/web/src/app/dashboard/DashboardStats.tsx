'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InfoCard } from '@/components/common/InfoCard';
import { getDashboardStats, DashboardStats } from '@/lib/api';
import { ShoppingCart, AlertCircle, FileWarning, PackageX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function DashboardStatsCards() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await getDashboardStats();
                if (res.success) {
                    setStats(res.data);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats', error);
                toast({
                    variant: 'destructive',
                    title: 'Hata',
                    description: 'Panel verileri yüklenemedi',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [toast]);

    const handleCardClick = (path: string) => {
        router.push(path);
    };

    if (loading) {
        return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
            ))}
        </div>;
    }

    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div onClick={() => {
                const today = new Date();
                const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
                const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
                handleCardClick(`/orders?startDate=${start}&endDate=${end}`);
            }} className="cursor-pointer transition-transform hover:scale-[1.02]">
                <InfoCard
                    title="Bugünün Sipariş Adedi"
                    value={stats.todayOrders.toString()}
                    icon={<ShoppingCart className="w-5 h-5" />}
                />
            </div>

            <div onClick={() => handleCardClick('/invoices?status=ERROR')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                <InfoCard
                    title="Gönderilmemiş Siparişler"
                    value={stats.failedInvoices.toString()}
                    icon={<FileWarning className="w-5 h-5 text-destructive" />}
                />
            </div>

            <div onClick={() => handleCardClick('/faulty-orders')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                <InfoCard
                    title="Hatalı Siparişler (Barkod)"
                    value={stats.faultyOrders.toString()}
                    icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
                />
            </div>

            <div onClick={() => handleCardClick('/orders?status=UNSUPPLIED')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                <InfoCard
                    title="Tedarik Edilemedi"
                    value={stats.unsuppliedOrders.toString()}
                    icon={<PackageX className="w-5 h-5 text-orange-500" />}
                />
            </div>
        </div>
    );
}

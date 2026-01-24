'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getStores, Store, syncOrders } from '@/lib/api';

interface SyncOrdersDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function SyncOrdersDialog({ open, onClose, onSuccess }: SyncOrdersDialogProps) {
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingStores, setFetchingStores] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            fetchStores();
        }
    }, [open]);

    const fetchStores = async () => {
        setFetchingStores(true);
        try {
            const res = await getStores(1, 100);
            const marketplaceStores = res.data.filter(
                s => (s.type === 'TRENDYOL' || s.type === 'HEPSIBURADA' || s.type === 'IKAS') && s.isActive
            );
            setStores(marketplaceStores);
        } catch (error) {
            console.error('Failed to fetch stores', error);
            toast({
                title: "Hata",
                description: "Mağazalar yüklenirken bir hata oluştu.",
                variant: "destructive",
            });
        } finally {
            setFetchingStores(false);
        }
    };

    const handleSync = async () => {
        if (!selectedStoreId) return;

        setLoading(true);
        try {
            await syncOrders(selectedStoreId);
            toast({
                title: "Başarılı",
                description: "Sipariş eşitleme işlemi başlatıldı.",
                variant: 'success',
            });
            onSuccess();
            onClose();
        } catch (error: unknown) {
            console.error('Sync failed', error);
            const message = error instanceof Error ? error.message : 'Sipariş eşitleme başarısız.';
            toast({
                title: "Hata",
                description: message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Siparişleri Eşitle</DialogTitle>
                    <DialogDescription>
                        Seçilen mağazadan son siparişleri çekmek için işlemi başlatın.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="store">Mağaza</Label>
                        <Select
                            value={selectedStoreId}
                            onValueChange={setSelectedStoreId}
                            disabled={fetchingStores}
                        >
                            <SelectTrigger id="store">
                                <SelectValue placeholder={fetchingStores ? "Yükleniyor..." : "Mağaza Seçin"} />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map((store) => (
                                    <SelectItem key={store.id} value={store.id}>
                                        {store.name} ({store.type})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {stores.length === 0 && !fetchingStores && (
                            <p className="text-sm text-destructive">Aktif pazaryeri mağazası bulunamadı.</p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        İptal
                    </Button>
                    <Button onClick={handleSync} disabled={loading || !selectedStoreId}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Eşitleniyor...' : 'Eşitlemeyi Başlat'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

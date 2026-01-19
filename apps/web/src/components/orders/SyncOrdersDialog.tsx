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
import { getIntegrations, Integration, syncOrders } from '@/lib/api';

interface SyncOrdersDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function SyncOrdersDialog({ open, onClose, onSuccess }: SyncOrdersDialogProps) {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingIntegrations, setFetchingIntegrations] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            fetchIntegrations();
        }
    }, [open]);

    const fetchIntegrations = async () => {
        setFetchingIntegrations(true);
        try {
            // Fetch all pages if needed, but for now getting first page (assuming < 100 integrations)
            const res = await getIntegrations(1, 100);
            // Filter for supported integrations (Trendyol, Hepsiburada, Ikas)
            const supportedIntegrations = res.data.filter(i => (i.type === 'TRENDYOL' || i.type === 'HEPSIBURADA' || i.type === 'IKAS') && i.isActive);
            setIntegrations(supportedIntegrations);
        } catch (error) {
            console.error('Failed to fetch integrations', error);
            toast({
                title: "Hata",
                description: "Entegrasyonlar yüklenirken bir hata oluştu.",
                variant: "destructive",
            });
        } finally {
            setFetchingIntegrations(false);
        }
    };

    const handleSync = async () => {
        if (!selectedIntegrationId) return;

        setLoading(true);
        try {
            await syncOrders(selectedIntegrationId);
            toast({
                title: "Başarılı",
                description: "Sipariş eşitleme işlemi başlatıldı.",
                variant: 'success',
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Sync failed', error);
            toast({
                title: "Hata",
                description: error.message || "Sipariş eşitleme başarısız.",
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
                        Seçilen entegrasyondan son siparişleri çekmek için işlemi başlatın.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="integration">Entegrasyon</Label>
                        <Select
                            value={selectedIntegrationId}
                            onValueChange={setSelectedIntegrationId}
                            disabled={fetchingIntegrations}
                        >
                            <SelectTrigger id="integration">
                                <SelectValue placeholder={fetchingIntegrations ? "Yükleniyor..." : "Entegrasyon Seçin"} />
                            </SelectTrigger>
                            <SelectContent>
                                {integrations.map((integration) => (
                                    <SelectItem key={integration.id} value={integration.id}>
                                        {integration.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {integrations.length === 0 && !fetchingIntegrations && (
                            <p className="text-sm text-destructive">Aktif entegrasyon bulunamadı.</p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        İptal
                    </Button>
                    <Button onClick={handleSync} disabled={loading || !selectedIntegrationId}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Eşitleniyor...' : 'Eşitlemeyi Başlat'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

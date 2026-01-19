'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FetchOrderDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function FetchOrderDialog({ open, onClose, onSuccess }: FetchOrderDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [channel, setChannel] = useState('trendyol');
    const [orderNumber, setOrderNumber] = useState('');
    const { toast } = useToast();

    const handleFetch = async () => {
        if (!orderNumber.trim()) {
            toast({
                title: "Hata",
                description: 'Lütfen bir sipariş numarası girin',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/fetch-trendyol?orderNumber=${orderNumber}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            console.log(data);

            if (data.success) {
                toast({
                    title: "Başarılı",
                    description: data.message || 'Sipariş başarıyla çekildi',
                    variant: 'success', // or 'success' if implemented, usually default is fine or we can add className
                    className: "bg-green-600 text-white border-green-700"
                });
                setOrderNumber('');
                onSuccess();
                onClose();
            } else {
                toast({
                    title: "Hata",
                    description: data.message || 'Sipariş çekilemedi',
                    variant: 'destructive',
                });

            }
        } catch (error: any) {
            toast({
                title: "Hata",
                description: 'Hata: ' + error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Sipariş Çek</DialogTitle>
                    <DialogDescription>
                        Pazaryerinden tekil sipariş çekmek için bilgileri girin.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="channel">Kanal</Label>
                        <Select value={channel} onValueChange={setChannel}>
                            <SelectTrigger id="channel">
                                <SelectValue placeholder="Kanal Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="trendyol">Trendyol</SelectItem>
                                {/* Future channels can be added here */}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="orderNumber">Sipariş Numarası</Label>
                        <Input
                            id="orderNumber"
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            placeholder="Sipariş No (örn: 123456789)"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        İptal
                    </Button>
                    <Button onClick={handleFetch} disabled={isLoading || !orderNumber.trim()}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Siparişi Çek
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

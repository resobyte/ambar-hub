'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Package, Truck } from 'lucide-react';
import { reshipOrder } from '@/lib/api';
import { Order } from '@/lib/api';

interface ReshipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

export function ReshipmentModal({ isOpen, onClose, order }: ReshipmentModalProps) {
  const router = useRouter();
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [cargoTrackingNumber, setCargoTrackingNumber] = useState('');
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      const newQuantities = { ...itemQuantities };
      delete newQuantities[itemId];
      setItemQuantities(newQuantities);
    } else {
      setItemQuantities(prev => ({ ...prev, [itemId]: quantity }));
    }
  };

  const handleSelectAll = () => {
    const items = order.items || [];
    if (Object.keys(itemQuantities).length === items.length) {
      setItemQuantities({});
    } else {
      const allQuantities: Record<string, number> = {};
      items.forEach(item => {
        allQuantities[item.id] = item.quantity;
      });
      setItemQuantities(allQuantities);
    }
  };

  const handleSubmit = async () => {
    const selectedItems = Object.keys(itemQuantities);
    if (selectedItems.length === 0) {
      setError('En az bir ürün seçmelisiniz');
      return;
    }
    if (!cargoTrackingNumber.trim()) {
      setError('Kargo takip numarası gereklidir');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = selectedItems.map(itemId => ({
        itemId,
        quantity: itemQuantities[itemId],
      }));

      const result = await reshipOrder(order.id, {
        items,
        cargoTrackingNumber: cargoTrackingNumber.trim(),
        needsInvoice,
      });

      // Başarı mesajı ve yönlendirme
      router.push(`/orders/${result.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Yeniden gönderim başarısız');
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setItemQuantities({});
      setCargoTrackingNumber('');
      setNeedsInvoice(false);
      setError(null);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Yeniden Gönderim
          </DialogTitle>
          <DialogDescription>
            {order.orderNumber} numaralı sipariş için yeniden gönderim oluştur
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ürün Seçimi */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Ürünler</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {Object.keys(itemQuantities).length === (order.items || []).length
                  ? 'Tümünü Kaldır'
                  : 'Tümünü Seç'}
              </Button>
            </div>
            <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
              {(order.items || []).map((item) => {
                const isSelected = item.id in itemQuantities;
                const maxQuantity = item.quantity;
                const currentQuantity = itemQuantities[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={item.id}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleQuantityChange(item.id, maxQuantity);
                        } else {
                          handleQuantityChange(item.id, 0);
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={item.id} className="font-medium cursor-pointer">
                          {item.productName}
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          Maks: {maxQuantity} adet
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {item.barcode}
                      </div>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-2">
                          <Label htmlFor={`qty-${item.id}`} className="text-xs">
                            Miktar:
                          </Label>
                          <Input
                            id={`qty-${item.id}`}
                            type="number"
                            min="1"
                            max={maxQuantity}
                            value={currentQuantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value, 10);
                              if (!isNaN(qty) && qty >= 1 && qty <= maxQuantity) {
                                handleQuantityChange(item.id, qty);
                              }
                            }}
                            className="w-20 h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kargo Takip Numarası */}
          <div>
            <Label htmlFor="cargoTracking" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Kargo Takip Numarası
            </Label>
            <Input
              id="cargoTracking"
              value={cargoTrackingNumber}
              onChange={(e) => setCargoTrackingNumber(e.target.value)}
              placeholder="Örn: 1234567890"
              className="mt-2"
            />
          </div>

          {/* Faturalama Sorusu */}
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <Checkbox
              id="needsInvoice"
              checked={needsInvoice}
              onCheckedChange={(checked) => setNeedsInvoice(checked as boolean)}
            />
            <Label htmlFor="needsInvoice" className="cursor-pointer">
              Bu gönderim için yeni fatura kesilsin mi?
            </Label>
          </div>

          {/* Hata Mesajı */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            İptal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || Object.keys(itemQuantities).length === 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Yeniden Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

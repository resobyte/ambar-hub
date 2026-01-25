# Yeniden Gönderim (Reshipment) Servisi Planı

> **Oluşturma Tarihi**: 2026-01-25  
> **Durum**: Taslak

---

## 📋 Özet

Teslim edilmiş siparişler için yeniden gönderim servisi. Kullanıcı, teslim edilmiş bir siparişi seçip, hangi ürünlerin yeniden gönderileceğini belirleyebilir, yeni kargo takip numarası girer ve sistem otomatik olarak yeni bir sipariş oluşturur.

---

## 🎯 Kullanıcı Hikayesi

```
Bir müşteriye teslim edilen sipariş, kargo firması tarafından teslim edilemedi
veya ürün hasarlı geldi. Depo çalışanları, bu siparişi yeniden göndermek
istiyorlar. Sistem, orijinal sipariş bilgilerini kopyalayıp, seçilen
ürünlerle yeni bir sipariş oluşturmalı.
```

---

## 🔄 İş Akışı

```
┌─────────────────────────────────────────────────────────────────────┐
│                    1. Sipariş Detay Sayfası                        │
│                    DELIVERED durumunda "Yeniden Gönder" butonu     │
└─────────────────────��───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    2. ReshipmentModal Açılır                       │
│                    - Sipariş ürünleri listelenir                   │
│                    - Checkbox ile ürün seçimi                      │
│                    - Kargo takip no input                          │
│                    - Yeniden faturalama sorusu                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    3. Backend API Çağrısı                         │
│                    POST /api/orders/:id/reship                     │
│                    {                                               │
│                      itemIds: string[],                           │
│                      cargoTrackingNumber: string,                 │
│                      needsInvoice: boolean                        │
│                    }                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    4. Backend İşlemleri                           │
│                    a. Sipariş durumunu kontrol et (DELIVERED)      │
│                    b. Seçilen ürünleri validate et                 │
│                    c. Yeni sipariş numarası oluştur (sonuna R)    │
│                    d. Yeni Order oluştur                          │
│                    e. Yeni OrderItem'ları oluştur                  │
│                    f. needsInvoice = true ise fatura oluştur       │
│                    g. OrderHistory'e kaydet                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    5. Sonuç                                       │
│                    - Yeni sipariş detay sayfasına yönlendir        │
│                    - Başarı mesajı göster                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Dosya Yapısı

### Backend (NestJS)

```
apps/api/src/orders/
├── dto/
│   └── reshipment.dto.ts          # ReshipmentDto
├── orders.controller.ts          # POST :id/reship endpoint
└── orders.service.ts             # reshipOrder() metodu
```

### Frontend (Next.js + shadcn/ui)

```
apps/web/src/
├── app/orders/[id]/
│   └── OrderDetailClient.tsx     # Yeniden gönder butonu ekle
├── components/
│   └── orders/
│       └── ReshipmentModal.tsx    # Yeni modal component
└── lib/
    └── api.ts                    # reshipOrder() API fonksiyonu
```

---

## 🔧 Backend Implementation

### 1. DTO: `reshipment.dto.ts`

```typescript
import { IsArray, IsString, IsBoolean, IsNotEmpty } from 'class-validator';

export class ReshipmentDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  itemIds: string[];

  @IsString()
  @IsNotEmpty()
  cargoTrackingNumber: string;

  @IsBoolean()
  needsInvoice: boolean;
}
```

### 2. Controller: `orders.controller.ts`

```typescript
@Post(':id/reship')
async reshipOrder(
  @Param('id') id: string,
  @Body() dto: ReshipmentDto,
  @CurrentUser('sub') userId?: string,
) {
  return this.ordersService.reshipOrder(id, dto, userId);
}
```

### 3. Service: `orders.service.ts`

```typescript
async reshipOrder(
  orderId: string,
  dto: ReshipmentDto,
  userId?: string,
): Promise<Order> {
  // 1. Siparişi bul
  const originalOrder = await this.findOne(orderId);

  // 2. Durum kontrolü (sadece DELIVERED)
  if (originalOrder.status !== OrderStatus.DELIVERED) {
    throw new BadRequestException(
      'Sadece teslim edilmiş siparişler yeniden gönderilebilir'
    );
  }

  // 3. Item'ları validate et
  const validItemIds = originalOrder.items.map(i => i.id);
  const invalidItems = dto.itemIds.filter(id => !validItemIds.includes(id));
  if (invalidItems.length > 0) {
    throw new BadRequestException('Geçersiz ürünler');
  }

  // 4. Yeni sipariş numarası oluştur (sonuna R ekleyerek)
  const newOrderNumber = `${originalOrder.orderNumber}R`;

  // 5. Yeni sipariş oluştur
  const newOrder = this.orderRepository.create({
    orderNumber: newOrderNumber,
    packageId: `${originalOrder.packageId}R`,
    storeId: originalOrder.storeId,
    customerId: originalOrder.customerId,
    status: OrderStatus.CREATED,
    type: OrderType.MANUAL, // Yeniden gönderim manuel kabul edilir
    totalPrice: 0, // Aşağıda hesaplanacak
    orderDate: new Date(),
    cargoTrackingNumber: dto.cargoTrackingNumber,
    agreedDeliveryDate: originalOrder.agreedDeliveryDate,
  });

  // 6. Seçilen item'ları kopyala
  const selectedItems = originalOrder.items.filter(i => dto.itemIds.includes(i.id));
  let totalPrice = 0;

  const newItems = selectedItems.map(item => {
    totalPrice += (item.unitPrice || 0) * item.quantity;
    return this.orderItemRepository.create({
      orderId: newOrder.id, // Save sonrası set edilecek
      barcode: item.barcode,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      productColor: item.productColor,
      productSize: item.productSize,
      sku: item.sku,
      merchantSku: item.merchantSku,
      stockCode: item.stockCode,
    });
  });

  newOrder.totalPrice = totalPrice;
  newOrder.items = newItems;

  const savedOrder = await this.orderRepository.save(newOrder);

  // 7. Item'ları kaydet
  for (const item of newItems) {
    item.orderId = savedOrder.id;
  }
  await this.orderItemRepository.save(newItems);

  // 8. Faturalama gerekli mi?
  if (dto.needsInvoice) {
    // Fatura oluştur (invoicesService kullanarak)
    // await this.invoicesService.createForOrder(savedOrder.id);
  }

  // 9. OrderHistory'e kaydet
  await this.orderHistoryService.logEvent({
    orderId: savedOrder.id,
    action: 'RESHIPPED',
    userId,
    previousStatus: null,
    newStatus: OrderStatus.CREATED,
    description: `Yeniden gönderim: ${originalOrder.orderNumber}`,
    metadata: {
      originalOrderId: originalOrder.id,
      originalOrderNumber: originalOrder.orderNumber,
      reshippedItems: dto.itemIds.length,
    },
  });

  // 10. Orijinal siparişe de kaydet
  await this.orderHistoryService.logEvent({
    orderId: originalOrder.id,
    action: 'RESHIPPED_FROM',
    userId,
    previousStatus: OrderStatus.DELIVERED,
    newStatus: OrderStatus.DELIVERED,
    description: `Yeniden gönderim oluşturuldu: ${newOrderNumber}`,
    metadata: {
      newOrderId: savedOrder.id,
      newOrderNumber: savedOrder.orderNumber,
    },
  });

  return savedOrder;
}
```

---

## 🎨 Frontend Implementation

### 1. API Function: `lib/api.ts`

```typescript
export async function reshipOrder(
  orderId: string,
  data: {
    itemIds: string[];
    cargoTrackingNumber: string;
    needsInvoice: boolean;
  }
): Promise<ApiResponse<Order>> {
  const res = await fetch(`${API_URL}/orders/${orderId}/reship`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Yeniden gönderim başarısız');
  }
  return res.json();
}
```

### 2. Modal Component: `components/orders/ReshipmentModal.tsx`

```typescript
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
import { Order, OrderItem } from '@/lib/api';

interface ReshipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

export function ReshipmentModal({ isOpen, onClose, order }: ReshipmentModalProps) {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [cargoTrackingNumber, setCargoTrackingNumber] = useState('');
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === order.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(order.items.map(i => i.id));
    }
  };

  const handleSubmit = async () => {
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
      const result = await reshipOrder(order.id, {
        itemIds: selectedItems,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                {selectedItems.length === order.items.length
                  ? 'Tümünü Kaldır'
                  : 'Tümünü Seç'}
              </Button>
            </div>
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50"
                >
                  <Checkbox
                    id={item.id}
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => handleItemToggle(item.id)}
                  />
                  <Label
                    htmlFor={item.id}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.quantity} adet
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {item.barcode}
                    </div>
                  </Label>
                </div>
              ))}
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
            onClick={onClose}
            disabled={loading}
          >
            İptal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || selectedItems.length === 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Yeniden Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. OrderDetailClient Güncellemesi

```typescript
// State ekle
const [reshipModalOpen, setReshipModalOpen] = useState(false);

// Butonu ekle (DELIVERED durumunda ve action buttons bölümünde)
{order.status === 'DELIVERED' && (
  <Button
    variant="outline"
    onClick={() => setReshipModalOpen(true)}
    className="flex items-center gap-2"
  >
    <Package className="h-4 w-4" />
    Yeniden Gönder
  </Button>
)}

// Modal'ı ekle
<ReshipmentModal
  isOpen={reshipModalOpen}
  onClose={() => setReshipModalOpen(false)}
  order={order}
/>
```

---

## 📊 OrderHistory Action Ekle

```typescript
// orders/entities/order-history.entity.ts
export enum OrderHistoryAction {
  // ... mevcut actions
  RESHIPPED = 'RESHIPPED',
  RESHIPPED_FROM = 'RESHIPPED_FROM',
}

// order-history.service.ts
actionLabels: Record<string, string> = {
  // ... mevcut labels
  RESHIPPED: 'Yeniden Gönderim Oluşturuldu',
  RESHIPPED_FROM: 'Bu Siparişten Yeniden Gönderim',
};
```

---

## ✅ Validation Kuralları

1. **Sipariş Durumu**: Sadece `DELIVERED` durumundaki siparişler yeniden gönderilebilir
2. **Ürün Seçimi**: En az bir ürün seçilmelidir
3. **Kargo Takip No**: Zorunlu alan
4. **Item Validasyonu**: Sadece orijinal siparişteki item'lar seçilebilir

---

## 🧪 Test Senaryoları

| Senaryo | Beklenen Sonuç |
|---------|----------------|
| DELIVERED sipariş için yeniden gönderim | Yeni sipariş oluşturulur |
| CREATED sipariş için yeniden gönderim | Hata: "Sadece teslim edilmiş siparişler..." |
| Hiç ürün seçmeden gönderim | Hata: "En az bir ürün seçmelisiniz" |
| Kargo takip no olmadan gönderim | Hata: "Kargo takip numarası gereklidir" |
| needsInvoice = true | Fatura oluşturulur |
| needsInvoice = false | Fatura oluşturulmaz |

---

*Bu plan Code modunda uygulanmak üzere hazırlanmıştır.*

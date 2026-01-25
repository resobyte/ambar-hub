# AmbarHub - İş Akışları (Workflows) Kılavuzu

> **Son Güncelleme**: 2026-01-25  
> **Versiyon**: 1.0.0

---

## 📋 İçindekiler

1. [Sipariş Yönetimi Akışı](#1-sipariş-yönetimi-akışı)
2. [Mal Kabul (Goods Receipt) Akışı](#2-mal-kabul-goods-receipt-akışı)
3. [Toplama (Picking) Akışı](#3-toplama-picking-akışı)
4. [Paketleme (Packing) Akışı](#4-paketleme-packing-akışı)
5. [Rota Yönetimi Akışı](#5-rota-yönetimi-akışı)
6. [İade Yönetimi Akışı](#6-iade-yönetimi-akışı)
7. [Stok Hareketleri Akışı](#7-stok-hareketleri-akışı)

---

## 1. Sipariş Yönetimi Akışı

### 1.1 Sipariş Yaşam Döngüsü

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CREATED   │───▶│  PICKING    │───▶│  PICKED     │───▶│  PACKING    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       │                  │                  │                  ▼
       │                  │                  │           ┌─────────────┐
       │                  │                  │           │   PACKED    │
       │                  │                  │           └─────────────┘
       │                  │                  │                  │
       │                  │                  │                  ▼
       │                  │                  │           ┌─────────────┐
       │                  │                  │           │  SHIPPED    │
       │                  │                  │           └─────────────┘
       │                  │                  │                  │
       │                  │                  │                  ▼
       │                  │                  │           ┌─────────────┐
       │                  │                  │           │ DELIVERED   │
       │                  │                  │           └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ CANCELLED   │    │  RETURNED   │    │   FAULTY    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 1.2 Sipariş Durumları (OrderStatus)

| Durum | Açıklama | Sonraki Durumlar |
|-------|----------|------------------|
| `CREATED` | Sipariş oluşturuldu | PICKING, CANCELLED |
| `PICKING` | Toplama aşamasında | PICKED, CANCELLED |
| `PICKED` | Toplama tamamlandı | PACKING |
| `PACKING` | Paketleme aşamasında | PACKED |
| `PACKED` | Paketleme tamamlandı | SHIPPED |
| `SHIPPED` | Kargoya verildi | DELIVERED, RETURNED |
| `DELIVERED` | Teslim edildi | - |
| `CANCELLED` | İptal edildi | - |
| `RETURNED` | İade edildi | - |
| `FAULTY` | Hatalı sipariş | - |

### 1.3 Sipariş Oluşturma

**Endpoint:** `POST /api/orders`

**Request:**
```typescript
{
  storeId: string;
  customerId?: string;
  orderNumber?: string;  // Opsiyonel, otomatik üretilir
  items: {
    barcode: string;
    quantity: number;
    price: number;
  }[];
  customerFirstName?: string;
  customerLastName?: string;
  // ... diğer müşteri bilgileri
}
```

**İş Akışı:**
```
1. Sipariş verilerini doğrula
2. Müşteri varsa bul, yoksa oluştur
3. Ürünleri barkod ile eşleştir
4. Set ürünleri varsa genişlet (expandSetProduct)
5. Stok kontrolü yap (ProductStore)
6. Stokta yoksa WAITING_STOCK durumuna al
7. Siparişi oluştur ve CREATED durumuna ayarla
8. OrderHistory'e kaydet
```

### 1.4 Sipariş İptal Akışı

**Endpoint:** `POST /api/orders/:id/cancel`

**İş Akışı:**
```
1. Sipariş durumunu kontrol et (sadece CREATED/PICKING iptal edilebilir)
2. Marketplace siparişi ise:
   - Trendyol/Hepsiburada API ile iptal et
   - İade faturası kes (eğer gerekliyse)
3. Stok commitment'ı serbest bırak (releaseStockCommitment)
4. Sipariş durumunu CANCELLED yap
5. OrderHistory'e kaydet
```

---

## 2. Mal Kabul (Goods Receipt) Akışı

### 2.1 Mal Kabul Yaşam Döngüsü

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ PURCHASE    │───▶│   GOODS     │───▶│   STOCK     │
│   ORDER     │    │  RECEIPT    │    │  UPDATED    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       │                  │                  ▼
       │                  │           ┌─────────────┐
       │                  │           │ WAITING     │
       │                  │           │ ORDERS      │
       │                  │           │ PROCESSED  │
       │                  │           └─────────────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│   PARTIAL   │    │  COMPLETED  │
└─────────────┘    └─────────────┘
```

### 2.2 Satınalma Siparişi Oluşturma

**Endpoint:** `POST /api/purchases`

**Request:**
```typescript
{
  supplierId: string;
  orderDate: Date;
  type: 'MANUAL' | 'INVOICE';
  invoiceNumber?: string;  // INVOICE type için zorunlu
  items: {
    productId?: string;
    consumableId?: string;
    orderedQuantity: number;
    unitPrice: number;
  }[];
}
```

**İş Akışı:**
```
1. Tedarikçi kontrolü
2. Fatura numarası tekrar kontrolü (INVOICE type için)
3. Sipariş numarası oluştur (PO-YYYYMM-XXXXX)
4. PurchaseOrder oluştur (status: ORDERED)
5. PurchaseOrderItem'ları oluştur
```

### 2.3 Fatura İçe Aktarma (Uyumsoft)

**Endpoint:** `POST /api/purchases/import-invoice`

**İş Akışı:**
```
1. Uyumsoft'tan fatura verilerini çek
2. Tedarikçi eşleştirme:
   - VKN/TCKN ile ara
   - Bulunamazsa isim ile ara
   - Hala bulunamazsa YENİ tedarikçi oluştur
3. Ürün eşleştirme:
   - Barcode ile ara
   - Bulunamazsa SKU ile ara
   - Her ikisi de yoksa manuel eşleştirme gerekli
4. Önizleme verilerini döndür
5. Kullanıcı onayı ile PurchaseOrder oluştur
```

### 2.4 Mal Kabul (Goods Receipt)

**Endpoint:** `POST /api/purchases/:id/receive`

**Request:**
```typescript
{
  receivedByUserId: string;
  notes?: string;
  items: {
    productId?: string;
    consumableId?: string;
    shelfId: string;
    quantity: number;
    unitCost: number;
  }[];
}
```

**İş Akışı:**
```
1. PurchaseOrder durumunu kontrol et
2. GoodsReceipt oluştur (receiptNumber: GR-YYYYMM-XXXXX)
3. Her bir item için:
   a. GoodsReceiptItem oluştur
   b. Raf stoğuna ekle (shelvesService.addStockWithHistory)
   c. Ağırlıklı ortalama maliyet güncelle (productsService.addStockWithCost)
   d. PurchaseOrderItem.receivedQuantity güncelle
4. PurchaseOrder durumunu güncelle:
   - Tüm ürünler alındıysa → COMPLETED
   - Kısmen alındıysa → PARTIAL
5. WAITING_STOCK durumundaki siparişleri işle:
   - Stok açıldı → WAITING_PICKING durumuna taşı
```

### 2.5 Mal Kabul İptali (Reverse)

**Endpoint:** `POST /api/purchases/receipts/:id/reverse`

**İş Akışı:**
```
1. GoodsReceipt durumunu kontrol et
2. Her bir item için:
   a. Raf stoğundan çıkar
   b. PurchaseOrderItem.receivedQuantity düşür
3. GoodsReceipt durumunu REVERSED yap
4. PurchaseOrder durumunu güncelle
```

---

## 3. Toplama (Picking) Akışı

### 3.1 Toplama Yaşam Döngüsü

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ROUTE     │───▶│ COLLECTING  │───▶│   READY     │
│  CREATED    │    │  (PICKING)  │    │  (PICKED)   │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                  │
                           │                  ▼
                           │           ┌─────────────┐
                           │           │   PACKING   │
                           │           │   STARTED   │
                           │           └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   RESET     │
                    └─────────────┘
```

### 3.2 Rota Oluşturma

**Endpoint:** `POST /api/routes`

**Request:**
```typescript
{
  name: string;
  orderIds: string[];
}
```

**İş Akışı:**
```
1. Siparişleri kontrol et:
   - Tüm siparişler aynı mağazadan mı?
   - Siparişler aktif rotada değil mi?
2. Ürünlerin satılabilir rafta olduğunu kontrol et:
   - isSellable = true olan raflarda stok var mı?
3. Rota oluştur (status: DRAFT)
4. RouteOrder'ları oluştur (sequence ile sırala)
5. Rota durumunu ACTIVE yap
6. Siparişleri PICKING durumuna taşı
```

### 3.3 Toplama Başlatma

**Endpoint:** `POST /api/routes/:id/start`

**İş Akışı:**
```
1. Rota durumunu kontrol et
2. Rota durumunu COLLECTING yap
3. İlk siparişi PICKING durumuna taşı
4. OrderHistory'e kaydet
```

### 3.4 Toplama İlerlemesi

**Endpoint:** `GET /api/picking/progress/:routeId`

**Response:**
```typescript
{
  routeId: string;
  routeName: string;
  status: RouteStatus;
  totalItems: number;
  pickedItems: number;
  totalOrders: number;
  items: PickingItem[];
  isComplete: boolean;
}
```

**PickingItem:**
```typescript
{
  barcode: string;
  productName: string;
  shelfLocation?: string;      // "Depo A > Koridor 1 > Raf A-01"
  shelfId?: string;
  shelfBarcode?: string;
  totalQuantity: number;
  pickedQuantity: number;
  isComplete: boolean;
  orders: {
    orderId: string;
    orderNumber: string;
    quantity: number;
  }[];
}
```

### 3.5 Barkod Tara (Scan Barcode)

**Endpoint:** `POST /api/picking/scan`

**Request:**
```typescript
{
  routeId: string;
  barcode: string;
  quantity?: number;  // Default: 1
}
```

**İş Akışı:**
```
1. Rota durumunu kontrol et (COLLECTING olmalı)
2. Barkod rotada var mı?
3. Ürün zaten tamamlandı mı?
4. Picking progress'i güncelle (in-memory)
5. Stok transferi:
   - Kaynak raftan toplama havuzuna transfer
   - MovementType: PICKING
6. Tüm ürünler toplandı mı?
   - Evet → Rota durumunu READY yap
7. OrderHistory'e kaydet
```

### 3.6 Toplama Tamamlama

**Endpoint:** `POST /api/picking/complete`

**İş Akışı:**
```
1. Tüm ürünlerin toplandığını kontrol et
2. Rota durumunu READY yap
3. Tüm siparişleri PICKED durumuna taşı
4. OrderHistory'e kaydet
```

---

## 4. Paketleme (Packing) Akışı

### 4.1 Paketleme Yaşam Döngüsü

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ROUTE     │───▶│   PACKING   │───▶│   PACKED    │───▶│  SHIPPED    │
│   READY     │    │  SESSION    │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                           │                  │                  │
                           │                  │                  ▼
                           │                  │           ┌─────────────┐
                           │                  │           │   INVOICE   │
                           │                  │           │   CREATED   │
                           │                  │           └─────────────┘
                           │                  │
                           ▼                  ▼
                    ┌─────────────┐    ┌─────────────┐
                    │   CANCEL    │    │  COMPLETED  │
                    └─────────────┘    └─────────────┘
```

### 4.2 Paketleme Oturumu Başlatma

**Endpoint:** `POST /api/packing/start`

**Request:**
```typescript
{
  routeId: string;
  stationId?: string;
}
```

**İş Akışı:**
```
1. Rota durumunu kontrol et (READY veya COLLECTING olmalı)
2. Aktif oturum var mı? Varsa mevcut oturumu döndür
3. PackingSession oluştur (status: ACTIVE)
4. PackingOrderItem'ları oluştur:
   - Rota siparişlerini sırayla ekle
   - Her sipariş item'ını ekle
   - Sequence ile sırala
5. İlk paketlenmemiş siparişi currentOrder yap
6. İlk siparişi PACKING durumuna taşı
7. OrderHistory'e kaydet
```

### 4.3 Barkod Tara (Scan Barcode)

**Endpoint:** `POST /api/packing/scan`

**Request:**
```typescript
{
  sessionId: string;
  barcode: string;
}
```

**İş Akışı:**
```
1. Oturum durumunu kontrol et (ACTIVE olmalı)
2. Mevcut siparişin item'larını bul
3. Barkod mevcut siparişte mi?
   - Hayır → Hata döndür
4. ScannedQuantity artır
5. Gerekli miktar tamamlandı mı?
   - isComplete = true
6. Stok transferi:
   - Toplama havuzundan paketleme raftına transfer
   - MovementType: PACKING
7. Tüm item'lar tamamlandı mı?
   - orderComplete = true
```

### 4.4 Siparişi Tamamla

**Endpoint:** `POST /api/packing/complete-order`

**Request:**
```typescript
{
  sessionId: string;
  orderId: string;
  consumables?: {
    consumableId: string;
    quantity: number;
  }[];
  processShipment?: boolean;  // Default: auto-detect
}
```

**İş Akışı:**
```
1. Sarf malzemelerini işle:
   a. OrderConsumable oluştur
   b. Consumable stoğunu düşür
2. Paketleme rafından stok düşür
3. Stok commitment'ı serbest bırak
4. RouteOrder.isPacked = true
5. Sipariş durumunu PACKED yap
6. OrderHistory'e kaydet
7. Kargo işlemi:
   a. processShipment kontrolü:
      - Manuel sipariş → true
      - Marketplace → store.sendOrderStatus kontrolü
   b. processOrderShipment çalıştır:
      - Fatura oluştur (eğer gerekliyse)
      - Kargo etiketi oluştur
      - İrsaliye oluştur
      - Marketplace'e durum gönder
      - Siparişi SHIPPED durumuna taşı
8. Sonraki siparişe geç veya oturumu tamamla
```

### 4.5 Kargo İşleme (processOrderShipment)

**İş Akışı:**
```
┌─────────────────────────────────────────────────────────────┐
│                    processOrderShipment                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Marketplace?   │
                    └─────────────────┘
                      │           │
                     EVET         HAYIR
                      │           │
                      ▼           ▼
        ┌──────────────────┐   ┌──────────────────┐
        │ processMarketplace│   │  processManual   │
        │    Shipment       │   │    Shipment      │
        └──────────────────┘   └──────────────────┘
                      │           │
                      └─────┬─────┘
                            ▼
                  ┌─────────────────┐
                  │ ShipmentResult  │
                  │  - invoiceNumber│
                  │  - waybillNumber│
                  │  - cargoLabel   │
                  └─────────────────┘
```

**Marketplace Shipment:**
```
1. Mağaza ayarlarını kontrol et
2. Fatura oluştur (eğer invoiceEnabled ise)
3. Kargo etiketi oluştur (Aras Kargo API)
4. İrsaliye oluştur
5. Marketplace'e durum gönder:
   - Trendyol: packageService (picking)
   - Hepsiburada: packing/shipping
6. Siparişi SHIPPED durumuna taşı
7. OrderHistory'e kaydet
```

**Manual Shipment:**
```
1. Fatura oluştur (eğer gerekliyse)
2. Kargo etiketi oluştur (manuel)
3. İrsaliye oluştur
4. Siparişi SHIPPED durumuna taşı
5. OrderHistory'e kaydet
```

---

## 5. Rota Yönetimi Akışı

### 5.1 Rota Durumları (RouteStatus)

| Durum | Açıklama |
|-------|----------|
| `DRAFT` | Taslak - siparişler ekleniyor |
| `ACTIVE` | Aktif - toplama başlayabilir |
| `COLLECTING` | Toplama yapılıyor |
| `READY` | Toplama tamamlandı, paketlemeye hazır |
| `COMPLETED` | Rota tamamlandı |
| `CANCELLED` | İptal edildi |

### 5.2 Rota Öneri Sistemi

**Endpoint:** `GET /api/routes/suggestions`

**Response:**
```typescript
RouteSuggestion[] {
  id: string;
  type: 'single_product' | 'single_product_multi' | 'mixed';
  name: string;
  description: string;
  storeName?: string;
  orderCount: number;
  totalQuantity: number;
  products: {
    barcode: string;
    name: string;
    orderCount: number;
    totalQuantity: number;
  }[];
  orders: OrderWithProductInfo[];
  priority: number;
}
```

**Öneri Türleri:**
- `single_product`: Tek ürün, tek sipariş
- `single_product_multi`: Tek ürün, çoklu sipariş
- `mixed`: Karışık ürünler

### 5.3 Rota Tamamlama

**Endpoint:** `POST /api/routes/:id/complete`

**İş Akışı:**
```
1. Tüm siparişlerin paketlendiğini kontrol et
2. Rota durumunu COMPLETED yap
3. completedAt tarihini set et
4. OrderHistory'e kaydet
```

---

## 6. İade Yönetimi Akışı

### 6.1 İade Durumları (ReturnStatus)

| Durum | Açıklama |
|-------|----------|
| `PENDING` | Beklemede |
| `RECEIVED` | Ürün teslim alındı |
| `INSPECTED` | İnceleme yapıldı |
| `APPROVED` | Onaylandı |
| `REJECTED` | Reddedildi |
| `REFUNDED` | İade yapıldı |

### 6.2 İade Oluşturma

**Endpoint:** `POST /api/returns`

**Request:**
```typescript
{
  orderId: string;
  reason: string;
  notes?: string;
  items: {
    orderItemId: string;
    quantity: number;
  }[];
}
```

### 6.3 İade İşleme

**Endpoint:** `POST /api/returns/:id/receive`

**İş Akışı:**
```
1. İade durumunu RECEIVED yap
2. Ürünleri stoka ekle (veya iade raftasına)
3. OrderHistory'e kaydet
```

---

## 7. Stok Hareketleri Akışı

### 7.1 Raf Türleri (ShelfType)

| Tür | Açıklama | isPickable | isSellable |
|-----|----------|------------|------------|
| `STORAGE` | Depolama | false | false |
| `PICKING` | Toplama alanı | true | false |
| `PACKING` | Paketleme alanı | false | false |
| `SHIPPING` | Kargo alanı | false | false |

### 7.2 Stok Hareket Türleri (MovementType)

| Tür | Açıklama |
|-----|----------|
| `IN` | Giriş (mal kabul, iade) |
| `OUT` | Çıkış (satış, fire) |
| `TRANSFER` | Transfer (raflar arası) |
| `ADJUSTMENT` | Düzeltme |
| `PICKING` | Toplama işlemi |
| `PACKING` | Paketleme işlemi |

### 7.3 Stok Transfer Akışı

**Endpoint:** `POST /api/shelves/transfer`

**Request:**
```typescript
{
  fromShelfId: string;
  toShelfId: string;
  productId: string;
  quantity: number;
  notes?: string;
}
```

**İş Akışı:**
```
1. Kaynak rafta stok kontrolü
2. Hedef raf kontrolü
3. Stok transferi:
   a. Kaynak raftan çıkar
   b. Hedef rafa ekle
   c. ShelfStockMovement oluştur (2 kayıt)
   d. ProductStore stoğunu senkronize et
4. OrderHistory'e kaydet (eğer sipariş ile ilgiliyse)
```

### 7.4 Stok Düzeltme

**Endpoint:** `POST /api/shelves/adjust`

**İş Akışı:**
```
1. Mevcut stok kontrolü
2. Fark hesapla
3. Stok güncelle
4. ShelfStockMovement oluştur (ADJUSTMENT)
5. ProductStore stoğunu senkronize et
```

---

## 🔄 Tam İş Akışı Örneği

### Siparişten Kargoya Tam Akış

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SIPARİŞ ALINDI                              │
│  POST /api/orders → OrderStatus: CREATED                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ROTA OLUŞTURULDU                            │
│  POST /api/routes → RouteStatus: DRAFT → ACTIVE                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        TOPLAMA BAŞLADI                             │
│  POST /api/routes/:id/start → RouteStatus: COLLECTING             │
│  OrderStatus: PICKING                                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BARKOD TARAMA                               │
│  POST /api/picking/scan                                            │
│  - Kaynak raftan toplama havuzuna transfer                         │
│  - PickingProgress güncelle                                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        TOPLAMA TAMAMLANDI                          │
│  Tüm ürünler toplandı                                              │
│  RouteStatus: READY                                                │
│  OrderStatus: PICKED                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        PAKETLEME BAŞLADI                           │
│  POST /api/packing/start → PackingSession: ACTIVE                  │
│  OrderStatus: PACKING                                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BARKOD TARAMA (PAKETLEME)                    │
│  POST /api/packing/scan                                            │
│  - Toplama havuzundan paketleme raftına transfer                   │
│  - PackingOrderItem.scannedQuantity artır                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SİPARİŞ TAMAMLANDI                          │
│  POST /api/packing/complete-order                                  │
│  - Sarf malzemelerini düş                                          │
│  - Paketleme rafından stok düşür                                   │
│  - RouteOrder.isPacked = true                                     │
│  OrderStatus: PACKED                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────��────────────────────────────────────────────────────────────────┐
│                        KARGO İŞLEME                                │
│  processOrderShipment()                                            │
│  - Fatura oluştur                                                  │
│  - Kargo etiketi oluştur                                           │
│  - İrsaliye oluştur                                                │
│  - Marketplace'a durum gönder                                      │
│  OrderStatus: SHIPPED                                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        TESLİAT                                     │
│  POST /api/orders/:id/deliver                                     │
│  OrderStatus: DELIVERED                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Entity İlişkileri

### Sipariş Merkezli İlişkiler

```
Order
├── Customer (Many-to-One)
├── Store (Many-to-One)
├── Items (One-to-Many)
│   └── Product (Many-to-One)
├── Consumables (One-to-Many)
│   └── Consumable (Many-to-One)
├── Histories (One-to-Many)
├── RouteOrder (One-to-One)
│   └── Route (Many-to-One)
│       ├── RouteOrders (One-to-Many)
│       ├── Consumables (One-to-Many)
│       └── PackingSession (One-to-One)
│           ├── PackingOrderItems (One-to-Many)
│           └── OrderConsumables (One-to-Many)
├── Invoice (One-to-One)
└── Waybill (One-to-One)
```

### Stok Merkezli İlişkiler

```
Product
├── ProductStores (One-to-Many)
│   └── Store (Many-to-One)
├── ShelfStocks (One-to-Many)
│   └── Shelf (Many-to-One)
│       ├── Warehouse (Many-to-One)
│       └── ShelfStockMovements (One-to-Many)
└── PurchaseOrderItems (One-to-Many)
    └── PurchaseOrder (Many-to-One)
        ├── Supplier (Many-to-One)
        └── GoodsReceipts (One-to-Many)
            └── GoodsReceiptItems (One-to-Many)
```

---

*Bu dokümantasyon AmbarHub WMS sisteminin iş akışlarını detaylı olarak açıklamaktadır.*

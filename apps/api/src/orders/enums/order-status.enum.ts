export enum OrderStatus {
    CREATED = 'CREATED',
    WAITING_STOCK = 'WAITING_STOCK',       // Stok Bekliyor
    WAITING_PICKING = 'WAITING_PICKING',   // Toplama Bekliyor
    PICKING = 'PICKING',                   // Rotada Toplanıyor
    PICKED = 'PICKED',                     // Rotada Toplandı
    PACKING = 'PACKING',                   // Paketleniyor
    PACKED = 'PACKED',                     // Paketlendi
    INVOICED = 'INVOICED',                 // Faturalandı
    SHIPPED = 'SHIPPED',                   // Kargoya Verildi
    CANCELLED = 'CANCELLED',               // İptal Edildi
    DELIVERED = 'DELIVERED',               // Teslim Edildi
    UNDELIVERED = 'UNDELIVERED',           // Teslim Edilemedi
    RETURNED = 'RETURNED',                 // İade Edildi
    REPACK = 'REPACK',                     // Yeniden Paketle
    UNSUPPLIED = 'UNSUPPLIED',             // Temin Edilemedi (legacy)
    UNKNOWN = 'UNKNOWN',
}

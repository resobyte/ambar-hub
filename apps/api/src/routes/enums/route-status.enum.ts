export enum RouteStatus {
    COLLECTING = 'COLLECTING',  // Toplanıyor
    READY = 'READY',            // Hazır (Toplama tamamlandı)
    COMPLETED = 'COMPLETED',    // Paketleme tamamlandı
    CANCELLED = 'CANCELLED',    // İptal edildi
}

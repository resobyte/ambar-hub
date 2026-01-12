export enum ShelfType {
    NORMAL = 'NORMAL',           // Normal stok rafı
    DAMAGED = 'DAMAGED',         // Hasarlı ürün rafı
    PACKING = 'PACKING',         // Paketleme alanı
    PICKING = 'PICKING',         // Toplama alanı
    RECEIVING = 'RECEIVING',     // Mal kabul alanı
}

// Raf tipi kuralları
export const SHELF_TYPE_RULES = {
    [ShelfType.NORMAL]: { isSellable: true, isReservable: true },
    [ShelfType.DAMAGED]: { isSellable: false, isReservable: false },
    [ShelfType.PACKING]: { isSellable: false, isReservable: false },
    [ShelfType.PICKING]: { isSellable: true, isReservable: true },
    [ShelfType.RECEIVING]: { isSellable: false, isReservable: false },
};

export enum ShelfType {
    NORMAL = 'NORMAL',           // Normal stok rafı
    DAMAGED = 'DAMAGED',         // Hasarlı ürün rafı
    PACKING = 'PACKING',         // Paketleme alanı
    PICKING = 'PICKING',         // Toplama alanı
    RECEIVING = 'RECEIVING',     // Mal kabul alanı
    RETURN = 'RETURN',           // İade rafı
    RETURN_DAMAGED = 'RETURN_DAMAGED', // İade hasarlı rafı
}

// Raf tipi kuralları
export const SHELF_TYPE_RULES: Record<ShelfType, { isSellable: boolean; isReservable: boolean }> = {
    [ShelfType.NORMAL]: { isSellable: true, isReservable: true },
    [ShelfType.DAMAGED]: { isSellable: false, isReservable: false },
    [ShelfType.PACKING]: { isSellable: false, isReservable: false },
    [ShelfType.PICKING]: { isSellable: true, isReservable: true },
    [ShelfType.RECEIVING]: { isSellable: false, isReservable: true },
    [ShelfType.RETURN]: { isSellable: false, isReservable: false },
    [ShelfType.RETURN_DAMAGED]: { isSellable: false, isReservable: false },
};

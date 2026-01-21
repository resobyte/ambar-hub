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
export const SHELF_TYPE_RULES: Record<ShelfType, { isSellable: boolean }> = {
    [ShelfType.NORMAL]: { isSellable: true },
    [ShelfType.DAMAGED]: { isSellable: false },
    [ShelfType.PACKING]: { isSellable: false },
    [ShelfType.PICKING]: { isSellable: true },
    [ShelfType.RECEIVING]: { isSellable: false },
    [ShelfType.RETURN]: { isSellable: false },
    [ShelfType.RETURN_DAMAGED]: { isSellable: false },
};

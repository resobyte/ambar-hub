export enum ReturnStatus {
    // Trendyol statüleri
    CREATED = 'Created',
    WAITING_IN_ACTION = 'WaitingInAction',
    WAITING_FRAUD_CHECK = 'WaitingFraudCheck',
    ACCEPTED = 'Accepted',
    REJECTED = 'Rejected',
    CANCELLED = 'Cancelled',
    UNRESOLVED = 'Unresolved',
    IN_ANALYSIS = 'InAnalysis',
    
    // Bizim internal statülerimiz
    PENDING_SHELF = 'PendingShelf', // Rafa yerleştirme bekliyor
    COMPLETED = 'Completed', // İşlem tamamlandı, stok eklendi
}

export enum ReturnShelfType {
    NORMAL = 'NORMAL', // Normal iade - satışa uygun
    DAMAGED = 'DAMAGED', // Hasarlı iade - satışa uygun değil
}

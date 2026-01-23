SET foreign_key_checks = 0;

-- Raf ve Stok
TRUNCATE TABLE shelf_stock_movements;
TRUNCATE TABLE shelf_stocks;
TRUNCATE TABLE shelf_consumable_stocks;
TRUNCATE TABLE shelves;

-- Sarf Malzemeleri
TRUNCATE TABLE consumables;

-- Satın Alma & Mal Kabul
TRUNCATE TABLE goods_receipt_items;
TRUNCATE TABLE goods_receipts;
TRUNCATE TABLE purchase_order_items;
TRUNCATE TABLE purchase_orders;

-- Siparişler (eğer bunları da sıfırlamak istersen)
TRUNCATE TABLE order_histories;
TRUNCATE TABLE order_consumables;
TRUNCATE TABLE order_items;
TRUNCATE TABLE faulty_orders;
TRUNCATE TABLE orders;

-- Rotalama & Paketleme
TRUNCATE TABLE route_consumables;
TRUNCATE TABLE route_orders;
TRUNCATE TABLE routes;
TRUNCATE TABLE packing_order_items;
TRUNCATE TABLE packing_sessions;

-- Fatura & İrsaliye
TRUNCATE TABLE invoices;
TRUNCATE TABLE waybills;

SET foreign_key_checks = 1;
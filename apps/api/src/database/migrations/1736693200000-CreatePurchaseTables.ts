import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseTables1736693200000 implements MigrationInterface {
    name = 'CreatePurchaseTables1736693200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create suppliers table
        await queryRunner.query(`
            CREATE TABLE \`suppliers\` (
                \`id\` VARCHAR(36) NOT NULL,
                \`created_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleted_at\` TIMESTAMP(6) NULL,
                \`name\` VARCHAR(255) NOT NULL,
                \`code\` VARCHAR(50) NULL,
                \`email\` VARCHAR(255) NULL,
                \`phone\` VARCHAR(50) NULL,
                \`address\` TEXT NULL,
                \`contact_person\` VARCHAR(255) NULL,
                \`tax_number\` VARCHAR(50) NULL,
                \`is_active\` TINYINT NOT NULL DEFAULT 1,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_suppliers_code\` (\`code\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Create purchase_orders table
        await queryRunner.query(`
            CREATE TABLE \`purchase_orders\` (
                \`id\` VARCHAR(36) NOT NULL,
                \`created_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleted_at\` TIMESTAMP(6) NULL,
                \`order_number\` VARCHAR(50) NOT NULL,
                \`supplier_id\` VARCHAR(36) NOT NULL,
                \`status\` ENUM('DRAFT', 'ORDERED', 'PARTIAL', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
                \`total_amount\` DECIMAL(12,2) NOT NULL DEFAULT 0,
                \`order_date\` DATE NOT NULL,
                \`expected_date\` DATE NULL,
                \`notes\` TEXT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_purchase_orders_number\` (\`order_number\`),
                KEY \`IDX_purchase_orders_supplier\` (\`supplier_id\`),
                KEY \`IDX_purchase_orders_status\` (\`status\`),
                CONSTRAINT \`FK_purchase_orders_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Create purchase_order_items table
        await queryRunner.query(`
            CREATE TABLE \`purchase_order_items\` (
                \`id\` VARCHAR(36) NOT NULL,
                \`created_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleted_at\` TIMESTAMP(6) NULL,
                \`purchase_order_id\` VARCHAR(36) NOT NULL,
                \`product_id\` VARCHAR(36) NOT NULL,
                \`ordered_quantity\` INT NOT NULL,
                \`received_quantity\` INT NOT NULL DEFAULT 0,
                \`unit_price\` DECIMAL(10,2) NOT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_po_items_order\` (\`purchase_order_id\`),
                KEY \`IDX_po_items_product\` (\`product_id\`),
                CONSTRAINT \`FK_po_items_order\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\`(\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_po_items_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Create goods_receipts table
        await queryRunner.query(`
            CREATE TABLE \`goods_receipts\` (
                \`id\` VARCHAR(36) NOT NULL,
                \`created_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleted_at\` TIMESTAMP(6) NULL,
                \`receipt_number\` VARCHAR(50) NOT NULL,
                \`purchase_order_id\` VARCHAR(36) NOT NULL,
                \`received_by_user_id\` VARCHAR(36) NULL,
                \`status\` ENUM('PENDING', 'COMPLETED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
                \`receipt_date\` DATETIME NOT NULL,
                \`notes\` TEXT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_goods_receipts_number\` (\`receipt_number\`),
                KEY \`IDX_goods_receipts_po\` (\`purchase_order_id\`),
                KEY \`IDX_goods_receipts_user\` (\`received_by_user_id\`),
                CONSTRAINT \`FK_goods_receipts_po\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\`(\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_goods_receipts_user\` FOREIGN KEY (\`received_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Create goods_receipt_items table
        await queryRunner.query(`
            CREATE TABLE \`goods_receipt_items\` (
                \`id\` VARCHAR(36) NOT NULL,
                \`created_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleted_at\` TIMESTAMP(6) NULL,
                \`goods_receipt_id\` VARCHAR(36) NOT NULL,
                \`product_id\` VARCHAR(36) NOT NULL,
                \`shelf_id\` VARCHAR(36) NOT NULL,
                \`quantity\` INT NOT NULL,
                \`unit_cost\` DECIMAL(10,2) NOT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_gr_items_receipt\` (\`goods_receipt_id\`),
                KEY \`IDX_gr_items_product\` (\`product_id\`),
                KEY \`IDX_gr_items_shelf\` (\`shelf_id\`),
                CONSTRAINT \`FK_gr_items_receipt\` FOREIGN KEY (\`goods_receipt_id\`) REFERENCES \`goods_receipts\`(\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_gr_items_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_gr_items_shelf\` FOREIGN KEY (\`shelf_id\`) REFERENCES \`shelves\`(\`id\`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`goods_receipt_items\``);
        await queryRunner.query(`DROP TABLE \`goods_receipts\``);
        await queryRunner.query(`DROP TABLE \`purchase_order_items\``);
        await queryRunner.query(`DROP TABLE \`purchase_orders\``);
        await queryRunner.query(`DROP TABLE \`suppliers\``);
    }
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateShelvesTable1736693100000 implements MigrationInterface {
    name = 'CreateShelvesTable1736693100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create shelves table
        await queryRunner.query(`
            CREATE TABLE \`shelves\` (
                \`id\` VARCHAR(36) NOT NULL,
                \`created_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleted_at\` TIMESTAMP(6) NULL,
                \`name\` VARCHAR(255) NOT NULL,
                \`barcode\` VARCHAR(100) NOT NULL,
                \`type\` ENUM('NORMAL', 'DAMAGED', 'PACKING', 'PICKING', 'RECEIVING') NOT NULL DEFAULT 'NORMAL',
                \`warehouse_id\` VARCHAR(36) NOT NULL,
                \`parent_id\` VARCHAR(36) NULL,
                \`path\` VARCHAR(1000) NULL,
                \`mpath\` VARCHAR(1000) NULL DEFAULT '',
                \`global_slot\` INT NOT NULL DEFAULT 0,
                \`is_sellable\` TINYINT NOT NULL DEFAULT 1,
                \`is_reservable\` TINYINT NOT NULL DEFAULT 1,
                \`sort_order\` INT NOT NULL DEFAULT 0,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_shelves_barcode\` (\`barcode\`),
                KEY \`IDX_shelves_warehouse\` (\`warehouse_id\`),
                KEY \`IDX_shelves_parent\` (\`parent_id\`),
                KEY \`IDX_shelves_type\` (\`type\`),
                CONSTRAINT \`FK_shelves_warehouse\` FOREIGN KEY (\`warehouse_id\`) REFERENCES \`warehouses\`(\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_shelves_parent\` FOREIGN KEY (\`parent_id\`) REFERENCES \`shelves\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Create shelf_stocks table
        await queryRunner.query(`
            CREATE TABLE \`shelf_stocks\` (
                \`id\` VARCHAR(36) NOT NULL,
                \`created_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleted_at\` TIMESTAMP(6) NULL,
                \`shelf_id\` VARCHAR(36) NOT NULL,
                \`product_id\` VARCHAR(36) NOT NULL,
                \`quantity\` INT NOT NULL DEFAULT 0,
                \`reserved_quantity\` INT NOT NULL DEFAULT 0,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_shelf_stocks_shelf_product\` (\`shelf_id\`, \`product_id\`),
                KEY \`IDX_shelf_stocks_shelf\` (\`shelf_id\`),
                KEY \`IDX_shelf_stocks_product\` (\`product_id\`),
                CONSTRAINT \`FK_shelf_stocks_shelf\` FOREIGN KEY (\`shelf_id\`) REFERENCES \`shelves\`(\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_shelf_stocks_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`shelf_stocks\``);
        await queryRunner.query(`DROP TABLE \`shelves\``);
    }
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSetProductsFeature1736686000000 implements MigrationInterface {
    name = 'AddSetProductsFeature1736686000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add product_type and set_price to products table
        await queryRunner.query(`
            ALTER TABLE \`products\` 
            ADD COLUMN \`product_type\` ENUM('SIMPLE', 'SET') NOT NULL DEFAULT 'SIMPLE',
            ADD COLUMN \`set_price\` DECIMAL(10,2) NULL
        `);

        // Create product_set_items table
        await queryRunner.query(`
            CREATE TABLE \`product_set_items\` (
                \`id\` VARCHAR(36) NOT NULL,
                \`created_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`set_product_id\` VARCHAR(36) NOT NULL,
                \`component_product_id\` VARCHAR(36) NOT NULL,
                \`quantity\` INT NOT NULL DEFAULT 1,
                \`price_share\` DECIMAL(10,2) NOT NULL DEFAULT 0,
                \`sort_order\` INT NOT NULL DEFAULT 0,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_set_product_id\` (\`set_product_id\`),
                KEY \`IDX_component_product_id\` (\`component_product_id\`),
                CONSTRAINT \`FK_set_product\` FOREIGN KEY (\`set_product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_component_product\` FOREIGN KEY (\`component_product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Add SET tracking columns to order_items
        await queryRunner.query(`
            ALTER TABLE \`order_items\`
            ADD COLUMN \`set_product_id\` VARCHAR(36) NULL,
            ADD COLUMN \`is_set_component\` TINYINT NOT NULL DEFAULT 0,
            ADD COLUMN \`set_barcode\` VARCHAR(255) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove SET tracking columns from order_items
        await queryRunner.query(`
            ALTER TABLE \`order_items\`
            DROP COLUMN \`set_product_id\`,
            DROP COLUMN \`is_set_component\`,
            DROP COLUMN \`set_barcode\`
        `);

        // Drop product_set_items table
        await queryRunner.query(`DROP TABLE \`product_set_items\``);

        // Remove product_type and set_price from products
        await queryRunner.query(`
            ALTER TABLE \`products\`
            DROP COLUMN \`product_type\`,
            DROP COLUMN \`set_price\`
        `);
    }
}

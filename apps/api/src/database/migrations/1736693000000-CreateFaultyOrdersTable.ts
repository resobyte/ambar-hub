import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFaultyOrdersTable1736693000000 implements MigrationInterface {
    name = 'CreateFaultyOrdersTable1736693000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`faulty_orders\` (
                \`id\` VARCHAR(36) NOT NULL,
                \`created_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleted_at\` TIMESTAMP(6) NULL,
                \`integration_id\` VARCHAR(36) NOT NULL,
                \`store_id\` VARCHAR(36) NULL,
                \`package_id\` VARCHAR(255) NOT NULL,
                \`order_number\` VARCHAR(255) NULL,
                \`raw_data\` JSON NOT NULL,
                \`missing_barcodes\` JSON NOT NULL,
                \`error_reason\` ENUM('MISSING_PRODUCTS', 'INVALID_DATA', 'UNKNOWN') NOT NULL DEFAULT 'MISSING_PRODUCTS',
                \`retry_count\` INT NOT NULL DEFAULT 0,
                \`customer_name\` VARCHAR(255) NULL,
                \`total_price\` DECIMAL(10,2) NULL,
                \`currency_code\` VARCHAR(10) NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_faulty_orders_package_id\` (\`package_id\`),
                KEY \`IDX_faulty_orders_integration\` (\`integration_id\`),
                KEY \`IDX_faulty_orders_store\` (\`store_id\`),
                CONSTRAINT \`FK_faulty_orders_integration\` FOREIGN KEY (\`integration_id\`) REFERENCES \`integrations\`(\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_faulty_orders_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\`(\`id\`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`faulty_orders\``);
    }
}

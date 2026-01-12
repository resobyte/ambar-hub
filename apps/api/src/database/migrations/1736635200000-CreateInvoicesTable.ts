import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInvoicesTable1736635200000 implements MigrationInterface {
    name = 'CreateInvoicesTable1736635200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`invoices\` (
                \`id\` varchar(36) NOT NULL,
                \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`order_id\` varchar(36) NOT NULL,
                \`store_id\` varchar(36) NULL,
                \`invoice_number\` varchar(255) NOT NULL,
                \`invoice_serial\` varchar(50) NULL,
                \`edoc_no\` varchar(255) NULL,
                \`ettn\` varchar(255) NULL,
                \`status\` enum('PENDING', 'SENT', 'SUCCESS', 'ERROR', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
                \`error_message\` text NULL,
                \`card_code\` varchar(100) NULL,
                \`branch_code\` varchar(50) NULL,
                \`doc_tra_code\` varchar(50) NULL,
                \`cost_center_code\` varchar(100) NULL,
                \`whouse_code\` varchar(50) NULL,
                \`customer_first_name\` varchar(255) NULL,
                \`customer_last_name\` varchar(255) NULL,
                \`customer_email\` varchar(255) NULL,
                \`customer_address\` text NULL,
                \`total_amount\` decimal(10,2) NOT NULL,
                \`currency_code\` varchar(10) NOT NULL DEFAULT 'TRY',
                \`invoice_date\` timestamp NOT NULL,
                \`shipping_date\` timestamp NULL,
                \`request_payload\` json NULL,
                \`response_payload\` json NULL,
                \`uyumsoft_invoice_id\` varchar(255) NULL,
                PRIMARY KEY (\`id\`),
                KEY \`IDX_invoices_order_id\` (\`order_id\`),
                KEY \`IDX_invoices_store_id\` (\`store_id\`),
                KEY \`IDX_invoices_invoice_number\` (\`invoice_number\`),
                KEY \`IDX_invoices_status\` (\`status\`),
                CONSTRAINT \`FK_invoices_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_invoices_store\` FOREIGN KEY (\`store_id\`) REFERENCES \`stores\`(\`id\`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`invoices\``);
    }
}

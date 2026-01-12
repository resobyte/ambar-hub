import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandOrderSchema1736634600000 implements MigrationInterface {
    name = 'ExpandOrderSchema1736634600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ─────────────────────────────────────────────────────────────
        // Orders table changes
        // ─────────────────────────────────────────────────────────────

        // Remove old unique constraint on order_number
        await queryRunner.query(`ALTER TABLE \`orders\` DROP INDEX \`IDX_orders_order_number\``).catch(() => { });
        await queryRunner.query(`ALTER TABLE \`orders\` DROP INDEX \`order_number\``).catch(() => { });

        // Add package_id column (unique)
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`package_id\` varchar(255) NULL`);

        // Populate package_id with order_number for existing records
        await queryRunner.query(`UPDATE \`orders\` SET \`package_id\` = \`order_number\` WHERE \`package_id\` IS NULL`);

        // Make package_id NOT NULL and UNIQUE
        await queryRunner.query(`ALTER TABLE \`orders\` MODIFY \`package_id\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD UNIQUE INDEX \`IDX_orders_package_id\` (\`package_id\`)`);

        // Add new columns to orders
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`currency_code\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`estimated_delivery_start\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`estimated_delivery_end\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`agreed_delivery_date\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`last_modified_date\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`cargo_tracking_number\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`cargo_tracking_link\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`cargo_sender_number\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`cargo_provider_name\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`delivery_type\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`fast_delivery\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`who_pays\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`shipping_address\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`invoice_address\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`invoice_link\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`tax_number\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`commercial\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`micro\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`etgb_no\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`etgb_date\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`hs_code\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`contains_dangerous_product\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`warehouse_id\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`gift_box_requested\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`three_p_by_trendyol\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`delivered_by_service\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`cargo_deci\` decimal(10,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`is_cod\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`created_by\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`origin_package_ids\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`package_histories\` json NULL`);

        // ─────────────────────────────────────────────────────────────
        // Order items table changes
        // ─────────────────────────────────────────────────────────────
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`line_id\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`merchant_sku\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`stock_code\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`product_code\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`content_id\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`product_color\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`product_size\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`product_origin\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`product_category_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`currency_code\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`vat_base_amount\` decimal(10,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`vat_rate\` decimal(5,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`commission\` decimal(5,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`order_line_item_status\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`sales_campaign_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`cancelled_by\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`cancel_reason\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`cancel_reason_code\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`discount_details\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`fast_delivery_options\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Order items rollback
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`fast_delivery_options\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`discount_details\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`cancel_reason_code\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`cancel_reason\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`cancelled_by\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`sales_campaign_id\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`order_line_item_status\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`commission\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`vat_rate\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`vat_base_amount\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`currency_code\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`product_category_id\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`product_origin\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`product_size\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`product_color\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`content_id\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`product_code\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`stock_code\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`merchant_sku\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`line_id\``);

        // Orders rollback
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`package_histories\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`origin_package_ids\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`created_by\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`is_cod\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`cargo_deci\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`delivered_by_service\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`three_p_by_trendyol\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`gift_box_requested\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`warehouse_id\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`contains_dangerous_product\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`hs_code\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`etgb_date\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`etgb_no\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`micro\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`commercial\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`tax_number\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`invoice_link\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`invoice_address\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`shipping_address\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`who_pays\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`fast_delivery\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`delivery_type\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`cargo_provider_name\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`cargo_sender_number\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`cargo_tracking_link\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`cargo_tracking_number\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`last_modified_date\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`agreed_delivery_date\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`estimated_delivery_end\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`estimated_delivery_start\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`currency_code\``);

        // Restore package_id -> order_number unique
        await queryRunner.query(`ALTER TABLE \`orders\` DROP INDEX \`IDX_orders_package_id\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`package_id\``);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD UNIQUE INDEX \`order_number\` (\`order_number\`)`);
    }
}

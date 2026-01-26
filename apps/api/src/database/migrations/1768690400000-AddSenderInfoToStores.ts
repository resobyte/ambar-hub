import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSenderInfoToStores1768690400000 implements MigrationInterface {
    name = 'AddSenderInfoToStores1768690400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add sender info fields to stores table
        await queryRunner.query(`
            ALTER TABLE "stores"
            ADD COLUMN IF NOT EXISTS "sender_company_name" VARCHAR(255)
        `);

        await queryRunner.query(`
            ALTER TABLE "stores"
            ADD COLUMN IF NOT EXISTS "sender_address" TEXT
        `);

        await queryRunner.query(`
            ALTER TABLE "stores"
            ADD COLUMN IF NOT EXISTS "sender_tax_office" VARCHAR(100)
        `);

        await queryRunner.query(`
            ALTER TABLE "stores"
            ADD COLUMN IF NOT EXISTS "sender_tax_number" VARCHAR(50)
        `);

        await queryRunner.query(`
            ALTER TABLE "stores"
            ADD COLUMN IF NOT EXISTS "sender_phone" VARCHAR(50)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN IF EXISTS "sender_phone"`);
        await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN IF EXISTS "sender_tax_number"`);
        await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN IF EXISTS "sender_tax_office"`);
        await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN IF EXISTS "sender_address"`);
        await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN IF EXISTS "sender_company_name"`);
    }
}

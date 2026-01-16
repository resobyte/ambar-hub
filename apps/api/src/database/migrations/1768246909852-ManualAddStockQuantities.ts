import { MigrationInterface, QueryRunner } from "typeorm";

export class ManualAddStockQuantities1768246909852 implements MigrationInterface {
    name = 'ManualAddStockQuantities1768246909852'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`product_stores\` ADD \`sellable_quantity\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`product_stores\` ADD \`reservable_quantity\` int NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`product_stores\` DROP COLUMN \`reservable_quantity\``);
        await queryRunner.query(`ALTER TABLE \`product_stores\` DROP COLUMN \`sellable_quantity\``);
    }
}

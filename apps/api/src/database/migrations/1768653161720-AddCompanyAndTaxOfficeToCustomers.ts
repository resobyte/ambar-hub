import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyAndTaxOfficeToCustomers1768653161720 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" ADD "company" character varying`);
        await queryRunner.query(`ALTER TABLE "customers" ADD "tax_office" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "tax_office"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "company"`);
    }

}

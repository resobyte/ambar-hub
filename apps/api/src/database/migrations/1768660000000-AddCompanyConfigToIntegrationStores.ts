import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCompanyConfigToIntegrationStores1768660000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns("integration_stores", [
            new TableColumn({
                name: "brand_code",
                type: "varchar",
                length: "50",
                isNullable: true
            }),
            new TableColumn({
                name: "company_code",
                type: "varchar",
                length: "50",
                isNullable: true
            }),
            new TableColumn({
                name: "branch_code",
                type: "varchar",
                length: "50",
                isNullable: true
            }),
            new TableColumn({
                name: "co_code",
                type: "varchar",
                length: "50",
                isNullable: true
            })
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("integration_stores", "brand_code");
        await queryRunner.dropColumn("integration_stores", "company_code");
        await queryRunner.dropColumn("integration_stores", "branch_code");
        await queryRunner.dropColumn("integration_stores", "co_code");
    }

}

import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddTaxNumberToCustomers1768658000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("customers", new TableColumn({
            name: "tax_number",
            type: "varchar",
            isNullable: true
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("customers", "tax_number");
    }

}

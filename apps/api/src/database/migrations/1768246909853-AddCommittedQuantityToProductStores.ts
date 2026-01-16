import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCommittedQuantityToProductStores1768246909853 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("product_stores", new TableColumn({
            name: "committed_quantity",
            type: "int",
            default: 0
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("product_stores", "committed_quantity");
    }

}

import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddRouteCreatedByAndDates1768670000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('routes', new TableColumn({
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true
        }));

        await queryRunner.addColumn('routes', new TableColumn({
            name: 'unique_product_count',
            type: 'int',
            default: 0
        }));

        await queryRunner.addColumn('routes', new TableColumn({
            name: 'order_start_date',
            type: 'timestamp',
            isNullable: true
        }));

        await queryRunner.addColumn('routes', new TableColumn({
            name: 'order_end_date',
            type: 'timestamp',
            isNullable: true
        }));

        await queryRunner.createForeignKey('routes', new TableForeignKey({
            columnNames: ['created_by_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL'
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('routes');
        const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf('created_by_id') !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey('routes', foreignKey);
        }
        
        await queryRunner.dropColumn('routes', 'order_end_date');
        await queryRunner.dropColumn('routes', 'order_start_date');
        await queryRunner.dropColumn('routes', 'unique_product_count');
        await queryRunner.dropColumn('routes', 'created_by_id');
    }

}

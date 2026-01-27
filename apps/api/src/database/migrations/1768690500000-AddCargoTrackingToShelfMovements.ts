import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCargoTrackingToShelfMovements1768690500000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add cargo_tracking_number column to shelf_stock_movements table
        const table = await queryRunner.getTable('shelf_stock_movements');
        if (table) {
            const hasColumn = table.columns.find(c => c.name === 'cargo_tracking_number');
            if (!hasColumn) {
                await queryRunner.addColumn(
                    'shelf_stock_movements',
                    new TableColumn({
                        name: 'cargo_tracking_number',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    })
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('shelf_stock_movements');
        if (table) {
            const hasColumn = table.columns.find(c => c.name === 'cargo_tracking_number');
            if (hasColumn) {
                await queryRunner.dropColumn('shelf_stock_movements', 'cargo_tracking_number');
            }
        }
    }
}

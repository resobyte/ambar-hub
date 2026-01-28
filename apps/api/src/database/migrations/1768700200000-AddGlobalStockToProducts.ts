import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGlobalStockToProducts1768700200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('products');
        if (table) {
            // Check if columns already exist
            const hasStockQuantity = table.findColumnByName('stock_quantity');
            const hasSellableQuantity = table.findColumnByName('sellable_quantity');
            const hasReservedQuantity = table.findColumnByName('reserved_quantity');

            if (!hasStockQuantity) {
                await queryRunner.addColumn(
                    'products',
                    new TableColumn({
                        name: 'stock_quantity',
                        type: 'int',
                        default: 0,
                    })
                );
            }

            if (!hasSellableQuantity) {
                await queryRunner.addColumn(
                    'products',
                    new TableColumn({
                        name: 'sellable_quantity',
                        type: 'int',
                        default: 0,
                    })
                );
            }

            if (!hasReservedQuantity) {
                await queryRunner.addColumn(
                    'products',
                    new TableColumn({
                        name: 'reserved_quantity',
                        type: 'int',
                        default: 0,
                    })
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('products');
        if (table) {
            await queryRunner.dropColumn('products', 'stock_quantity');
            await queryRunner.dropColumn('products', 'sellable_quantity');
            await queryRunner.dropColumn('products', 'reserved_quantity');
        }
    }
}

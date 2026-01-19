import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class SuppliersService {
    constructor(
        @InjectRepository(Supplier)
        private readonly supplierRepository: Repository<Supplier>,
    ) { }

    async create(data: Partial<Supplier>): Promise<Supplier> {
        const supplier = this.supplierRepository.create(data);
        return this.supplierRepository.save(supplier);
    }

    async findAll(page = 1, limit = 10, filters?: { name?: string; taxNumber?: string; isActive?: boolean }): Promise<{ data: Supplier[]; total: number }> {
        const where: any = {};
        if (filters?.name) where.name = ILike(`%${filters.name}%`);
        if (filters?.taxNumber) where.taxNumber = ILike(`%${filters.taxNumber}%`);
        if (filters?.isActive !== undefined) where.isActive = filters.isActive;

        const [data, total] = await this.supplierRepository.findAndCount({
            where,
            order: { name: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total };
    }

    async findOne(id: string): Promise<Supplier> {
        const supplier = await this.supplierRepository.findOne({ where: { id } });
        if (!supplier) {
            throw new NotFoundException(`Supplier #${id} not found`);
        }
        return supplier;
    }

    async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
        const supplier = await this.findOne(id);
        Object.assign(supplier, data);
        return this.supplierRepository.save(supplier);
    }

    async remove(id: string): Promise<void> {
        const supplier = await this.findOne(id);
        await this.supplierRepository.remove(supplier);
    }
}

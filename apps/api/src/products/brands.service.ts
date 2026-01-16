import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
    constructor(
        @InjectRepository(Brand)
        private readonly brandRepository: Repository<Brand>,
    ) { }

    async findAll() {
        return this.brandRepository.find({ order: { name: 'ASC' } });
    }

    async findOne(id: string) {
        const brand = await this.brandRepository.findOne({ where: { id } });
        if (!brand) throw new NotFoundException('Brand not found');
        return brand;
    }

    async create(dto: CreateBrandDto) {
        const brand = this.brandRepository.create(dto);
        return this.brandRepository.save(brand);
    }

    async update(id: string, dto: UpdateBrandDto) {
        const brand = await this.findOne(id);
        Object.assign(brand, dto);
        return this.brandRepository.save(brand);
    }

    async remove(id: string) {
        const brand = await this.findOne(id);
        return this.brandRepository.remove(brand);
    }
}

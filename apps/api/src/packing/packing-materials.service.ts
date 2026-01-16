import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackingMaterial } from './entities/packing-material.entity';
import { CreatePackingMaterialDto, UpdatePackingMaterialDto } from './dto/packing-material.dto';

@Injectable()
export class PackingMaterialsService {
    constructor(
        @InjectRepository(PackingMaterial)
        private readonly materialRepository: Repository<PackingMaterial>,
    ) { }

    async findAll() {
        return this.materialRepository.find({ order: { name: 'ASC' } });
    }

    async findOne(id: string) {
        const material = await this.materialRepository.findOne({ where: { id } });
        if (!material) throw new NotFoundException('Packing material not found');
        return material;
    }

    async create(dto: CreatePackingMaterialDto) {
        const material = this.materialRepository.create(dto);
        return this.materialRepository.save(material);
    }

    async update(id: string, dto: UpdatePackingMaterialDto) {
        const material = await this.findOne(id);
        Object.assign(material, dto);
        return this.materialRepository.save(material);
    }

    async remove(id: string) {
        const material = await this.findOne(id);
        return this.materialRepository.remove(material);
    }
}

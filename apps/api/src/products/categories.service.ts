import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: TreeRepository<Category>,
    ) { }

    async findAll() {
        return this.categoryRepository.findTrees();
    }

    async findChildren(parentId: string | null): Promise<Category[]> {
        if (parentId) {
            const parent = await this.findOne(parentId);
            return this.categoryRepository.createDescendantsQueryBuilder('category', 'categoryClosure', parent)
                .where('category.parentId = :parentId', { parentId })
                .getMany();
        }
        return this.categoryRepository.find({ where: { parent: null } as any });
    }

    async findOne(id: string) {
        const category = await this.categoryRepository.findOne({ where: { id }, relations: ['parent', 'children'] });
        if (!category) throw new NotFoundException('Category not found');
        return category;
    }

    async create(dto: CreateCategoryDto) {
        const category = this.categoryRepository.create(dto);
        if (dto.parentId) {
            const parent = await this.findOne(dto.parentId);
            category.parent = parent;
        }
        return this.categoryRepository.save(category);
    }

    async update(id: string, dto: UpdateCategoryDto) {
        const category = await this.findOne(id);
        if (dto.name) category.name = dto.name;
        if (dto.isActive !== undefined) category.isActive = dto.isActive;

        if (dto.parentId) {
            // Avoid self-referencing
            if (dto.parentId === id) throw new Error('Cannot set category as its own parent');
            const parent = await this.findOne(dto.parentId);
            category.parent = parent;
        } else if (dto.parentId === null) {
            category.parent = null as any;
        }

        return this.categoryRepository.save(category);
    }

    async remove(id: string) {
        const category = await this.findOne(id);
        return this.categoryRepository.remove(category);
    }
}

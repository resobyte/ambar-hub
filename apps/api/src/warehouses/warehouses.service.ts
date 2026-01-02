import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/api-response.interface';
import { WarehouseResponseDto } from './dto/warehouse-response.dto';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
  ) {}

  async create(createWarehouseDto: CreateWarehouseDto): Promise<WarehouseResponseDto> {
    const warehouse = this.warehouseRepository.create(createWarehouseDto);
    const savedWarehouse = await this.warehouseRepository.save(warehouse);
    return WarehouseResponseDto.fromEntity(savedWarehouse, 0);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<WarehouseResponseDto>> {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.warehouseRepository
      .createQueryBuilder('warehouse')
      .leftJoin('warehouse.stores', 'stores')
      .addSelect('COUNT(stores.id)', 'storeCount')
      .groupBy('warehouse.id');

    if (sortBy) {
      queryBuilder.orderBy(`warehouse.${sortBy}`, sortOrder);
    } else {
      queryBuilder.orderBy('warehouse.createdAt', 'DESC');
    }

    const result = await queryBuilder
      .skip(skip)
      .take(limit)
      .getRawAndEntities();

    const response = result.entities.map((warehouse, index) => {
      const storeCount = parseInt(result.raw[index]?.storeCount || '0', 10);
      return WarehouseResponseDto.fromEntity(warehouse, storeCount);
    });

    const total = await queryBuilder.getCount();

    return {
      success: true,
      data: response,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['stores'],
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return WarehouseResponseDto.fromEntity(warehouse, warehouse.stores?.length || 0);
  }

  async update(
    id: string,
    updateWarehouseDto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['stores'],
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    Object.assign(warehouse, updateWarehouseDto);
    const updatedWarehouse = await this.warehouseRepository.save(warehouse);
    return WarehouseResponseDto.fromEntity(updatedWarehouse, warehouse.stores?.length || 0);
  }

  async remove(id: string): Promise<void> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ['stores'],
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (warehouse.stores && warehouse.stores.length > 0) {
      throw new BadRequestException(
        'Cannot delete warehouse with existing stores. Please delete all stores first.',
      );
    }

    await this.warehouseRepository.softDelete(id);
  }
}

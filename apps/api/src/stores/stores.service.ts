import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/api-response.interface';
import { StoreResponseDto } from './dto/store-response.dto';
import { WarehousesService } from '../warehouses/warehouses.service';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    private readonly warehousesService: WarehousesService,
  ) {}

  async create(createStoreDto: CreateStoreDto): Promise<StoreResponseDto> {
    await this.ensureWarehouseExists(createStoreDto.warehouseId);

    const store = this.storeRepository.create(createStoreDto);
    const savedStore = await this.storeRepository.save(store);
    return StoreResponseDto.fromEntity(savedStore);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<StoreResponseDto>> {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.storeRepository.createQueryBuilder('store');

    if (sortBy) {
      queryBuilder.orderBy(`store.${sortBy}`, sortOrder);
    } else {
      queryBuilder.orderBy('store.createdAt', 'DESC');
    }

    const [stores, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      success: true,
      data: stores.map(StoreResponseDto.fromEntity),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<StoreResponseDto> {
    const store = await this.storeRepository.findOne({
      where: { id },
      relations: ['warehouse'],
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return StoreResponseDto.fromEntity(store);
  }

  async update(
    id: string,
    updateStoreDto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    const store = await this.storeRepository.findOne({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (updateStoreDto.warehouseId) {
      await this.ensureWarehouseExists(updateStoreDto.warehouseId);
    }

    Object.assign(store, updateStoreDto);
    const updatedStore = await this.storeRepository.save(store);
    return StoreResponseDto.fromEntity(updatedStore);
  }

  async remove(id: string): Promise<void> {
    const store = await this.storeRepository.findOne({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    await this.storeRepository.softDelete(id);
  }

  private async ensureWarehouseExists(warehouseId: string): Promise<void> {
    try {
      await this.warehousesService.findOne(warehouseId);
    } catch (error) {
      throw new BadRequestException('Warehouse not found');
    }
  }
}

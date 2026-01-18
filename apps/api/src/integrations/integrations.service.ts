import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from './entities/integration.entity';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/api-response.interface';
import { IntegrationResponseDto } from './dto/integration-response.dto';
import { IntegrationStore } from '../integration-stores/entities/integration-store.entity';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    @InjectRepository(IntegrationStore)
    private readonly integrationStoreRepository: Repository<IntegrationStore>,
  ) { }

  async create(createIntegrationDto: CreateIntegrationDto): Promise<IntegrationResponseDto> {
    const integration = this.integrationRepository.create(createIntegrationDto);
    const savedIntegration = await this.integrationRepository.save(integration);
    return IntegrationResponseDto.fromEntity(savedIntegration, 0);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<IntegrationResponseDto>> {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const [integrations, total] = await this.integrationRepository.findAndCount({
      order: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'DESC' as const },
      skip,
      take: limit,
    });

    // Get store counts for each integration using findAndCount
    const integrationIds = integrations.map((i) => i.id);
    const countMap = new Map<string, number>();

    for (const integrationId of integrationIds) {
      const count = await this.integrationStoreRepository.count({
        where: { integrationId },
      });
      countMap.set(integrationId, count);
    }

    const response = integrations.map((integration) => {
      return IntegrationResponseDto.fromEntity(
        integration,
        countMap.get(integration.id) || 0,
      );
    });

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

  async findOne(id: string): Promise<IntegrationResponseDto> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const storeCount = await this.integrationStoreRepository.count({
      where: { integrationId: id },
    });

    return IntegrationResponseDto.fromEntity(integration, storeCount);
  }

  async update(
    id: string,
    updateIntegrationDto: UpdateIntegrationDto,
  ): Promise<IntegrationResponseDto> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    Object.assign(integration, updateIntegrationDto);
    const updatedIntegration = await this.integrationRepository.save(integration);

    const storeCount = await this.integrationStoreRepository.count({
      where: { integrationId: id },
    });

    return IntegrationResponseDto.fromEntity(updatedIntegration, storeCount);
  }

  async findActiveByType(type: import('./entities/integration.entity').IntegrationType): Promise<Integration[]> {
    return this.integrationRepository.find({
      where: { type, isActive: true },
      relations: ['integrationStores', 'integrationStores.store'],
    });
  }

  async findWithStores(id: string): Promise<Integration | null> {
    return this.integrationRepository.findOne({
      where: { id },
      relations: ['integrationStores', 'integrationStores.store'],
    });
  }

  async remove(id: string): Promise<void> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    await this.integrationRepository.softDelete(id);
  }
}

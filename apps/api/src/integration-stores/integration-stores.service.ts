import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationStore } from './entities/integration-store.entity';
import { CreateIntegrationStoreDto } from './dto/create-integration-store.dto';
import { UpdateIntegrationStoreDto } from './dto/update-integration-store.dto';
import { IntegrationStoreResponseDto } from './dto/integration-store-response.dto';
import { Integration } from '../integrations/entities/integration.entity';
import { ShippingProvider } from '../shipping-providers/entities/shipping-provider.entity';

@Injectable()
export class IntegrationStoresService {
  constructor(
    @InjectRepository(IntegrationStore)
    private readonly integrationStoreRepository: Repository<IntegrationStore>,
    @InjectRepository(ShippingProvider)
    private readonly shippingProviderRepository: Repository<ShippingProvider>,
  ) {}

  async create(
    createIntegrationStoreDto: CreateIntegrationStoreDto,
  ): Promise<IntegrationStoreResponseDto> {
    // Check if Integration-Store pair already exists
    const existing = await this.integrationStoreRepository.findOne({
      where: {
        integrationId: createIntegrationStoreDto.integrationId,
        storeId: createIntegrationStoreDto.storeId,
      },
    });

    if (existing) {
      throw new ConflictException('Integration-Store pair already exists');
    }

    // Business Rule: A Store can have only ONE Integration per type
    // Get the integration to check its type
    const integration = await this.integrationStoreRepository.manager
      .getRepository(Integration)
      .findOne({
        where: { id: createIntegrationStoreDto.integrationId },
      });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    // Check if store already has an integration of the same type
    const existingSameType = await this.integrationStoreRepository
      .createQueryBuilder('is')
      .leftJoin('is.integration', 'integration')
      .where('is.storeId = :storeId', { storeId: createIntegrationStoreDto.storeId })
      .andWhere('integration.type = :type', { type: integration.type })
      .getOne();

    if (existingSameType) {
      throw new ConflictException(
        `This store already has a ${integration.type} integration`,
      );
    }

    // Validate shipping provider if provided
    if (createIntegrationStoreDto.shippingProviderId) {
      const shippingProvider = await this.shippingProviderRepository.findOne({
        where: {
          id: createIntegrationStoreDto.shippingProviderId,
          isActive: true,
        },
      });
      if (!shippingProvider) {
        throw new BadRequestException(
          'Shipping provider not found or inactive',
        );
      }
    } else {
      // Shipping provider is required
      throw new BadRequestException(
        'Shipping provider is required',
      );
    }

    const integrationStore = this.integrationStoreRepository.create(
      createIntegrationStoreDto,
    );
    const saved = await this.integrationStoreRepository.save(integrationStore);
    return IntegrationStoreResponseDto.fromEntity(saved);
  }

  async findAll(integrationId?: string): Promise<IntegrationStoreResponseDto[]> {
    const queryBuilder = this.integrationStoreRepository
      .createQueryBuilder('is')
      .leftJoinAndSelect('is.store', 'store')
      .leftJoinAndSelect('is.integration', 'integration');

    if (integrationId) {
      queryBuilder.where('is.integrationId = :integrationId', { integrationId });
    }

    const results = await queryBuilder.getMany();

    return results.map((result) =>
      IntegrationStoreResponseDto.fromEntity(result, result.store?.name),
    );
  }

  async findOne(id: string): Promise<IntegrationStoreResponseDto> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id },
      relations: ['store', 'integration'],
    });

    if (!integrationStore) {
      throw new NotFoundException('IntegrationStore not found');
    }

    return IntegrationStoreResponseDto.fromEntity(
      integrationStore,
      integrationStore.store?.name,
    );
  }

  async update(
    id: string,
    updateIntegrationStoreDto: UpdateIntegrationStoreDto,
  ): Promise<IntegrationStoreResponseDto> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id },
    });

    if (!integrationStore) {
      throw new NotFoundException('IntegrationStore not found');
    }

    // Validate shipping provider if provided
    if (updateIntegrationStoreDto.shippingProviderId) {
      const shippingProvider = await this.shippingProviderRepository.findOne({
        where: {
          id: updateIntegrationStoreDto.shippingProviderId,
          isActive: true,
        },
      });
      if (!shippingProvider) {
        throw new BadRequestException(
          'Shipping provider not found or inactive',
        );
      }
    }

    Object.assign(integrationStore, updateIntegrationStoreDto);
    const updated = await this.integrationStoreRepository.save(integrationStore);
    return IntegrationStoreResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id },
    });

    if (!integrationStore) {
      throw new NotFoundException('IntegrationStore not found');
    }

    await this.integrationStoreRepository.softDelete(id);
  }

  async findByIntegrationAndStore(
    integrationId: string,
    storeId: string,
  ): Promise<IntegrationStoreResponseDto | null> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { integrationId, storeId },
      relations: ['store'],
    });

    if (!integrationStore) {
      return null;
    }

    return IntegrationStoreResponseDto.fromEntity(
      integrationStore,
      integrationStore.store?.name,
    );
  }
}

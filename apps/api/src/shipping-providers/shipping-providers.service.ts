import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingProvider } from './entities/shipping-provider.entity';
import { CreateShippingProviderDto } from './dto/create-shipping-provider.dto';
import { UpdateShippingProviderDto } from './dto/update-shipping-provider.dto';
import { ShippingProviderResponseDto } from './dto/shipping-provider-response.dto';
import { IntegrationStore } from '../integration-stores/entities/integration-store.entity';

@Injectable()
export class ShippingProvidersService {
  constructor(
    @InjectRepository(ShippingProvider)
    private readonly shippingProviderRepository: Repository<ShippingProvider>,
    @InjectRepository(IntegrationStore)
    private readonly integrationStoreRepository: Repository<IntegrationStore>,
  ) {}

  async findAll(): Promise<ShippingProviderResponseDto[]> {
    const providers = await this.shippingProviderRepository.find({
      order: { createdAt: 'ASC' },
    });

    // Get integration counts for each provider
    const result = await Promise.all(
      providers.map(async (provider) => {
        const count = await this.integrationStoreRepository.count({
          where: { shippingProviderId: provider.id },
        });
        return ShippingProviderResponseDto.fromEntity(provider, count);
      })
    );

    return result;
  }

  async findOne(id: string): Promise<ShippingProviderResponseDto> {
    const provider = await this.shippingProviderRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Shipping provider not found');
    }

    const count = await this.integrationStoreRepository.count({
      where: { shippingProviderId: provider.id },
    });

    return ShippingProviderResponseDto.fromEntity(provider, count);
  }

  async findActive(): Promise<ShippingProvider[]> {
    return this.shippingProviderRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(createShippingProviderDto: CreateShippingProviderDto): Promise<ShippingProviderResponseDto> {
    // Check if provider with same name and type already exists
    const existing = await this.shippingProviderRepository.findOne({
      where: {
        name: createShippingProviderDto.name,
        type: createShippingProviderDto.type,
      },
    });

    if (existing) {
      throw new ConflictException('Shipping provider with this name and type already exists');
    }

    const provider = this.shippingProviderRepository.create({
      ...createShippingProviderDto,
      isActive: createShippingProviderDto.isActive ?? true,
    });

    const saved = await this.shippingProviderRepository.save(provider);
    return ShippingProviderResponseDto.fromEntity(saved, 0);
  }

  async update(id: string, updateShippingProviderDto: UpdateShippingProviderDto): Promise<ShippingProviderResponseDto> {
    const provider = await this.shippingProviderRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Shipping provider not found');
    }

    // Check if name is being updated and conflicts with existing
    if (updateShippingProviderDto.name && updateShippingProviderDto.name !== provider.name) {
      const existing = await this.shippingProviderRepository.findOne({
        where: {
          name: updateShippingProviderDto.name,
          type: provider.type,
        },
      });

      if (existing) {
        throw new ConflictException('Shipping provider with this name and type already exists');
      }
    }

    Object.assign(provider, updateShippingProviderDto);
    const updated = await this.shippingProviderRepository.save(provider);

    const count = await this.integrationStoreRepository.count({
      where: { shippingProviderId: provider.id },
    });

    return ShippingProviderResponseDto.fromEntity(updated, count);
  }

  async remove(id: string): Promise<void> {
    const provider = await this.shippingProviderRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Shipping provider not found');
    }

    // Check if provider is used by any integration
    const count = await this.integrationStoreRepository.count({
      where: { shippingProviderId: provider.id },
    });

    if (count > 0) {
      throw new BadRequestException('Cannot delete shipping provider that is in use by integrations');
    }

    await this.shippingProviderRepository.softDelete(id);
  }
}

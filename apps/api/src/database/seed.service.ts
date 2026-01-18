import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { ShippingProvider, ShippingType } from '../shipping-providers/entities/shipping-provider.entity';
import { Role } from '@repo/types';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ShippingProvider)
    private readonly shippingProviderRepository: Repository<ShippingProvider>,
    private readonly configService: ConfigService,
  ) { }

  async seed(): Promise<void> {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    // Production check removed to allow manual seeding
    // if (nodeEnv === 'production') {
    //   this.logger.error('Seeding is disabled in production environment');
    //   throw new Error('Seeding is disabled in production');
    // }

    const userCount = await this.userRepository.count();

    if (userCount > 0) {
      this.logger.warn(`Database already has ${userCount} user(s). Skipping seed.`);
      return;
    }

    const email = this.configService.get<string>('SEED_EMAIL');
    const password = this.configService.get<string>('SEED_PASSWORD');
    const firstName = this.configService.get<string>('SEED_FIRST_NAME');
    const lastName = this.configService.get<string>('SEED_LAST_NAME');

    if (!email || !password || !firstName || !lastName) {
      this.logger.error('Missing required SEED_* environment variables');
      this.logger.error('Required: SEED_EMAIL, SEED_PASSWORD, SEED_FIRST_NAME, SEED_LAST_NAME');
      throw new Error('Missing required seed environment variables');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: Role.PLATFORM_OWNER,
      isActive: true,
    });

    await this.userRepository.save(user);

    this.logger.log(`Seed completed: Created PLATFORM_OWNER user with email: ${email}`);

    // Create ARAS shipping provider
    const existingShippingProvider = await this.shippingProviderRepository.findOne({
      where: { type: ShippingType.ARAS },
    });

    if (!existingShippingProvider) {
      const shippingProvider = this.shippingProviderRepository.create({
        name: 'Aras Kargo',
        type: ShippingType.ARAS,
        isActive: true,
      });

      await this.shippingProviderRepository.save(shippingProvider);

      this.logger.log('Seed completed: Created ARAS shipping provider');
    } else {
      this.logger.warn('ARAS shipping provider already exists. Skipping seed.');
    }
  }
}

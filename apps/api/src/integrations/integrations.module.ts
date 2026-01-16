import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { Integration } from './entities/integration.entity';
import { IntegrationStore } from '../integration-stores/entities/integration-store.entity';

import { ArasKargoService } from './aras/aras-kargo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Integration, IntegrationStore])],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, ArasKargoService],
  exports: [IntegrationsService, ArasKargoService],
})
export class IntegrationsModule { }

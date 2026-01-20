import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Get()
    async findAll(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('search') search?: string,
        @Query('type') type?: string,
    ) {
        return this.customersService.findAll({
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            search,
            type,
        });
    }

    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        const customer = await this.customersService.findOne(id);
        if (!customer) {
            throw new NotFoundException('Müşteri bulunamadı');
        }
        return customer;
    }

    @Post()
    async create(@Body() dto: CreateCustomerDto) {
        return this.customersService.create(dto);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCustomerDto,
    ) {
        return this.customersService.update(id, dto);
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.customersService.remove(id);
    }
}

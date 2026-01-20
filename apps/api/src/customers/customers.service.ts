import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
    constructor(
        @InjectRepository(Customer)
        private readonly customerRepository: Repository<Customer>,
    ) { }

    async findAll(options: { page: number; limit: number; search?: string; type?: string }) {
        const { page, limit, search, type } = options;
        const skip = (page - 1) * limit;

        // Build query
        const queryBuilder = this.customerRepository.createQueryBuilder('customer');

        if (search) {
            const searchTerm = `%${search}%`;
            queryBuilder.andWhere(
                `(customer.email LIKE :search 
                OR customer.firstName LIKE :search 
                OR customer.lastName LIKE :search 
                OR customer.company LIKE :search 
                OR customer.phone LIKE :search
                OR CONCAT(customer.firstName, ' ', customer.lastName) LIKE :search)`,
                { search: searchTerm }
            );
        }

        if (type) {
            queryBuilder.andWhere('customer.type = :type', { type });
        }

        queryBuilder
            .orderBy('customer.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            customers: data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ where: { id } });
    }

    async findByEmail(email: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ where: { email } });
    }

    async create(dto: CreateCustomerDto): Promise<Customer> {
        const customer = this.customerRepository.create(dto);
        return this.customerRepository.save(customer);
    }

    async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
        const customer = await this.findOne(id);
        if (!customer) {
            throw new NotFoundException('Müşteri bulunamadı');
        }
        Object.assign(customer, dto);
        return this.customerRepository.save(customer);
    }

    async remove(id: string): Promise<void> {
        const customer = await this.findOne(id);
        if (!customer) {
            throw new NotFoundException('Müşteri bulunamadı');
        }
        await this.customerRepository.remove(customer);
    }

    async createOrUpdate(data: Partial<Customer>): Promise<Customer> {
        if (!data.email) {
            throw new Error('Email is required for customer creation or update');
        }
        const existing = await this.findByEmail(data.email);
        if (existing) {
            return this.customerRepository.save({ ...existing, ...data });
        }
        const customer = this.customerRepository.create(data);
        return this.customerRepository.save(customer);
    }
}

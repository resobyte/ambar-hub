import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
    constructor(
        @InjectRepository(Customer)
        private readonly customerRepository: Repository<Customer>,
    ) { }

    async findByEmail(email: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ where: { email } });
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

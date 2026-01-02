import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/api-response.interface';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  private static readonly BCRYPT_COST_FACTOR = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async ensureEmailUnique(email: string, excludeUserId?: string): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
      withDeleted: false,
    });

    if (existingUser && existingUser.id !== excludeUserId) {
      throw new ConflictException('User with this email already exists');
    }
  }

  private async getUserOrThrow(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: false,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    await this.ensureEmailUnique(createUserDto.email);

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      UsersService.BCRYPT_COST_FACTOR,
    );

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    return UserResponseDto.fromEntity(savedUser);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<UserResponseDto>> {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (sortBy) {
      queryBuilder.orderBy(`user.${sortBy}`, sortOrder);
    } else {
      queryBuilder.orderBy('user.createdAt', 'DESC');
    }

    const [users, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      success: true,
      data: users.map(UserResponseDto.fromEntity),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.getUserOrThrow(id);
    return UserResponseDto.fromEntity(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'firstName',
        'lastName',
        'role',
        'isActive',
      ],
      withDeleted: false,
    });
  }

  async findByIdWithRefreshToken(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'refreshToken', 'role', 'isActive'],
      withDeleted: false,
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.getUserOrThrow(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      await this.ensureEmailUnique(updateUserDto.email, id);
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        UsersService.BCRYPT_COST_FACTOR,
      );
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);
    return UserResponseDto.fromEntity(updatedUser);
  }

  async remove(id: string): Promise<void> {
    await this.getUserOrThrow(id);
    await this.userRepository.softDelete(id);
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedToken = refreshToken
      ? await bcrypt.hash(refreshToken, UsersService.BCRYPT_COST_FACTOR)
      : null;

    await this.userRepository.update(userId, { refreshToken: hashedToken });
  }
}

import {
  Injectable,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtPayload, TokenPair } from '@repo/types';
import {
  AUTH_CONSTANTS,
  getAccessTokenCookieConfig,
  getRefreshTokenCookieConfig,
  CookieConfig,
} from '@repo/auth-config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { TokenBlacklist } from './entities/token-blacklist.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(TokenBlacklist)
    private readonly tokenBlacklistRepository: Repository<TokenBlacklist>,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: AuthResponseDto['user']; tokens: TokenPair }> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      this.logger.warn(
        `Login attempt failed: User not found - ${loginDto.email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn(
        `Login attempt failed: User inactive - ${loginDto.email}`,
      );
      throw new ForbiddenException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(
        `Login attempt failed: Invalid password - ${loginDto.email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
    };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<{ tokens: TokenPair }> {
    const user = await this.usersService.findByIdWithRefreshToken(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Access denied');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`Tokens refreshed for user: ${user.email}`);

    return { tokens };
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);

    const decoded = this.jwtService.decode(accessToken) as {
      exp: number;
    } | null;
    if (decoded?.exp) {
      const expiresAt = new Date(decoded.exp * 1000);
      await this.tokenBlacklistRepository.save({
        token: accessToken,
        expiresAt,
      });
    }

    this.logger.log(`User logged out: ${userId}`);
  }

  async getProfile(userId: string): Promise<AuthResponseDto['user']> {
    const user = await this.usersService.findOne(userId);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.tokenBlacklistRepository.findOne({
      where: { token },
    });
    return !!blacklistedToken;
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.tokenBlacklistRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  private async generateTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn:
          this.configService.get<string>('JWT_ACCESS_EXPIRATION') ||
          AUTH_CONSTANTS.TOKEN_TTL.ACCESS_TOKEN_EXPIRATION,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn:
          this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
          AUTH_CONSTANTS.TOKEN_TTL.REFRESH_TOKEN_EXPIRATION,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  getAccessTokenCookieOptions(): CookieConfig {
    const cookieEnv = {
      nodeEnv: this.configService.get<string>('NODE_ENV') || 'development',
      cookieDomain: this.configService.get<string>('COOKIE_DOMAIN'),
    };
    return getAccessTokenCookieConfig(cookieEnv);
  }

  getRefreshTokenCookieOptions(): CookieConfig {
    const cookieEnv = {
      nodeEnv: this.configService.get<string>('NODE_ENV') || 'development',
      cookieDomain: this.configService.get<string>('COOKIE_DOMAIN'),
    };
    return getRefreshTokenCookieConfig(cookieEnv);
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const origin = request.headers.origin;
    const allowedOrigins = this.getAllowedOrigins();

    if (!origin) {
      return true;
    }

    if (!allowedOrigins.some((allowed) => origin === allowed)) {
      throw new ForbiddenException('Invalid origin');
    }

    return true;
  }

  private getAllowedOrigins(): string[] {
    const corsOrigins = this.configService.get<string>('CORS_ORIGINS');
    if (corsOrigins) {
      return corsOrigins.split(',').map((o) => o.trim());
    }

    const singleOrigin = this.configService.get<string>('CORS_ORIGIN');
    if (singleOrigin) {
      return [singleOrigin];
    }

    return ['http://localhost:3000'];
  }
}

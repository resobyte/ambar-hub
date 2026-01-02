import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  Req,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtPayload } from '@repo/types';
import { AUTH_CONSTANTS } from '@repo/auth-config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(
    response: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    response.cookie(
      AUTH_CONSTANTS.COOKIE_NAMES.ACCESS_TOKEN,
      tokens.accessToken,
      this.authService.getAccessTokenCookieOptions(),
    );
    response.cookie(
      AUTH_CONSTANTS.COOKIE_NAMES.REFRESH_TOKEN,
      tokens.refreshToken,
      this.authService.getRefreshTokenCookieOptions(),
    );
  }

  @Post('login')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, tokens } = await this.authService.login(loginDto);

    this.setAuthCookies(response, tokens);

    return { user };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: JwtPayload & { refreshToken: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const { tokens } = await this.authService.refreshTokens(
      user.sub,
      user.refreshToken,
    );

    this.setAuthCookies(response, tokens);

    return { message: 'Tokens refreshed' };
  }

  @Post('logout')
  @UseGuards(CsrfGuard, JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('sub') userId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const accessToken = request.cookies?.[AUTH_CONSTANTS.COOKIE_NAMES.ACCESS_TOKEN];
    await this.authService.logout(userId, accessToken);

    response.clearCookie(AUTH_CONSTANTS.COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
    response.clearCookie(AUTH_CONSTANTS.COOKIE_NAMES.REFRESH_TOKEN, {
      path: AUTH_CONSTANTS.PATHS.REFRESH_ENDPOINT,
    });

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }
}

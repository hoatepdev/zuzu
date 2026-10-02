import { Body, Controller, Get, Post, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { PrismaService } from '../prisma.service';
import { verifyPassword } from '../password';
import { AuthGuard } from './auth.guard';
import { LoginDto } from './auth.dto';
import { CurrentUser, SessionUser } from '../common/auth.types';

@Controller('auth')
export class AuthController {
  private readonly cookie = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };

  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.prisma.user.findFirst({ where: { active: true, OR: [{ username: dto.usernameOrPhone }, { phone: dto.usernameOrPhone }] } });
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');
    const session: SessionUser = { id: user.id, username: user.username, name: user.name, role: user.role };
    const maxAge = dto.remember ? 30 * 24 * 60 * 60 * 1000 : undefined;
    response.cookie('zuzu_session', await this.jwt.signAsync(session, { expiresIn: dto.remember ? '30d' : '12h' }), { ...this.cookie, maxAge });
    return session;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('zuzu_session', this.cookie);
    return { ok: true };
  }

  @Get('me') @UseGuards(AuthGuard)
  me(@CurrentUser() user: SessionUser) { return user; }
}

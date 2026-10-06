import { BadRequestException, Body, Controller, Get, Patch, Post, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../prisma.service';
import { hashPassword, verifyPassword } from '../password';
import { AuthGuard } from './auth.guard';
import { ChangePasswordDto, LoginDto, UpdateProfileDto } from './auth.dto';
import { CurrentUser, SessionUser } from '../common/auth.types';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // COOKIE_SAMESITE=none only for staging on unrelated provider domains (breaks Safari/iPhone);
  // production uses same-parent-domain subdomains where the default lax works everywhere.
  private readonly cookie = {
    httpOnly: true,
    sameSite: (process.env.COOKIE_SAMESITE === 'none' ? 'none' : 'lax') as 'none' | 'lax',
    secure: process.env.NODE_ENV === 'production',
  };

  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.prisma.user.findFirst({ where: { active: true, OR: [{ username: dto.usernameOrPhone }, { phone: dto.usernameOrPhone }] } });
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');
    const session: SessionUser = { id: user.id, username: user.username, name: user.name, role: user.role };
    const maxAge = dto.remember ? 30 * 24 * 60 * 60 * 1000 : undefined;
    response.cookie('zuzu_session', await this.jwt.signAsync(session, { expiresIn: dto.remember ? '30d' : '12h' }), { ...this.cookie, maxAge });
    return { ...session, phone: user.phone ?? undefined };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('zuzu_session', this.cookie);
    return { ok: true };
  }

  @Get('me') @UseGuards(AuthGuard)
  me(@CurrentUser() user: SessionUser) { return user; }

  @Patch('me') @UseGuards(AuthGuard)
  async updateMe(@CurrentUser() actor: SessionUser, @Body() dto: UpdateProfileDto) {
    const current = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true, phone: true } });
    if (!current) throw new UnauthorizedException('Vui lòng đăng nhập');
    try {
      return await this.prisma.$transaction(async tx => {
        const user = await tx.user.update({ where: { id: actor.id }, data: { name: dto.name, phone: dto.phone ?? null }, select: { id: true, username: true, name: true, phone: true, role: true } });
        await tx.auditLog.create({ data: { userId: actor.id, action: 'USER_PROFILE_UPDATED', entityType: 'USER', entityId: actor.id, before: { name: current.name, phone: current.phone }, after: { name: user.name, phone: user.phone } } });
        return user;
      });
    }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('SĐT đã tồn tại'); throw error; }
  }

  @Post('change-password') @UseGuards(AuthGuard)
  async changePassword(@CurrentUser() actor: SessionUser, @Body() dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { passwordHash: true } });
    if (!user || !(await verifyPassword(dto.currentPassword, user.passwordHash))) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    await this.prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: actor.id }, data: { passwordHash: await hashPassword(dto.newPassword) } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'USER_PASSWORD_CHANGED', entityType: 'USER', entityId: actor.id } });
    });
    return { ok: true };
  }
}

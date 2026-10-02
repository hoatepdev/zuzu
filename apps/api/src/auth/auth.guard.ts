import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRequest, SessionUser } from '../common/auth.types';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.zuzu_session as string | undefined;
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập');
    let session: SessionUser;
    try { session = await this.jwt.verifyAsync<SessionUser>(token); }
    catch { throw new UnauthorizedException('Phiên đăng nhập đã hết hạn'); }
    const user = await this.prisma.user.findUnique({ where: { id: session.id }, select: { id: true, username: true, name: true, role: true, active: true } });
    if (!user?.active) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hoá');
    request.user = { id: user.id, username: user.username, name: user.name, role: user.role };
    return true;
  }
}

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

@Injectable()
export class PrintAgentGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = process.env.PRINT_AGENT_TOKEN;
    const authorization = context.switchToHttp().getRequest<Request>().headers.authorization;
    const provided = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!expected || !provided) throw new UnauthorizedException('Print Agent không được xác thực');
    const expectedBytes = Buffer.from(expected);
    const providedBytes = Buffer.from(provided);
    if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
      throw new UnauthorizedException('Print Agent không được xác thực');
    }
    return true;
  }
}

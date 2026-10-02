import { Role } from '@prisma/client';
import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export type SessionUser = { id: string; username: string; name: string; role: Role };
export type AuthRequest = Request & { user: SessionUser };
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): SessionUser => context.switchToHttp().getRequest<AuthRequest>().user);

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from '../src/auth/roles.guard';

it('denies roles not allowed by backend metadata', () => {
  const reflector = { getAllAndOverride: () => [Role.MANAGER, Role.OWNER] } as unknown as Reflector;
  const context = { switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.STAFF } }) }), getHandler: () => null, getClass: () => null } as unknown as ExecutionContext;
  expect(() => new RolesGuard(reflector).canActivate(context)).toThrow(ForbiddenException);
});

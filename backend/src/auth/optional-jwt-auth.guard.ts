import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedUser } from './auth.types';

export type OptionalAuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<OptionalAuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) return true;

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(
        token,
      );
      request.user = {
        id: payload.sub,
        role: payload.role as AuthenticatedUser['role'],
      };
    } catch {
      request.user = undefined;
    }
    return true;
  }
}

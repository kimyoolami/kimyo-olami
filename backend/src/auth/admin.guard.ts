import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin huquqi talab qilinadi');
    }
    return true;
  }
}

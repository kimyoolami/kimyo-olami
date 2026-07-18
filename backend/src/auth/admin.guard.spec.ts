import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  function context(role: UserRole) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'user-id', role } }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows administrators', () => {
    expect(guard.canActivate(context(UserRole.ADMIN))).toBe(true);
  });

  it('rejects students', () => {
    expect(() => guard.canActivate(context(UserRole.STUDENT))).toThrow(
      ForbiddenException,
    );
  });
});

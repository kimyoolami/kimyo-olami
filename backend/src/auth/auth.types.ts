import { UserRole } from '../../generated/prisma/enums';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

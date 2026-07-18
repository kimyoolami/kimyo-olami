import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { TelegramUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticateTelegram(dto: TelegramAuthDto) {
    const telegramUser = this.validateInitData(dto.initData);
    const user = await this.prisma.user.upsert({
      where: { telegramId: BigInt(telegramUser.id) },
      update: {
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
      },
    });

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }),
      user: this.toPublicUser(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');
    return this.toPublicUser(user);
  }

  private validateInitData(initData: string): TelegramUser {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan');

    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');
    const authDate = Number(params.get('auth_date'));
    const userJson = params.get('user');
    if (!receivedHash || !authDate || !userJson) {
      throw new UnauthorizedException('Telegram ma’lumotlari to‘liq emas');
    }

    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds < 0 || ageSeconds > 86_400) {
      throw new UnauthorizedException('Telegram ma’lumotlari eskirgan');
    }

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const expectedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const received = Buffer.from(receivedHash, 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new UnauthorizedException('Telegram imzosi noto‘g‘ri');
    }

    try {
      const user = JSON.parse(userJson) as TelegramUser;
      if (!Number.isSafeInteger(user.id) || user.id <= 0) throw new Error();
      return user;
    } catch {
      throw new UnauthorizedException('Telegram foydalanuvchisi noto‘g‘ri');
    }
  }

  private toPublicUser(user: {
    id: string;
    telegramId: bigint;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    role: string;
    isPremium: boolean;
    premiumUntil: Date | null;
  }) {
    return { ...user, telegramId: user.telegramId.toString() };
  }
}

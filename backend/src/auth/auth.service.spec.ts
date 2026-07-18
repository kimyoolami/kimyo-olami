import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const botToken = '123456:test-token';
  const user = {
    id: 'user-id',
    telegramId: 123456789n,
    firstName: 'Ali',
    lastName: null,
    username: 'ali',
    role: 'STUDENT' as const,
    isPremium: false,
    premiumUntil: null,
  };
  const prisma = {
    user: { upsert: jest.fn().mockResolvedValue(user) },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
  const config = { get: jest.fn().mockReturnValue(botToken) };
  const service = new AuthService(
    config as unknown as ConfigService,
    jwt as unknown as JwtService,
    prisma as unknown as PrismaService,
  );

  it('authenticates valid Telegram initData', async () => {
    const authDate = Math.floor(Date.now() / 1000).toString();
    const telegramUser = JSON.stringify({
      id: 123456789,
      first_name: 'Ali',
      username: 'ali',
    });
    const dataCheckString = `auth_date=${authDate}\nuser=${telegramUser}`;
    const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');
    const initData = new URLSearchParams({
      user: telegramUser,
      auth_date: authDate,
      signature: 'telegram-ed25519-signature',
      hash,
    }).toString();

    await expect(
      service.authenticateTelegram({ initData }),
    ).resolves.toMatchObject({
      accessToken: 'access-token',
      user: { telegramId: '123456789' },
    });
  });

  it('rejects invalid Telegram signatures', async () => {
    const initData = new URLSearchParams({
      user: JSON.stringify({ id: 123456789 }),
      auth_date: Math.floor(Date.now() / 1000).toString(),
      hash: '00'.repeat(32),
    }).toString();

    await expect(
      service.authenticateTelegram({ initData }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return 'bot-token';
      if (key === 'JWT_SECRET')
        return 'a-secure-jwt-secret-with-at-least-32-characters';
      if (key === 'PREMIUM_PRICE_STARS') return '100';
      return undefined;
    }),
  };
  const prisma = {
    payment: {
      findUnique: jest.fn(),
      update: jest.fn((input: unknown) => ({
        operation: 'payment-update',
        input,
      })),
    },
    user: {
      update: jest.fn((input: unknown) => ({
        operation: 'user-update',
        input,
      })),
    },
    $transaction: jest.fn(),
  };
  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, result: true }),
    });
  });

  it('rejects webhook calls without the Telegram secret', async () => {
    await expect(
      service.handleTelegramUpdate(undefined, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('activates premium only after a matching successful payment', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'payment-id',
      userId: 'user-id',
      payload: 'premium_payload',
      amount: 100,
      currency: 'XTR',
      status: 'PENDING',
      user: {
        telegramId: 123456789n,
        premiumUntil: null,
      },
    });

    await service.handleTelegramUpdate(service.getWebhookSecret(), {
      message: {
        from: { id: 123456789 },
        successful_payment: {
          currency: 'XTR',
          total_amount: 100,
          invoice_payload: 'premium_payload',
          telegram_payment_charge_id: 'telegram-charge',
          provider_payment_charge_id: 'provider-charge',
        },
      },
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const paymentUpdate = prisma.payment.update.mock.calls[0]?.[0] as {
      data: { status: string };
    };
    const userUpdate = prisma.user.update.mock.calls[0]?.[0] as {
      data: { isPremium: boolean };
    };
    expect(paymentUpdate.data.status).toBe('PAID');
    expect(userUpdate.data.isPremium).toBe(true);
  });
});

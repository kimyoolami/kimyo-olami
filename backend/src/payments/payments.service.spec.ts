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
      updateMany: jest.fn((input: unknown) => {
        void input;
        return Promise.resolve({ count: 0 });
      }),
    },
    user: {
      findUnique: jest.fn(),
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
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof prisma) => Promise<void>) =>
        callback(prisma),
    );
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
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });

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
    const paymentUpdate = prisma.payment.updateMany.mock.calls[0]?.[0] as {
      data: { status: string };
    };
    const userUpdate = prisma.user.update.mock.calls[0]?.[0] as {
      data: { isPremium: boolean };
    };
    expect(paymentUpdate.data.status).toBe('PAID');
    expect(userUpdate.data.isPremium).toBe(true);
  });

  it('does not extend premium when another webhook already claimed the payment', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'payment-id',
      userId: 'user-id',
      payload: 'premium_payload',
      amount: 100,
      currency: 'XTR',
      status: 'PENDING',
      user: { telegramId: 123456789n, premiumUntil: null },
    });
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });

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

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('expires only the current user pending invoice', async () => {
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.cancelInvoice('user-id', 'payment-id'),
    ).resolves.toEqual({ cancelled: true });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'payment-id', userId: 'user-id', status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
  });

  it('creates a one-person channel invite for an active buyer', async () => {
    prisma.user.findUnique.mockResolvedValue({
      telegramId: 123456789n,
      role: 'STUDENT',
      isPremium: true,
      premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          result: { invite_link: 'https://t.me/+private' },
        }),
    });

    await expect(service.createChannelInvite('user-id')).resolves.toMatchObject({
      inviteLink: 'https://t.me/+private',
    });
    const request = (global.fetch as jest.Mock).mock.calls[0]?.[1] as {
      body: string;
    };
    expect(JSON.parse(request.body)).toMatchObject({
      chat_id: '-1004499182599',
      member_limit: 1,
    });
  });
});

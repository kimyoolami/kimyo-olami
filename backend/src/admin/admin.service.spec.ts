import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('serializes Telegram IDs in the payment list', async () => {
    const prisma = {
      payment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'payment-id',
            amount: 100,
            currency: 'XTR',
            status: 'PAID',
            paidAt: new Date(),
            createdAt: new Date(),
            telegramPaymentChargeId: 'charge-id',
            user: {
              telegramId: 705507906n,
              firstName: 'Abdulla',
              username: 'A_Yusupoov',
            },
          },
        ]),
      },
    };
    const service = new AdminService(prisma as unknown as PrismaService);

    const payments = await service.listPayments();

    expect(payments[0]?.user.telegramId).toBe('705507906');
  });
});

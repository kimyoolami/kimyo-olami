import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';
import { LessonType } from '../../generated/prisma/enums';

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

  it('rejects publishing a video lesson without a media URL', async () => {
    const prisma = {
      course: { findUnique: jest.fn().mockResolvedValue({ id: 'course-id' }) },
      lesson: { create: jest.fn() },
    };
    const service = new AdminService(prisma as unknown as PrismaService);

    await expect(
      service.createLesson('course-id', {
        slug: 'video-dars',
        title: 'Video dars',
        type: LessonType.VIDEO,
        isPublished: true,
      }),
    ).rejects.toThrow('media havolasini kiriting');
    expect(prisma.lesson.create).not.toHaveBeenCalled();
  });

  it('rejects publishing an empty text lesson', async () => {
    const prisma = {
      course: { findUnique: jest.fn().mockResolvedValue({ id: 'course-id' }) },
      lesson: { create: jest.fn() },
    };
    const service = new AdminService(prisma as unknown as PrismaService);

    await expect(
      service.createLesson('course-id', {
        slug: 'matnli-dars',
        title: 'Matnli dars',
        type: LessonType.TEXT,
        content: '   ',
        isPublished: true,
      }),
    ).rejects.toThrow('dars matnini kiriting');
  });

  it('allows publishing an existing draft after adding its media URL', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'lesson-id' });
    const prisma = {
      lesson: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lesson-id',
          type: LessonType.PDF,
          content: null,
          mediaUrl: null,
          isPublished: false,
        }),
        update,
      },
    };
    const service = new AdminService(prisma as unknown as PrismaService);

    await service.updateLesson('lesson-id', {
      mediaUrl: 'https://example.com/material.pdf',
      isPublished: true,
    });

    expect(update).toHaveBeenCalled();
  });
});

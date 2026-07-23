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
          slug: 'material',
          course: { slug: 'course' },
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

  it('stores a valid PDF and assigns its protected media URL', async () => {
    const update = jest.fn((input: unknown) => {
      void input;
      return Promise.resolve({
        id: 'lesson-id',
        mediaUrl: '/api/courses/organik/lessons/konspekt/media',
      });
    });
    const prisma = {
      lesson: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lesson-id',
          type: LessonType.PDF,
          content: null,
          mediaUrl: null,
          isPublished: false,
          slug: 'konspekt',
          course: { slug: 'organik' },
        }),
        update,
      },
    };
    const service = new AdminService(prisma as unknown as PrismaService);
    const buffer = Buffer.from('%PDF-1.7 test');

    await service.uploadLessonPdf('lesson-id', {
      buffer,
      mimetype: 'application/pdf',
      originalname: 'konspekt.pdf',
      size: buffer.length,
    });

    const updateInput = update.mock.calls[0]?.[0] as {
      data: { mediaData: Uint8Array; mediaUrl: string };
    };
    expect(Buffer.from(updateInput.data.mediaData)).toEqual(buffer);
    expect(updateInput.data.mediaUrl).toBe(
      '/api/courses/organik/lessons/konspekt/media',
    );
  });

  it('rejects a file that only claims to be a PDF', async () => {
    const prisma = {
      lesson: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lesson-id',
          type: LessonType.PDF,
          content: null,
          mediaUrl: null,
          isPublished: false,
          slug: 'konspekt',
          course: { slug: 'organik' },
        }),
        update: jest.fn(),
      },
    };
    const service = new AdminService(prisma as unknown as PrismaService);

    await expect(
      service.uploadLessonPdf('lesson-id', {
        buffer: Buffer.from('not a pdf'),
        mimetype: 'application/pdf',
        originalname: 'fake.pdf',
        size: 9,
      }),
    ).rejects.toThrow('haqiqiy PDF');
    expect(prisma.lesson.update).not.toHaveBeenCalled();
  });
});

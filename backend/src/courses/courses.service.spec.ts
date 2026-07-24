import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';

describe('CoursesService premium access', () => {
  const config = {
    get: jest.fn().mockReturnValue('bot-token'),
  } as unknown as ConfigService;
  const lesson = {
    id: 'lesson-id',
    slug: 'premium-lesson',
    title: 'Premium lesson',
    description: null,
    type: 'TEXT',
    content: 'Protected content',
    mediaUrl: null,
    duration: null,
    isPreview: false,
    course: {
      id: 'course-id',
      slug: 'premium-course',
      title: 'Premium course',
      isPremium: true,
    },
    quiz: null,
  };

  it('keeps premium content locked for anonymous users', async () => {
    const prisma = {
      lesson: { findFirst: jest.fn().mockResolvedValue(lesson) },
      user: { findUnique: jest.fn() },
    };
    const service = new CoursesService(
      prisma as unknown as PrismaService,
      config,
    );

    const result = await service.findLesson('premium-course', 'premium-lesson');

    expect(result.locked).toBe(true);
    expect(result.content).toBeNull();
  });

  it('returns premium content to active premium users', async () => {
    const prisma = {
      lesson: { findFirst: jest.fn().mockResolvedValue(lesson) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          role: 'STUDENT',
          isPremium: true,
          premiumUntil: new Date(Date.now() + 60_000),
        }),
      },
    };
    const service = new CoursesService(
      prisma as unknown as PrismaService,
      config,
    );

    const result = await service.findLesson(
      'premium-course',
      'premium-lesson',
      'user-id',
    );

    expect(result.locked).toBe(false);
    expect(result.content).toBe('Protected content');
  });

  it('lists only published PDF materials from published courses', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { lesson: { findMany } };
    const service = new CoursesService(
      prisma as unknown as PrismaService,
      config,
    );

    await service.findPdfMaterials();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: 'PDF',
          isPublished: true,
          course: { isPublished: true },
        },
      }),
    );
  });

  it('serves stored media for a free preview lesson', async () => {
    const prisma = {
      lesson: {
        findFirst: jest.fn().mockResolvedValue({
          isPreview: true,
          mediaData: Uint8Array.from(Buffer.from('%PDF-test')),
          mediaMimeType: 'application/pdf',
          mediaFileName: 'test.pdf',
          course: { isPremium: true },
        }),
      },
      user: { findUnique: jest.fn() },
    };
    const service = new CoursesService(
      prisma as unknown as PrismaService,
      config,
    );

    const result = await service.getLessonMedia('course', 'lesson');

    expect(result.mimeType).toBe('application/pdf');
    expect(result.data.toString()).toBe('%PDF-test');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('blocks stored premium media for anonymous users', async () => {
    const prisma = {
      lesson: {
        findFirst: jest.fn().mockResolvedValue({
          isPreview: false,
          mediaData: Uint8Array.from(Buffer.from('%PDF-test')),
          mediaMimeType: 'application/pdf',
          mediaFileName: 'test.pdf',
          course: { isPremium: true },
        }),
      },
    };
    const service = new CoursesService(
      prisma as unknown as PrismaService,
      config,
    );

    await expect(service.getLessonMedia('course', 'lesson')).rejects.toThrow(
      'Premium obuna',
    );
  });

  it('copies an allowed Telegram video to the student with protection', async () => {
    const prisma = {
      lesson: {
        findFirst: jest.fn().mockResolvedValue({
          isPreview: false,
          telegramChatId: '-1001234567890',
          telegramMessageId: 42,
          course: { isPremium: true },
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          telegramId: 123456789n,
          role: 'STUDENT',
          isPremium: true,
          premiumUntil: new Date(Date.now() + 60_000),
        }),
      },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, result: { message_id: 1 } }),
    });
    const service = new CoursesService(
      prisma as unknown as PrismaService,
      config,
    );

    await expect(
      service.deliverTelegramVideo('course', 'lesson', 'user-id'),
    ).resolves.toEqual({
      delivered: true,
      chatUrl: 'https://t.me/kimyo_olami_bot',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/copyMessage'),
      expect.objectContaining({
        body: JSON.stringify({
          chat_id: '123456789',
          from_chat_id: '-1001234567890',
          message_id: 42,
          protect_content: true,
        }),
      }),
    );
  });
});

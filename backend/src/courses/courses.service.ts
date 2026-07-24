import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  findAll() {
    return this.prisma.course.findMany({
      where: { isPublished: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        imageUrl: true,
        isPremium: true,
        _count: { select: { lessons: { where: { isPublished: true } } } },
      },
    });
  }

  findPdfMaterials() {
    return this.prisma.lesson.findMany({
      where: {
        type: 'PDF',
        isPublished: true,
        course: { isPublished: true },
      },
      orderBy: [
        { course: { order: 'asc' } },
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        duration: true,
        isPreview: true,
        course: {
          select: {
            slug: true,
            title: true,
            isPremium: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    const course = await this.prisma.course.findFirst({
      where: { slug, isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        imageUrl: true,
        isPremium: true,
        lessons: {
          where: { isPublished: true },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            type: true,
            duration: true,
            isPreview: true,
            order: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Kurs topilmadi');
    }

    return course;
  }

  async findLesson(courseSlug: string, lessonSlug: string, userId?: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        slug: lessonSlug,
        isPublished: true,
        course: { slug: courseSlug, isPublished: true },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        type: true,
        content: true,
        mediaUrl: true,
        telegramChatId: true,
        telegramMessageId: true,
        duration: true,
        isPreview: true,
        course: {
          select: { id: true, slug: true, title: true, isPremium: true },
        },
        quiz: { select: { id: true, title: true, passScore: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Dars topilmadi');
    }

    let hasPremiumAccess = false;
    if (userId && lesson.course.isPremium && !lesson.isPreview) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isPremium: true, premiumUntil: true },
      });
      hasPremiumAccess = this.hasPremiumAccess(user);
    }
    const locked =
      lesson.course.isPremium && !lesson.isPreview && !hasPremiumAccess;
    const { telegramChatId, telegramMessageId, ...publicLesson } = lesson;
    return {
      ...publicLesson,
      content: locked ? null : publicLesson.content,
      mediaUrl: locked ? null : publicLesson.mediaUrl,
      telegramVideoAvailable:
        !locked && Boolean(telegramChatId && telegramMessageId),
      locked,
    };
  }

  async deliverTelegramVideo(
    courseSlug: string,
    lessonSlug: string,
    userId: string,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        slug: lessonSlug,
        type: 'VIDEO',
        isPublished: true,
        course: { slug: courseSlug, isPublished: true },
      },
      select: {
        isPreview: true,
        telegramChatId: true,
        telegramMessageId: true,
        course: { select: { isPremium: true } },
      },
    });
    if (!lesson?.telegramChatId || !lesson.telegramMessageId) {
      throw new NotFoundException('Telegram video topilmadi');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramId: true,
        role: true,
        isPremium: true,
        premiumUntil: true,
      },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (
      lesson.course.isPremium &&
      !lesson.isPreview &&
      !this.hasPremiumAccess(user)
    ) {
      throw new ForbiddenException('Premium obuna talab qilinadi');
    }
    await this.callTelegram('copyMessage', {
      chat_id: user.telegramId.toString(),
      from_chat_id: lesson.telegramChatId,
      message_id: lesson.telegramMessageId,
      protect_content: true,
    });
    return {
      delivered: true as const,
      chatUrl: 'https://t.me/kimyo_olami_bot',
    };
  }

  async getLessonMedia(
    courseSlug: string,
    lessonSlug: string,
    userId?: string,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        slug: lessonSlug,
        isPublished: true,
        course: { slug: courseSlug, isPublished: true },
      },
      select: {
        isPreview: true,
        mediaData: true,
        mediaMimeType: true,
        mediaFileName: true,
        course: { select: { isPremium: true } },
      },
    });
    if (!lesson?.mediaData || !lesson.mediaMimeType) {
      throw new NotFoundException('Dars fayli topilmadi');
    }
    if (lesson.course.isPremium && !lesson.isPreview) {
      if (!userId) throw new ForbiddenException('Premium obuna talab qilinadi');
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isPremium: true, premiumUntil: true },
      });
      const active = this.hasPremiumAccess(user);
      if (!active) throw new ForbiddenException('Premium obuna talab qilinadi');
    }
    return {
      data: Buffer.from(lesson.mediaData),
      mimeType: lesson.mediaMimeType,
      fileName: lesson.mediaFileName ?? `${lessonSlug}.pdf`,
    };
  }

  private hasPremiumAccess(
    user:
      | {
          role: string;
          isPremium: boolean;
          premiumUntil: Date | null;
        }
      | null
      | undefined,
  ) {
    return (
      user?.role === 'ADMIN' ||
      (user?.isPremium === true &&
        (user.premiumUntil === null || user.premiumUntil > new Date()))
    );
  }

  private async callTelegram(method: string, body: object) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan');
    const response = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    const payload = (await response.json()) as {
      ok: boolean;
      description?: string;
    };
    if (!response.ok || !payload.ok) {
      throw new BadGatewayException(
        payload.description ?? 'Telegram API xatosi',
      );
    }
  }
}

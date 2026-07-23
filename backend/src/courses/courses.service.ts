import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

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
      hasPremiumAccess =
        user?.role === 'ADMIN' ||
        (user?.isPremium === true &&
          (user.premiumUntil === null || user.premiumUntil > new Date()));
    }
    const locked =
      lesson.course.isPremium && !lesson.isPreview && !hasPremiumAccess;
    return {
      ...lesson,
      content: locked ? null : lesson.content,
      mediaUrl: locked ? null : lesson.mediaUrl,
      locked,
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
      const active =
        user?.role === 'ADMIN' ||
        (user?.isPremium === true &&
          (user.premiumUntil === null || user.premiumUntil > new Date()));
      if (!active) throw new ForbiddenException('Premium obuna talab qilinadi');
    }
    return {
      data: Buffer.from(lesson.mediaData),
      mimeType: lesson.mediaMimeType,
      fileName: lesson.mediaFileName ?? `${lessonSlug}.pdf`,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { CreateQuizDto } from './dto/quiz.dto';
import { LessonType } from '../../generated/prisma/enums';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listPayments() {
    const payments = await this.prisma.payment.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paidAt: true,
        createdAt: true,
        telegramPaymentChargeId: true,
        user: {
          select: {
            telegramId: true,
            firstName: true,
            username: true,
          },
        },
      },
    });
    return payments.map((payment) => ({
      ...payment,
      user: {
        ...payment.user,
        telegramId: payment.user.telegramId.toString(),
      },
    }));
  }

  listCourses() {
    return this.prisma.course.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { lessons: true } } },
    });
  }

  createCourse(dto: CreateCourseDto) {
    return this.prisma.course.create({ data: dto });
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    await this.requireCourse(id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async deleteCourse(id: string) {
    await this.requireCourse(id);
    await this.prisma.course.delete({ where: { id } });
    return { deleted: true };
  }

  listLessons(courseId: string) {
    return this.prisma.lesson.findMany({
      where: { courseId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { quiz: { select: { id: true, title: true } } },
    });
  }

  async createLesson(courseId: string, dto: CreateLessonDto) {
    await this.requireCourse(courseId);
    this.assertLessonCanBePublished(
      dto.type,
      dto.content,
      dto.mediaUrl,
      dto.isPublished,
    );
    return this.prisma.lesson.create({ data: { ...dto, courseId } });
  }

  async updateLesson(id: string, dto: UpdateLessonDto) {
    const lesson = await this.requireLesson(id);
    this.assertLessonCanBePublished(
      dto.type ?? lesson.type,
      dto.content === undefined ? lesson.content : dto.content,
      dto.mediaUrl === undefined ? lesson.mediaUrl : dto.mediaUrl,
      dto.isPublished ?? lesson.isPublished,
    );
    return this.prisma.lesson.update({
      where: { id },
      data: { ...dto, mediaUrl: dto.mediaUrl === '' ? null : dto.mediaUrl },
    });
  }

  async deleteLesson(id: string) {
    await this.requireLesson(id);
    await this.prisma.lesson.delete({ where: { id } });
    return { deleted: true };
  }

  async getQuiz(lessonId: string) {
    await this.requireLesson(lessonId);
    return this.prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: { orderBy: { order: 'asc' }, include: { options: true } },
      },
    });
  }

  async createQuiz(lessonId: string, dto: CreateQuizDto) {
    await this.requireLesson(lessonId);
    for (const question of dto.questions) {
      if (question.options.filter((option) => option.isCorrect).length !== 1) {
        throw new BadRequestException(
          'Har bir savolda aynan bitta to‘g‘ri javob bo‘lishi kerak',
        );
      }
    }
    return this.prisma.quiz.create({
      data: {
        lessonId,
        title: dto.title,
        passScore: dto.passScore,
        questions: {
          create: dto.questions.map((question) => ({
            text: question.text,
            order: question.order,
            options: { create: question.options },
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });
  }

  async deleteQuiz(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!quiz) throw new NotFoundException('Test topilmadi');
    await this.prisma.quiz.delete({ where: { id } });
    return { deleted: true };
  }

  private async requireCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');
  }

  private async requireLesson(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        content: true,
        mediaUrl: true,
        isPublished: true,
      },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    return lesson;
  }

  private assertLessonCanBePublished(
    type: LessonType,
    content: string | null | undefined,
    mediaUrl: string | null | undefined,
    isPublished: boolean | undefined,
  ) {
    if (!isPublished) return;
    if (type === LessonType.TEXT && !content?.trim()) {
      throw new BadRequestException(
        'Matnli darsni nashr qilish uchun dars matnini kiriting',
      );
    }
    if (
      (type === LessonType.VIDEO || type === LessonType.PDF) &&
      !mediaUrl?.trim()
    ) {
      throw new BadRequestException(
        'Video yoki PDF darsni nashr qilish uchun media havolasini kiriting',
      );
    }
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProgressStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  getProgress(userId: string) {
    return this.prisma.lessonProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        status: true,
        completedAt: true,
        updatedAt: true,
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
            course: { select: { slug: true, title: true } },
          },
        },
      },
    });
  }

  getAttempts(userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { userId },
      take: 20,
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        score: true,
        passed: true,
        submittedAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
            lesson: {
              select: {
                title: true,
                course: { select: { title: true } },
              },
            },
          },
        },
      },
    });
  }

  async updateProgress(
    userId: string,
    lessonId: string,
    status: ProgressStatus,
  ) {
    await this.assertLessonAccess(userId, lessonId);
    if (status === ProgressStatus.IN_PROGRESS) {
      const existing = await this.prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
      });
      if (existing?.status === ProgressStatus.COMPLETED) return existing;
    }
    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        status,
        completedAt: status === ProgressStatus.COMPLETED ? new Date() : null,
      },
      create: {
        userId,
        lessonId,
        status,
        completedAt: status === ProgressStatus.COMPLETED ? new Date() : null,
      },
    });
  }

  async getQuiz(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        passScore: true,
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
            isPreview: true,
            isPublished: true,
            course: {
              select: { id: true, slug: true, isPremium: true, isPublished: true },
            },
          },
        },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            text: true,
            order: true,
            options: { select: { id: true, text: true } },
          },
        },
      },
    });
    if (!quiz || !quiz.lesson.isPublished || !quiz.lesson.course.isPublished) {
      throw new NotFoundException('Test topilmadi');
    }
    await this.assertCourseAccess(
      userId,
      quiz.lesson.course.id,
      quiz.lesson.course.isPremium && !quiz.lesson.isPreview,
    );
    return quiz;
  }

  async submitQuiz(userId: string, quizId: string, dto: SubmitQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: { include: { course: true } },
        questions: { include: { options: true } },
      },
    });
    if (!quiz || !quiz.lesson.isPublished || !quiz.lesson.course.isPublished) {
      throw new NotFoundException('Test topilmadi');
    }
    await this.assertCourseAccess(
      userId,
      quiz.lesson.course.id,
      quiz.lesson.course.isPremium && !quiz.lesson.isPreview,
    );

    const answers = new Map(
      dto.answers.map((answer) => [answer.questionId, answer.optionId]),
    );
    if (answers.size !== quiz.questions.length) {
      throw new BadRequestException('Barcha savollarga bittadan javob bering');
    }
    let correct = 0;
    for (const question of quiz.questions) {
      const selectedId = answers.get(question.id);
      const selected = question.options.find(
        (option) => option.id === selectedId,
      );
      if (!selected)
        throw new BadRequestException('Javoblardan biri noto‘g‘ri');
      if (selected.isCorrect) correct += 1;
    }

    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= quiz.passScore;
    const attempt = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.quizAttempt.create({
        data: { userId, quizId, score, passed },
      });
      if (passed) {
        await transaction.lessonProgress.upsert({
          where: { userId_lessonId: { userId, lessonId: quiz.lessonId } },
          update: { status: ProgressStatus.COMPLETED, completedAt: new Date() },
          create: {
            userId,
            lessonId: quiz.lessonId,
            status: ProgressStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }
      return created;
    });
    return {
      attemptId: attempt.id,
      score,
      passed,
      correct,
      total: quiz.questions.length,
    };
  }

  private async assertLessonAccess(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, isPublished: true, course: { isPublished: true } },
      select: {
        isPreview: true,
        course: { select: { id: true, isPremium: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    await this.assertCourseAccess(
      userId,
      lesson.course.id,
      lesson.course.isPremium && !lesson.isPreview,
    );
  }

  private async assertCourseAccess(
    userId: string,
    courseId: string,
    purchaseRequired: boolean,
  ) {
    if (!purchaseRequired) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === 'ADMIN') return;
    const access = await this.prisma.courseAccess.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { expiresAt: true },
    });
    if (!access || access.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException('Bu kursni sotib olish talab qilinadi');
    }
  }
}

import { PrismaService } from '../prisma/prisma.service';
import { ProgressStatus } from '../../generated/prisma/enums';
import { LearningService } from './learning.service';

describe('LearningService course purchase access', () => {
  it('returns the latest quiz attempts for the current user', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { quizAttempt: { findMany } };
    const service = new LearningService(prisma as unknown as PrismaService);

    await service.getAttempts('user-id');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-id' },
        take: 20,
        orderBy: { submittedAt: 'desc' },
      }),
    );
  });

  it('allows administrators to open paid course quizzes', async () => {
    const quiz = {
      id: 'quiz-id',
      title: 'Paid course quiz',
      passScore: 70,
      lesson: {
        id: 'lesson-id',
        title: 'Paid lesson',
        isPreview: false,
        isPublished: true,
        course: { id: 'course-id', priceStars: 100, isPublished: true },
      },
      questions: [],
    };
    const prisma = {
      quiz: { findUnique: jest.fn().mockResolvedValue(quiz) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          role: 'ADMIN',
        }),
      },
    };
    const service = new LearningService(prisma as unknown as PrismaService);

    await expect(service.getQuiz('admin-id', 'quiz-id')).resolves.toEqual(quiz);
  });

  it('does not regress completed lessons back to in progress', async () => {
    const completed = {
      id: 'progress-id',
      userId: 'user-id',
      lessonId: 'lesson-id',
      status: 'COMPLETED',
      completedAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = {
      lesson: {
        findFirst: jest.fn().mockResolvedValue({
          isPreview: false,
          course: { id: 'course-id', priceStars: null },
        }),
      },
      lessonProgress: {
        findUnique: jest.fn().mockResolvedValue(completed),
        upsert: jest.fn(),
      },
    };
    const service = new LearningService(prisma as unknown as PrismaService);

    const result = await service.updateProgress(
      'user-id',
      'lesson-id',
      ProgressStatus.IN_PROGRESS,
    );

    expect(result).toBe(completed);
    expect(prisma.lessonProgress.upsert).not.toHaveBeenCalled();
  });

  it('tracks a preview lesson without requiring a purchase', async () => {
    const upsert = jest.fn().mockResolvedValue({ status: 'IN_PROGRESS' });
    const prisma = {
      lesson: {
        findFirst: jest.fn().mockResolvedValue({
          isPreview: true,
          course: { id: 'course-id', priceStars: 100 },
        }),
      },
      user: { findUnique: jest.fn() },
      lessonProgress: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert,
      },
    };
    const service = new LearningService(prisma as unknown as PrismaService);

    await service.updateProgress(
      'user-id',
      'lesson-id',
      ProgressStatus.IN_PROGRESS,
    );

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalled();
  });

  it('allows signed-in students to open preview quizzes in paid courses', async () => {
    const quiz = {
      id: 'quiz-id',
      title: 'Preview quiz',
      passScore: 70,
      lesson: {
        id: 'lesson-id',
        title: 'Preview lesson',
        isPreview: true,
        isPublished: true,
        course: { id: 'course-id', priceStars: 100, isPublished: true },
      },
      questions: [],
    };
    const prisma = {
      quiz: { findUnique: jest.fn().mockResolvedValue(quiz) },
      user: { findUnique: jest.fn() },
    };
    const service = new LearningService(prisma as unknown as PrismaService);

    await expect(service.getQuiz('student-id', 'quiz-id')).resolves.toEqual(
      quiz,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

import { PrismaService } from '../prisma/prisma.service';
import { ProgressStatus } from '../../generated/prisma/enums';
import { LearningService } from './learning.service';

describe('LearningService premium access', () => {
  it('allows administrators to open premium quizzes', async () => {
    const quiz = {
      id: 'quiz-id',
      title: 'Premium quiz',
      passScore: 70,
      lesson: {
        id: 'lesson-id',
        title: 'Premium lesson',
        isPreview: false,
        isPublished: true,
        course: { isPremium: true, isPublished: true },
      },
      questions: [],
    };
    const prisma = {
      quiz: { findUnique: jest.fn().mockResolvedValue(quiz) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          role: 'ADMIN',
          isPremium: false,
          premiumUntil: null,
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
          course: { isPremium: false },
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

  it('tracks a preview lesson without requiring premium access', async () => {
    const upsert = jest.fn().mockResolvedValue({ status: 'IN_PROGRESS' });
    const prisma = {
      lesson: {
        findFirst: jest.fn().mockResolvedValue({
          isPreview: true,
          course: { isPremium: true },
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

  it('allows signed-in students to open preview quizzes in premium courses', async () => {
    const quiz = {
      id: 'quiz-id',
      title: 'Preview quiz',
      passScore: 70,
      lesson: {
        id: 'lesson-id',
        title: 'Preview lesson',
        isPreview: true,
        isPublished: true,
        course: { isPremium: true, isPublished: true },
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

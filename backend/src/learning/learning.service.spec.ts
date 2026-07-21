import { PrismaService } from '../prisma/prisma.service';
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
});

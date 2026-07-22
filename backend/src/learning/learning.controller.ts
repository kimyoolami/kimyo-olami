import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { LearningService } from './learning.service';

@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('progress')
  getProgress(@Req() request: AuthenticatedRequest) {
    return this.learningService.getProgress(request.user.id);
  }

  @Get('attempts')
  getAttempts(@Req() request: AuthenticatedRequest) {
    return this.learningService.getAttempts(request.user.id);
  }

  @Patch('lessons/:lessonId/progress')
  updateProgress(
    @Req() request: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.learningService.updateProgress(
      request.user.id,
      lessonId,
      dto.status,
    );
  }

  @Get('quizzes/:quizId')
  getQuiz(
    @Req() request: AuthenticatedRequest,
    @Param('quizId') quizId: string,
  ) {
    return this.learningService.getQuiz(request.user.id, quizId);
  }

  @Post('quizzes/:quizId/submit')
  submitQuiz(
    @Req() request: AuthenticatedRequest,
    @Param('quizId') quizId: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.learningService.submitQuiz(request.user.id, quizId, dto);
  }
}

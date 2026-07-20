import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { CreateQuizDto } from './dto/quiz.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('payments')
  listPayments() {
    return this.adminService.listPayments();
  }

  @Get('courses') listCourses() {
    return this.adminService.listCourses();
  }
  @Post('courses') createCourse(@Body() dto: CreateCourseDto) {
    return this.adminService.createCourse(dto);
  }
  @Patch('courses/:id') updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.adminService.updateCourse(id, dto);
  }
  @Delete('courses/:id') deleteCourse(@Param('id') id: string) {
    return this.adminService.deleteCourse(id);
  }
  @Get('courses/:courseId/lessons') listLessons(
    @Param('courseId') courseId: string,
  ) {
    return this.adminService.listLessons(courseId);
  }
  @Post('courses/:courseId/lessons') createLesson(
    @Param('courseId') courseId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.adminService.createLesson(courseId, dto);
  }
  @Patch('lessons/:id') updateLesson(
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.adminService.updateLesson(id, dto);
  }
  @Delete('lessons/:id') deleteLesson(@Param('id') id: string) {
    return this.adminService.deleteLesson(id);
  }

  @Get('lessons/:lessonId/quiz')
  getQuiz(@Param('lessonId') lessonId: string) {
    return this.adminService.getQuiz(lessonId);
  }

  @Post('lessons/:lessonId/quiz')
  createQuiz(@Param('lessonId') lessonId: string, @Body() dto: CreateQuizDto) {
    return this.adminService.createQuiz(lessonId, dto);
  }

  @Delete('quizzes/:id') deleteQuiz(@Param('id') id: string) {
    return this.adminService.deleteQuiz(id);
  }
}

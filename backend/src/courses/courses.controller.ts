import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import {
  OptionalJwtAuthGuard,
  type OptionalAuthenticatedRequest,
} from '../auth/optional-jwt-auth.guard';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Get(':courseSlug/lessons/:lessonSlug')
  @UseGuards(OptionalJwtAuthGuard)
  findLesson(
    @Req() request: OptionalAuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.coursesService.findLesson(
      courseSlug,
      lessonSlug,
      request.user?.id,
    );
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }
}

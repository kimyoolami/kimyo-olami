import { Controller, Get, Param } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Get(':courseSlug/lessons/:lessonSlug')
  findLesson(
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.coursesService.findLesson(courseSlug, lessonSlug);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }
}

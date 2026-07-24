import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  OptionalJwtAuthGuard,
  type OptionalAuthenticatedRequest,
} from '../auth/optional-jwt-auth.guard';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../auth/jwt-auth.guard';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Get('materials/pdf')
  findPdfMaterials() {
    return this.coursesService.findPdfMaterials();
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

  @Post(':courseSlug/lessons/:lessonSlug/telegram-video')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  deliverTelegramVideo(
    @Req() request: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.coursesService.deliverTelegramVideo(
      courseSlug,
      lessonSlug,
      request.user.id,
    );
  }

  @Get(':courseSlug/lessons/:lessonSlug/media')
  @UseGuards(OptionalJwtAuthGuard)
  async getLessonMedia(
    @Req() request: OptionalAuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    const media = await this.coursesService.getLessonMedia(
      courseSlug,
      lessonSlug,
      request.user?.id,
    );
    return new StreamableFile(media.data, {
      type: media.mimeType,
      disposition: `inline; filename="${media.fileName.replace(/["\\\r\n]/g, '_')}"`,
      length: media.data.length,
    });
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }
}

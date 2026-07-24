import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../auth/jwt-auth.guard';
import { PaymentsService, type TelegramUpdate } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('courses/:courseSlug/plan')
  getCoursePlan(@Param('courseSlug') courseSlug: string) {
    return this.payments.getCoursePlan(courseSlug);
  }

  @Get('courses/:courseSlug/access')
  @UseGuards(JwtAuthGuard)
  getCourseAccess(
    @Req() request: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
  ) {
    return this.payments.getCourseAccess(request.user.id, courseSlug);
  }

  @Post('courses/:courseSlug/telegram-stars/invoice')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  createInvoice(
    @Req() request: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
  ) {
    return this.payments.createInvoice(request.user.id, courseSlug);
  }

  @Post('courses/:courseSlug/channel-invite')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  createChannelInvite(
    @Req() request: AuthenticatedRequest,
    @Param('courseSlug') courseSlug: string,
  ) {
    return this.payments.createChannelInvite(request.user.id, courseSlug);
  }

  @Post('telegram-stars/:paymentId/cancel')
  @UseGuards(JwtAuthGuard)
  cancelInvoice(
    @Req() request: AuthenticatedRequest,
    @Param('paymentId') paymentId: string,
  ) {
    return this.payments.cancelInvoice(request.user.id, paymentId);
  }

  @Post('telegram/webhook')
  @SkipThrottle()
  handleTelegramWebhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: TelegramUpdate,
  ) {
    return this.payments.handleTelegramUpdate(secret, update);
  }
}

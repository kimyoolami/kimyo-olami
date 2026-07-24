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

  @Get('premium-plan')
  getPremiumPlan() {
    return this.payments.getPremiumPlan();
  }

  @Post('telegram-stars/invoice')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  createInvoice(@Req() request: AuthenticatedRequest) {
    return this.payments.createInvoice(request.user.id);
  }

  @Post('premium-channel/invite')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  createChannelInvite(@Req() request: AuthenticatedRequest) {
    return this.payments.createChannelInvite(request.user.id);
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

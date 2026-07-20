import {
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
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
  @UseGuards(JwtAuthGuard)
  createInvoice(@Req() request: AuthenticatedRequest) {
    return this.payments.createInvoice(request.user.id);
  }

  @Post('telegram/webhook')
  handleTelegramWebhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: TelegramUpdate,
  ) {
    return this.payments.handleTelegramUpdate(secret, update);
  }
}

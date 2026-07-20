import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

type PreCheckoutQuery = {
  id: string;
  from: { id: number };
  currency: string;
  total_amount: number;
  invoice_payload: string;
};

type SuccessfulPayment = {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
};

export type TelegramUpdate = {
  update_id?: number;
  pre_checkout_query?: PreCheckoutQuery;
  message?: {
    from?: { id: number };
    chat?: { id: number };
    text?: string;
    successful_payment?: SuccessfulPayment;
  };
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getPremiumPlan() {
    return {
      title: 'Kimyo Olami Premium',
      stars: this.getPrice(),
      durationDays: 30,
      currency: 'XTR',
    };
  }

  async createInvoice(userId: string) {
    await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { telegramId: true },
    });
    const payload = `premium_${randomUUID()}`;
    const amount = this.getPrice();
    const payment = await this.prisma.payment.create({
      data: { userId, payload, amount },
      select: { id: true },
    });

    try {
      const invoiceLink = await this.callTelegram<string>('createInvoiceLink', {
        title: 'Kimyo Olami Premium',
        description: 'Barcha premium kurs va materiallarga 30 kunlik kirish',
        payload,
        currency: 'XTR',
        prices: [{ label: '30 kunlik Premium', amount }],
      });
      return { invoiceLink, paymentId: payment.id, amount, currency: 'XTR' };
    } catch (error) {
      await this.prisma.payment.delete({ where: { id: payment.id } });
      throw error;
    }
  }

  async handleTelegramUpdate(
    secret: string | undefined,
    update: TelegramUpdate,
  ) {
    if (!this.isValidWebhookSecret(secret)) {
      throw new UnauthorizedException('Telegram webhook kaliti noto‘g‘ri');
    }

    if (update.pre_checkout_query) {
      await this.handlePreCheckout(update.pre_checkout_query);
    }
    if (update.message?.successful_payment && update.message.from) {
      await this.handleSuccessfulPayment(
        update.message.from.id,
        update.message.successful_payment,
      );
    }
    if (update.message?.text && update.message.chat) {
      await this.handleBotCommand(update.message.chat.id, update.message.text);
    }
    return { ok: true };
  }

  getWebhookSecret() {
    const source =
      this.config.get<string>('TELEGRAM_WEBHOOK_SECRET') ??
      this.config.get<string>('JWT_SECRET') ??
      '';
    return createHash('sha256').update(source).digest('hex');
  }

  private async handlePreCheckout(query: PreCheckoutQuery) {
    const payment = await this.prisma.payment.findUnique({
      where: { payload: query.invoice_payload },
      include: { user: { select: { telegramId: true } } },
    });
    const valid =
      payment?.status === 'PENDING' &&
      payment.currency === query.currency &&
      payment.amount === query.total_amount &&
      payment.user.telegramId === BigInt(query.from.id);

    await this.callTelegram('answerPreCheckoutQuery', {
      pre_checkout_query_id: query.id,
      ok: valid,
      ...(valid
        ? {}
        : {
            error_message:
              'To‘lov ma’lumoti mos kelmadi. Qayta urinib ko‘ring.',
          }),
    });
  }

  private async handleSuccessfulPayment(
    telegramId: number,
    successful: SuccessfulPayment,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { payload: successful.invoice_payload },
      include: { user: true },
    });
    if (
      !payment ||
      payment.user.telegramId !== BigInt(telegramId) ||
      payment.currency !== successful.currency ||
      payment.amount !== successful.total_amount
    ) {
      return;
    }
    if (payment.status === 'PAID') return;

    const now = new Date();
    const base =
      payment.user.premiumUntil && payment.user.premiumUntil > now
        ? payment.user.premiumUntil
        : now;
    const premiumUntil = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paidAt: now,
          telegramPaymentChargeId: successful.telegram_payment_charge_id,
          providerPaymentChargeId: successful.provider_payment_charge_id,
        },
      }),
      this.prisma.user.update({
        where: { id: payment.userId },
        data: { isPremium: true, premiumUntil },
      }),
    ]);
  }

  private getPrice() {
    const configured = Number(this.config.get('PREMIUM_PRICE_STARS') ?? 100);
    return Number.isInteger(configured) && configured > 0 ? configured : 100;
  }

  private async handleBotCommand(chatId: number, text: string) {
    const command = text.trim().split(/\s+/, 1)[0]?.split('@', 1)[0];
    if (command === '/start') {
      await this.callTelegram('sendMessage', {
        chat_id: chatId,
        text: 'Kimyo Olami mini ilovasiga xush kelibsiz!',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Kimyo Olamini ochish',
                web_app: { url: 'https://kimyo-olami.vercel.app' },
              },
            ],
          ],
        },
      });
    } else if (command === '/paysupport') {
      await this.callTelegram('sendMessage', {
        chat_id: chatId,
        text: 'To‘lov bo‘yicha yordam olish uchun muammo tavsifi va to‘lov vaqtini shu chatga yuboring. Administrator murojaatingizni ko‘rib chiqadi.',
      });
    }
  }

  private isValidWebhookSecret(received: string | undefined) {
    if (!received) return false;
    const expected = Buffer.from(this.getWebhookSecret());
    const actual = Buffer.from(received);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private async callTelegram<T = true>(
    method: string,
    body: object,
  ): Promise<T> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan');
    const response = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    const payload = (await response.json()) as {
      ok: boolean;
      result?: T;
      description?: string;
    };
    if (!response.ok || !payload.ok || payload.result === undefined) {
      throw new BadGatewayException(
        payload.description ?? 'Telegram API xatosi',
      );
    }
    return payload.result;
  }
}

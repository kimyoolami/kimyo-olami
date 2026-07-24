import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
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
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: NodeJS.Timeout;
  private cleanupRunning = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    void this.cleanupExpiredChannelAccess();
    this.cleanupTimer = setInterval(
      () => void this.cleanupExpiredChannelAccess(),
      60 * 60 * 1000,
    );
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async getCoursePlan(courseSlug: string) {
    const course = await this.prisma.course.findFirst({
      where: { slug: courseSlug, isPublished: true },
      select: {
        slug: true,
        title: true,
        priceStars: true,
        priceUzs: true,
        accessDays: true,
      },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    return { ...course, currency: 'XTR' as const };
  }

  async getCourseAccess(userId: string, courseSlug: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        courseAccess: {
          where: { course: { slug: courseSlug }, expiresAt: { gt: new Date() } },
          select: { expiresAt: true },
          take: 1,
        },
      },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return {
      hasAccess: user.role === 'ADMIN' || user.courseAccess.length > 0,
      expiresAt: user.courseAccess[0]?.expiresAt ?? null,
    };
  }

  async createInvoice(userId: string, courseSlug: string) {
    await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { telegramId: true },
    });
    const course = await this.prisma.course.findFirst({
      where: {
        slug: courseSlug,
        isPublished: true,
        priceStars: { not: null },
      },
      select: {
        id: true,
        title: true,
        priceStars: true,
        priceUzs: true,
        accessDays: true,
      },
    });
    if (!course?.priceStars) throw new NotFoundException('Kurs sotuvda emas');
    const payload = `course_${course.id}_${randomUUID()}`;
    const amount = course.priceStars;
    const payment = await this.prisma.payment.create({
      data: { userId, courseId: course.id, payload, amount },
      select: { id: true },
    });

    try {
      const invoiceLink = await this.callTelegram<string>('createInvoiceLink', {
        title: course.title,
        description: `${course.title} kursiga ${course.accessDays} kunlik kirish${course.priceUzs ? ` (${course.priceUzs.toLocaleString('uz-UZ')} so‘m)` : ''}`,
        payload,
        currency: 'XTR',
        prices: [{ label: `${course.accessDays} kunlik kirish`, amount }],
      });
      return { invoiceLink, paymentId: payment.id, amount, currency: 'XTR' };
    } catch (error) {
      await this.prisma.payment.delete({ where: { id: payment.id } });
      throw error;
    }
  }

  async cancelInvoice(userId: string, paymentId: string) {
    const result = await this.prisma.payment.updateMany({
      where: { id: paymentId, userId, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
    return { cancelled: result.count > 0 };
  }

  async createChannelInvite(userId: string, courseSlug: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramId: true,
        role: true,
        courseAccess: {
          where: { course: { slug: courseSlug }, expiresAt: { gt: new Date() } },
          select: {
            expiresAt: true,
            course: { select: { telegramChannelId: true, title: true } },
          },
          take: 1,
        },
      },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    const access = user.courseAccess[0];
    if (user.role !== 'ADMIN' && !access) {
      throw new ForbiddenException(
        'Bu kursni avval sotib oling',
      );
    }
    const course = access?.course ?? (await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      select: { telegramChannelId: true, title: true },
    }));
    if (!course?.telegramChannelId) {
      throw new NotFoundException('Kurs Telegram kanali sozlanmagan');
    }
    const now = new Date();
    const accessUntil =
      access?.expiresAt ?? new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const linkExpiresAt = new Date(
      Math.min(
        accessUntil.getTime(),
        now.getTime() + 24 * 60 * 60 * 1000,
      ),
    );
    const invite = await this.callTelegram<{ invite_link: string }>(
      'createChatInviteLink',
      {
        chat_id: course.telegramChannelId,
        name: `student-${user.telegramId.toString().slice(-12)}`,
        expire_date: Math.floor(linkExpiresAt.getTime() / 1000),
        member_limit: 1,
      },
    );
    return {
      inviteLink: invite.invite_link,
      accessUntil,
    };
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
      this.config.get<string>('TELEGRAM_BOT_TOKEN') ??
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
      include: { user: true, course: true },
    });
    if (
      !payment?.course ||
      payment.user.telegramId !== BigInt(telegramId) ||
      payment.currency !== successful.currency ||
      payment.amount !== successful.total_amount
    ) {
      return;
    }
    if (payment.status !== 'PENDING') return;

    const now = new Date();
    const existingAccess = await this.prisma.courseAccess.findUnique({
      where: {
        userId_courseId: {
          userId: payment.userId,
          courseId: payment.courseId!,
        },
      },
    });
    const base =
      existingAccess?.expiresAt && existingAccess.expiresAt > now
        ? existingAccess.expiresAt
        : now;
    const accessUntil = new Date(
      base.getTime() + payment.course.accessDays * 24 * 60 * 60 * 1000,
    );

    let activated = false;
    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: {
          status: 'PAID',
          paidAt: now,
          telegramPaymentChargeId: successful.telegram_payment_charge_id,
          providerPaymentChargeId: successful.provider_payment_charge_id,
        },
      });
      if (claimed.count === 0) return;
      activated = true;
      await transaction.courseAccess.upsert({
        where: {
          userId_courseId: {
            userId: payment.userId,
            courseId: payment.courseId!,
          },
        },
        update: { expiresAt: accessUntil },
        create: {
          userId: payment.userId,
          courseId: payment.courseId!,
          expiresAt: accessUntil,
        },
      });
    });
    if (activated) {
      try {
        const invite = await this.createChannelInvite(
          payment.userId,
          payment.course.slug,
        );
        await this.callTelegram('sendMessage', {
          chat_id: telegramId,
          text:
            `To‘lov qabul qilindi. “${payment.course.title}” kursiga ${payment.course.accessDays} kunlik kirishingiz faollashdi.\n\n` +
            `Kanalga kirish: ${invite.inviteLink}\n\n` +
            `Bu bir kishilik havola. Uni boshqalarga yubormang.`,
          protect_content: true,
        });
      } catch {
        await this.callTelegram('sendMessage', {
          chat_id: telegramId,
          text: 'To‘lov qabul qilindi. Kanal havolasini mini ilovadagi “Kanalni ochish” tugmasi orqali oling.',
        });
      }
    }
  }

  private async cleanupExpiredChannelAccess() {
    if (this.cleanupRunning) return;
    this.cleanupRunning = true;
    try {
      const expiredAccess = await this.prisma.courseAccess.findMany({
        where: {
          expiresAt: { lte: new Date() },
          course: { telegramChannelId: { not: null } },
        },
        select: {
          id: true,
          expiresAt: true,
          user: { select: { telegramId: true } },
          course: { select: { telegramChannelId: true } },
        },
        take: 100,
      });
      for (const access of expiredAccess) {
        try {
          await this.callTelegram('banChatMember', {
            chat_id: access.course.telegramChannelId,
            user_id: access.user.telegramId.toString(),
          });
          await this.callTelegram('unbanChatMember', {
            chat_id: access.course.telegramChannelId,
            user_id: access.user.telegramId.toString(),
            only_if_banned: true,
          });
          await this.prisma.courseAccess.deleteMany({
            where: { id: access.id, expiresAt: { lte: new Date() } },
          });
        } catch {
          // A temporary Telegram failure is retried on the next sweep.
        }
      }
    } finally {
      this.cleanupRunning = false;
    }
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

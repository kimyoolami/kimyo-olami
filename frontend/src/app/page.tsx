"use client";

import {
  BookOpen,
  Crown,
  FileText,
  FlaskConical,
  Home,
  Play,
  Search,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  authenticateTelegram,
  createPremiumInvoice,
  getCourses,
  getPremiumPlan,
  getProfile,
  type AuthUser,
  type CourseSummary,
  type PremiumPlan,
} from "@/lib/api";

export default function HomePage() {
  const [apiCourses, setApiCourses] = useState<CourseSummary[] | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [coursesError, setCoursesError] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<PremiumPlan | null>(null);
  const [premiumMessage, setPremiumMessage] = useState("");
  const [paying, setPaying] = useState(false);

  async function loginWithTelegram() {
    const telegram = (
      window as typeof window & {
        Telegram?: { WebApp?: { initData?: string; ready?: () => void } };
      }
    ).Telegram?.WebApp;
    telegram?.ready?.();
    if (!telegram?.initData) return;
    try {
      setUser(await authenticateTelegram(telegram.initData));
      setAuthError(false);
    } catch {
      setAuthError(true);
    }
  }

  useEffect(() => {
    void getCourses()
      .then(setApiCourses)
      .catch(() => {
        setApiCourses([]);
        setCoursesError(true);
      });
    queueMicrotask(() => void loginWithTelegram());
    void getPremiumPlan().then(setPremiumPlan).catch(() => undefined);
  }, []);

  async function buyPremium() {
    if (!user) {
      setPremiumMessage("Avval Telegram orqali kirish kerak");
      return;
    }
    const telegram = (
      window as typeof window & {
        Telegram?: {
          WebApp?: {
            openInvoice?: (
              url: string,
              callback: (status: "paid" | "cancelled" | "failed" | "pending") => void,
            ) => void;
          };
        };
      }
    ).Telegram?.WebApp;
    if (!telegram?.openInvoice) {
      setPremiumMessage("To‘lov faqat Telegram Mini App ichida ochiladi");
      return;
    }

    setPaying(true);
    setPremiumMessage("");
    try {
      const { invoiceLink } = await createPremiumInvoice();
      telegram.openInvoice(invoiceLink, (status) => {
        if (status === "paid") {
          setPremiumMessage("To‘lov qabul qilindi. Premium faollashtirilmoqda…");
          window.setTimeout(() => {
            void getProfile().then((profile) => {
              setUser(profile);
              setPremiumMessage(
                profile.isPremium
                  ? "Premium muvaffaqiyatli faollashtirildi"
                  : "To‘lov tekshirilmoqda. Profilni birozdan so‘ng yangilang.",
              );
            });
          }, 1500);
        } else if (status === "failed") {
          setPremiumMessage("To‘lov amalga oshmadi");
        } else if (status === "cancelled") {
          setPremiumMessage("To‘lov bekor qilindi");
        }
        setPaying(false);
      });
    } catch (error) {
      setPremiumMessage(error instanceof Error ? error.message : "To‘lovni boshlab bo‘lmadi");
      setPaying(false);
    }
  }

  const displayedCourses = (apiCourses ?? []).map((course) => ({
    ...course,
    subtitle: course.description ?? `${course._count.lessons} ta dars`,
    icon: FlaskConical,
  }));

  return (
    <main className="min-h-screen bg-black pb-28 text-white">
      <section className="mx-auto max-w-md px-5 pt-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">
              Xush kelibsiz{user?.firstName ? `, ${user.firstName}` : ""}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Kimyo Olami
            </h1>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
            <FlaskConical size={22} />
          </div>
        </header>

        {authError && (
          <button
            onClick={() => void loginWithTelegram()}
            className="mt-4 w-full rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300"
          >
            Telegram orqali kirish amalga oshmadi. Qayta urinish
          </button>
        )}

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3">
          <Search size={20} className="text-zinc-500" />
          <input
            type="text"
            placeholder="Kurs, video yoki PDF qidiring"
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
          />
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-950 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
                <Crown size={18} />
                Premium
              </div>

              <h2 className="mt-3 max-w-xs text-2xl font-semibold leading-tight">
                Barcha kurs va materiallarga to‘liq kirish
              </h2>

              <button
                onClick={() => void buyPremium()}
                disabled={paying || user?.isPremium}
                className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-70"
              >
                {user?.isPremium
                  ? "Premium faol"
                  : paying
                    ? "Ochilmoqda…"
                    : `Premiumga o‘tish${premiumPlan ? ` — ${premiumPlan.stars} ⭐` : ""}`}
              </button>
            </div>

            <Crown size={52} className="text-white/20" />
          </div>
        </section>

        {premiumMessage && (
          <p className="mt-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-center text-sm text-blue-300">
            {premiumMessage}
          </p>
        )}

        <section id="courses" className="mt-8 scroll-mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Mashhur yo‘nalishlar</h2>
            <button className="text-sm text-blue-400">Barchasi</button>
          </div>

          <div className="mt-4 space-y-3">
            {apiCourses === null && (
              <p className="rounded-2xl bg-zinc-900 p-5 text-center text-sm text-zinc-500">
                Kurslar yuklanmoqda…
              </p>
            )}
            {apiCourses?.length === 0 && (
              <p className="rounded-2xl bg-zinc-900 p-5 text-center text-sm text-zinc-500">
                {coursesError
                  ? "Kurslarni yuklab bo‘lmadi. Keyinroq qayta urinib ko‘ring."
                  : "Kurslar tez orada qo‘shiladi."}
              </p>
            )}
            {displayedCourses.map((course) => {
              const Icon = course.icon;

              return (
                <Link
                  key={course.title}
                  href={`/courses/${course.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-400">
                    <Icon size={24} />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium">{course.title}</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {course.subtitle}
                    </p>
                  </div>

                  <span className="text-zinc-600">›</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="materials" className="mt-8 scroll-mt-6">
          <h2 className="text-xl font-semibold">Materiallar</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <article className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
              <Play className="text-blue-400" />
              <h3 className="mt-6 font-medium">Video darslar</h3>
              <p className="mt-1 text-sm text-zinc-500">Bosqichma-bosqich</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
              <FileText className="text-blue-400" />
              <h3 className="mt-6 font-medium">PDF materiallar</h3>
              <p className="mt-1 text-sm text-zinc-500">Konspekt va testlar</p>
            </article>
          </div>
        </section>
      </section>

      <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-white/10 bg-black/95 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 backdrop-blur">
        <Link href="/" className="flex flex-col items-center gap-1 text-blue-400">
          <Home size={21} />
          <span className="text-xs">Bosh sahifa</span>
        </Link>

        <a href="#courses" className="flex flex-col items-center gap-1 text-zinc-500">
          <BookOpen size={21} />
          <span className="text-xs">Kurslar</span>
        </a>

        <a href="#materials" className="flex flex-col items-center gap-1 text-zinc-500">
          <FileText size={21} />
          <span className="text-xs">Materiallar</span>
        </a>

        <Link href="/profile" className="flex flex-col items-center gap-1 text-zinc-500">
          <User size={21} />
          <span className="text-xs">Profil</span>
        </Link>
      </nav>
    </main>
  );
}

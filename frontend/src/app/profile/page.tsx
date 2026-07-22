"use client";

import { Award, BookOpen, CheckCircle2, Crown, Settings, User, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getProfile,
  getProgress,
  getQuizAttempts,
  type AuthUser,
  type ProgressItem,
  type QuizAttemptItem,
} from "@/lib/api";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptItem[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([getProfile(), getProgress(), getQuizAttempts()])
      .then(([profile, items, quizAttempts]) => {
        setUser(profile);
        setProgress(items);
        setAttempts(quizAttempts);
      })
      .catch(() => setMessage("Profil uchun Telegram Mini App orqali kiring."));
  }, []);

  const completed = progress.filter((item) => item.status === "COMPLETED").length;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-black px-5 pb-28 pt-8 text-white">
      <section className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
          <User size={36} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">{user?.firstName ?? "Foydalanuvchi"}</h1>
        {user?.username && <p className="mt-1 text-zinc-500">@{user.username}</p>}
        {user?.isPremium && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-sm text-amber-400">
              <Crown size={15} /> Premium
            </span>
            {user.premiumUntil && (
              <p className="mt-2 text-xs text-zinc-500">
                {new Intl.DateTimeFormat("uz-UZ", { dateStyle: "long" }).format(new Date(user.premiumUntil))} gacha
              </p>
            )}
          </div>
        )}
      </section>

      {user?.role === "ADMIN" && (
        <Link
          href="/admin"
          className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 p-4 font-semibold"
        >
          <Settings size={20} /> Kontent boshqaruvi
        </Link>
      )}

      {message ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-5 text-center text-zinc-400">{message}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-zinc-900 p-5">
            <CheckCircle2 className="text-emerald-400" />
            <p className="mt-4 text-3xl font-semibold">{completed}</p>
            <p className="text-sm text-zinc-500">Yakunlangan dars</p>
          </div>
          <div className="rounded-2xl bg-zinc-900 p-5">
            <Award className="text-blue-400" />
            <p className="mt-4 text-3xl font-semibold">{progress.length}</p>
            <p className="text-sm text-zinc-500">Boshlangan dars</p>
          </div>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold">So‘nggi darslar</h2>
        <div className="mt-4 space-y-3">
          {progress.slice(0, 5).map((item) => (
            <Link
              key={item.lesson.id}
              href={`/courses/${item.lesson.course.slug}/lessons/${item.lesson.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-4"
            >
              <BookOpen className="text-blue-400" size={20} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.lesson.title}</p>
                <p className="truncate text-xs text-zinc-500">{item.lesson.course.title}</p>
              </div>
              {item.status === "COMPLETED" && <CheckCircle2 size={18} className="text-emerald-400" />}
            </Link>
          ))}
        </div>
      </section>

      {attempts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Test natijalari</h2>
          <div className="mt-4 space-y-3">
            {attempts.slice(0, 5).map((attempt) => (
              <article
                key={attempt.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-4"
              >
                {attempt.passed ? (
                  <CheckCircle2 className="shrink-0 text-emerald-400" size={21} />
                ) : (
                  <XCircle className="shrink-0 text-red-400" size={21} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{attempt.quiz.title}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {attempt.quiz.lesson.course.title}
                  </p>
                </div>
                <span
                  className={`text-lg font-semibold ${attempt.passed ? "text-emerald-400" : "text-red-400"}`}
                >
                  {attempt.score}%
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 justify-around border-t border-white/10 bg-black/95 p-4 backdrop-blur">
        <Link href="/" className="text-zinc-500">Bosh sahifa</Link>
        <span className="text-blue-400">Profil</span>
      </nav>
    </main>
  );
}

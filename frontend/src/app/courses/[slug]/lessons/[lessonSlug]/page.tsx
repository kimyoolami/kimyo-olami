"use client";

import { ArrowLeft, FileText, LockKeyhole, Play } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { getLesson, updateProgress, type LessonDetails } from "@/lib/api";

export default function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>;
}) {
  const { slug, lessonSlug } = use(params);
  const [lesson, setLesson] = useState<LessonDetails | null>(null);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    void getLesson(slug, lessonSlug).then(setLesson).catch(() => setError(true));
  }, [slug, lessonSlug]);

  if (error || !lesson) {
    return (
      <main className="min-h-screen bg-black p-8 text-center text-zinc-400">
        {error ? "Darsni yuklab bo‘lmadi." : "Yuklanmoqda…"}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-black px-5 pb-10 pt-6 text-white">
      <Link href={`/courses/${slug}`} className="inline-flex items-center gap-2 text-sm text-zinc-400">
        <ArrowLeft size={18} /> {lesson.course.title}
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">{lesson.title}</h1>
      {lesson.description && <p className="mt-3 text-zinc-400">{lesson.description}</p>}

      {lesson.locked ? (
        <section className="mt-8 rounded-3xl border border-blue-500/20 bg-blue-600/10 p-6 text-center">
          <LockKeyhole className="mx-auto text-blue-400" size={34} />
          <h2 className="mt-4 text-xl font-semibold">Premium dars</h2>
          <p className="mt-2 text-sm text-zinc-400">Bu darsni ko‘rish uchun premium obuna kerak.</p>
          <button className="mt-5 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold">
            Premiumga o‘tish
          </button>
        </section>
      ) : (
        <section className="mt-8">
          {lesson.mediaUrl && lesson.type === "VIDEO" && (
            <a href={lesson.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 p-4 font-semibold">
              <Play size={20} /> Videoni ochish
            </a>
          )}
          {lesson.mediaUrl && lesson.type === "PDF" && (
            <a href={lesson.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 p-4 font-semibold">
              <FileText size={20} /> PDF materialni ochish
            </a>
          )}
          {lesson.content && <article className="mt-6 whitespace-pre-wrap leading-7 text-zinc-300">{lesson.content}</article>}
          {lesson.quiz && (
            <Link href={`/quizzes/${lesson.quiz.id}`} className="mt-8 block rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <h2 className="font-semibold">{lesson.quiz.title}</h2>
              <p className="mt-1 text-sm text-zinc-500">O‘tish bali: {lesson.quiz.passScore}%</p>
            </Link>
          )}
          {!lesson.quiz && (
            <button
              disabled={completed}
              onClick={() => void updateProgress(lesson.id, "COMPLETED").then(() => setCompleted(true))}
              className="mt-8 w-full rounded-2xl bg-emerald-600 p-4 font-semibold disabled:opacity-70"
            >
              {completed ? "Dars yakunlandi ✓" : "Darsni yakunlash"}
            </button>
          )}
        </section>
      )}
    </main>
  );
}

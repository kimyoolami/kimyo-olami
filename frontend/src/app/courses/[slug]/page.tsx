"use client";

import { ArrowLeft, Clock, FileText, LockKeyhole, Play } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { getCourse, type CourseDetails } from "@/lib/api";

export default function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    void getCourse(slug).then(setCourse).catch(() => setError(true));
  }, [slug]);

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-black px-5 py-8 text-white">
        <Link href="/" className="text-blue-400">← Bosh sahifa</Link>
        <p className="mt-8 text-zinc-400">Kursni yuklab bo‘lmadi. Backend ulanishini tekshiring.</p>
      </main>
    );
  }

  if (!course) {
    return <main className="min-h-screen bg-black p-8 text-center text-zinc-400">Yuklanmoqda…</main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-black px-5 pb-10 pt-6 text-white">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400">
        <ArrowLeft size={18} /> Bosh sahifa
      </Link>
      <section className="mt-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-950 p-6">
        <div className="flex items-center gap-2 text-sm text-blue-100">
          {course.isPremium && <LockKeyhole size={16} />} {course.isPremium ? "Premium kurs" : "Bepul kurs"}
        </div>
        <h1 className="mt-3 text-3xl font-semibold">{course.title}</h1>
        {course.description && <p className="mt-3 text-blue-100">{course.description}</p>}
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Darslar</h2>
        <div className="mt-4 space-y-3">
          {course.lessons.map((lesson, index) => {
            const Icon = lesson.type === "VIDEO" ? Play : FileText;
            return (
              <Link
                key={lesson.id}
                href={`/courses/${course.slug}/lessons/${lesson.slug}`}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-4"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-500">{index + 1}-dars</p>
                  <h3 className="truncate font-medium">{lesson.title}</h3>
                  {lesson.duration && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                      <Clock size={12} /> {lesson.duration} daqiqa
                    </p>
                  )}
                </div>
                {!lesson.isPreview && course.isPremium && <LockKeyhole size={17} className="text-zinc-600" />}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

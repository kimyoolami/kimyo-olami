"use client";

import { ArrowLeft, FileText, LockKeyhole, Play } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { getLesson, getLessonMediaBlob, updateProgress, type LessonDetails } from "@/lib/api";

function getYouTubeEmbedUrl(mediaUrl: string) {
  try {
    const url = new URL(mediaUrl);
    let videoId = "";
    if (url.hostname === "youtu.be") videoId = url.pathname.slice(1).split("/")[0] ?? "";
    if (url.hostname.endsWith("youtube.com")) {
      videoId =
        url.searchParams.get("v") ??
        (url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? "");
    }
    return /^[a-zA-Z0-9_-]{6,}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  } catch {
    return null;
  }
}

function isDirectVideo(mediaUrl: string) {
  try {
    return /\.(?:mp4|webm|ogg|mov)$/i.test(new URL(mediaUrl).pathname);
  } catch {
    return false;
  }
}

export default function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>;
}) {
  const { slug, lessonSlug } = use(params);
  const [lesson, setLesson] = useState<LessonDetails | null>(null);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    void getLesson(slug, lessonSlug)
      .then((loadedLesson) => {
        setLesson(loadedLesson);
        if (!loadedLesson.locked && localStorage.getItem("kimyo_access_token")) {
          void updateProgress(loadedLesson.id, "IN_PROGRESS").catch(() => undefined);
        }
      })
      .catch(() => setError(true));
  }, [slug, lessonSlug]);

  useEffect(() => {
    if (lesson?.type !== "PDF" || !lesson.mediaUrl?.startsWith("/api/")) return;
    let active = true;
    let objectUrl = "";
    void getLessonMediaBlob(lesson.mediaUrl)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfObjectUrl(objectUrl);
      })
      .catch((mediaError: unknown) =>
        setProgressMessage(
          mediaError instanceof Error ? mediaError.message : "PDF’ni ochib bo‘lmadi",
        ),
      );
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [lesson]);

  async function completeLesson() {
    if (!lesson) return;
    setCompleting(true);
    setProgressMessage("");
    try {
      await updateProgress(lesson.id, "COMPLETED");
      setCompleted(true);
    } catch (progressError) {
      setProgressMessage(
        progressError instanceof Error
          ? progressError.message
          : "Dars holatini saqlab bo‘lmadi",
      );
    } finally {
      setCompleting(false);
    }
  }

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
          <Link href="/#premium" className="mt-5 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold">
            Premiumga o‘tish
          </Link>
        </section>
      ) : (
        <section className="mt-8">
          {lesson.mediaUrl && lesson.type === "VIDEO" && (() => {
            const youtubeEmbedUrl = getYouTubeEmbedUrl(lesson.mediaUrl);
            if (youtubeEmbedUrl) {
              return (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                  <iframe
                    src={youtubeEmbedUrl}
                    title={lesson.title}
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="aspect-video w-full"
                  />
                </div>
              );
            }
            if (isDirectVideo(lesson.mediaUrl)) {
              return (
                <video controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl bg-zinc-900">
                  <source src={lesson.mediaUrl} />
                  Brauzeringiz ushbu videoni ko‘rsata olmadi.
                </video>
              );
            }
            return (
              <a href={lesson.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 p-4 font-semibold">
                <Play size={20} /> Videoni ochish
              </a>
            );
          })()}
          {lesson.mediaUrl && lesson.type === "PDF" && (
            <div className="space-y-3">
              {lesson.mediaUrl.startsWith("/api/") && !pdfObjectUrl ? (
                <p className="rounded-2xl bg-zinc-900 p-5 text-center text-sm text-zinc-400">PDF yuklanmoqda…</p>
              ) : (
                <>
                  <iframe src={pdfObjectUrl ?? lesson.mediaUrl} title={lesson.title} className="h-[65vh] w-full rounded-2xl border border-white/10 bg-white" />
                  <a href={pdfObjectUrl ?? lesson.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 p-4 font-semibold">
                    <FileText size={20} /> PDF’ni alohida ochish
                  </a>
                </>
              )}
            </div>
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
              disabled={completed || completing}
              onClick={() => void completeLesson()}
              className="mt-8 w-full rounded-2xl bg-emerald-600 p-4 font-semibold disabled:opacity-70"
            >
              {completed ? "Dars yakunlandi ✓" : completing ? "Saqlanmoqda…" : "Darsni yakunlash"}
            </button>
          )}
          {progressMessage && <p className="mt-3 text-center text-sm text-red-400">{progressMessage}</p>}
        </section>
      )}
    </main>
  );
}

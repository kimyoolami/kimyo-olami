"use client";

import { ArrowLeft, FileQuestion, Plus } from "lucide-react";
import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import { createAdminLesson, createAdminQuiz, getAdminLessons, type AdminLesson } from "@/lib/api";

export default function AdminCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [selected, setSelected] = useState<AdminLesson | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void getAdminLessons(courseId).then(setLessons).catch(() => setMessage("Darslarni yuklab bo‘lmadi"));
  }, [courseId]);

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const lesson = await createAdminLesson(courseId, {
        title: String(form.get("title")),
        slug: String(form.get("slug")),
        type: String(form.get("type")),
        content: String(form.get("content") || ""),
        mediaUrl: String(form.get("mediaUrl") || "") || undefined,
        isPreview: form.get("isPreview") === "on",
        isPublished: form.get("isPublished") === "on",
      });
      setLessons((current) => [...current, lesson]);
      event.currentTarget.reset();
      setMessage("Dars yaratildi");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Darsni yaratib bo‘lmadi");
    }
  }

  async function createQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    try {
      const questions = JSON.parse(String(form.get("questions"))) as unknown;
      await createAdminQuiz(selected.id, {
        title: String(form.get("title")),
        passScore: Number(form.get("passScore")),
        questions,
      });
      setLessons((current) => current.map((item) => item.id === selected.id ? { ...item, quiz: { id: "new", title: String(form.get("title")) } } : item));
      setSelected(null);
      setMessage("Test yaratildi");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON yoki test ma’lumoti noto‘g‘ri");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-black px-5 py-8 text-white">
      <Link href="/admin" className="inline-flex items-center gap-2 text-zinc-400"><ArrowLeft size={18} /> Admin</Link>
      <h1 className="mt-6 text-3xl font-semibold">Darslar boshqaruvi</h1>
      <form onSubmit={(event) => void createLesson(event)} className="mt-8 space-y-3 rounded-3xl bg-zinc-900 p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Plus size={20} /> Yangi dars</h2>
        <input required name="title" placeholder="Dars nomi" className="w-full rounded-xl bg-black p-3" />
        <input required name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="dars-slug" className="w-full rounded-xl bg-black p-3" />
        <select name="type" className="w-full rounded-xl bg-black p-3"><option value="TEXT">Matn</option><option value="VIDEO">Video</option><option value="PDF">PDF</option></select>
        <textarea name="content" placeholder="Dars matni" className="min-h-28 w-full rounded-xl bg-black p-3" />
        <input name="mediaUrl" type="url" placeholder="Video yoki PDF URL" className="w-full rounded-xl bg-black p-3" />
        <div className="flex gap-5 text-sm"><label><input name="isPreview" type="checkbox" /> Preview</label><label><input name="isPublished" type="checkbox" /> Nashr</label></div>
        <button className="w-full rounded-xl bg-blue-600 p-3 font-semibold">Dars yaratish</button>
      </form>
      {message && <p className="mt-4 text-sm text-blue-400">{message}</p>}
      <div className="mt-8 space-y-3">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-4">
            <div className="flex-1"><h3>{lesson.title}</h3><p className="text-xs text-zinc-500">{lesson.type} · {lesson.isPublished ? "Nashr" : "Qoralama"}</p></div>
            {lesson.quiz ? <span className="text-xs text-emerald-400">Test bor</span> : <button onClick={() => setSelected(lesson)} className="text-blue-400"><FileQuestion /></button>}
          </div>
        ))}
      </div>
      {selected && (
        <form onSubmit={(event) => void createQuiz(event)} className="mt-8 space-y-3 rounded-3xl border border-blue-500/30 bg-zinc-900 p-5">
          <h2 className="font-semibold">{selected.title} uchun test</h2>
          <input required name="title" placeholder="Test nomi" className="w-full rounded-xl bg-black p-3" />
          <input required name="passScore" type="number" min="1" max="100" defaultValue="70" className="w-full rounded-xl bg-black p-3" />
          <textarea required name="questions" className="min-h-48 w-full rounded-xl bg-black p-3 font-mono text-xs" defaultValue={'[{"text":"Savol?","order":0,"options":[{"text":"To‘g‘ri","isCorrect":true},{"text":"Noto‘g‘ri","isCorrect":false}]}]'} />
          <button className="w-full rounded-xl bg-blue-600 p-3 font-semibold">Testni yaratish</button>
        </form>
      )}
    </main>
  );
}

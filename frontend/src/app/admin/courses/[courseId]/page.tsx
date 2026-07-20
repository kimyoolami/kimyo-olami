"use client";

import { ArrowLeft, FileQuestion, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import {
  createAdminLesson,
  createAdminQuiz,
  deleteAdminLesson,
  getAdminLessons,
  updateAdminLesson,
  type AdminLesson,
} from "@/lib/api";

type QuizOptionDraft = { text: string; isCorrect: boolean };
type QuizQuestionDraft = { text: string; options: QuizOptionDraft[] };

const emptyQuestion = (): QuizQuestionDraft => ({
  text: "",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ],
});

export default function AdminCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [selected, setSelected] = useState<AdminLesson | null>(null);
  const [editing, setEditing] = useState<AdminLesson | null>(null);
  const [message, setMessage] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionDraft[]>([
    emptyQuestion(),
  ]);
  const [quizSaving, setQuizSaving] = useState(false);

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
        mediaUrl: String(form.get("mediaUrl") || ""),
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
    setQuizSaving(true);
    setMessage("");
    try {
      await createAdminQuiz(selected.id, {
        title: String(form.get("title")),
        passScore: Number(form.get("passScore")),
        questions: quizQuestions.map((question, order) => ({
          text: question.text,
          order,
          options: question.options,
        })),
      });
      setLessons((current) => current.map((item) => item.id === selected.id ? { ...item, quiz: { id: "new", title: String(form.get("title")) } } : item));
      setSelected(null);
      setQuizQuestions([emptyQuestion()]);
      setMessage("Test yaratildi");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test ma’lumoti noto‘g‘ri");
    } finally {
      setQuizSaving(false);
    }
  }

  async function saveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setMessage("");
    try {
      const updated = await updateAdminLesson(editing.id, {
        title: String(form.get("title")),
        description: String(form.get("description") || ""),
        content: String(form.get("content") || ""),
        mediaUrl: String(form.get("mediaUrl") || "") || undefined,
        duration: Number(form.get("duration") || 0) || undefined,
        order: Number(form.get("order") || 0),
        isPreview: form.get("isPreview") === "on",
        isPublished: form.get("isPublished") === "on",
      });
      setLessons((current) =>
        current.map((item) => (item.id === editing.id ? { ...item, ...updated } : item)),
      );
      setEditing(null);
      setMessage("Dars yangilandi");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Darsni saqlab bo‘lmadi");
    }
  }

  function updateQuestion(index: number, text: string) {
    setQuizQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, text } : question,
      ),
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, text: string) {
    setQuizQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? { ...option, text } : option,
              ),
            }
          : question,
      ),
    );
  }

  function markCorrect(questionIndex: number, optionIndex: number) {
    setQuizQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOptionIndex) => ({
                ...option,
                isCorrect: currentOptionIndex === optionIndex,
              })),
            }
          : question,
      ),
    );
  }

  function addOption(questionIndex: number) {
    setQuizQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex && question.options.length < 6
          ? { ...question, options: [...question.options, { text: "", isCorrect: false }] }
          : question,
      ),
    );
  }

  async function togglePublished(lesson: AdminLesson) {
    setMessage("");
    try {
      const updated = await updateAdminLesson(lesson.id, {
        isPublished: !lesson.isPublished,
      });
      setLessons((current) =>
        current.map((item) => (item.id === lesson.id ? { ...item, ...updated } : item)),
      );
      setMessage(updated.isPublished ? "Dars nashr qilindi" : "Dars qoralamaga olindi");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Darsni yangilab bo‘lmadi");
    }
  }

  async function removeLesson(lesson: AdminLesson) {
    if (!window.confirm(`“${lesson.title}” darsi o‘chirilsinmi?`)) return;
    setMessage("");
    try {
      await deleteAdminLesson(lesson.id);
      setLessons((current) => current.filter((item) => item.id !== lesson.id));
      if (selected?.id === lesson.id) setSelected(null);
      setMessage("Dars o‘chirildi");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Darsni o‘chirib bo‘lmadi");
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
          <article key={lesson.id} className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1"><h3>{lesson.title}</h3><p className="text-xs text-zinc-500">{lesson.type} · {lesson.isPublished ? "Nashr" : "Qoralama"}</p></div>
              <button onClick={() => setEditing(lesson)} aria-label="Darsni tahrirlash" className="text-zinc-400"><Pencil size={19} /></button>
              {lesson.quiz ? <span className="text-xs text-emerald-400">Test bor</span> : <button onClick={() => { setSelected(lesson); setQuizQuestions([emptyQuestion()]); }} aria-label="Test qo‘shish" className="text-blue-400"><FileQuestion /></button>}
            </div>
            <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
              <button
                onClick={() => void togglePublished(lesson)}
                className="flex-1 rounded-xl bg-blue-600/15 px-3 py-2 text-sm text-blue-400"
              >
                {lesson.isPublished ? "Qoralamaga olish" : "Nashr qilish"}
              </button>
              <button
                onClick={() => void removeLesson(lesson)}
                aria-label="Darsni o‘chirish"
                className="rounded-xl bg-red-500/10 px-3 text-red-400"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <form onSubmit={(event) => void saveLesson(event)} className="mt-8 space-y-3 rounded-3xl border border-emerald-500/30 bg-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <h2 className="flex-1 font-semibold">Darsni tahrirlash</h2>
            <button type="button" onClick={() => setEditing(null)} aria-label="Yopish" className="text-zinc-400"><X size={20} /></button>
          </div>
          <input required name="title" defaultValue={editing.title} placeholder="Dars nomi" className="w-full rounded-xl bg-black p-3" />
          <textarea name="description" defaultValue={editing.description ?? ""} placeholder="Qisqa tavsif" className="min-h-20 w-full rounded-xl bg-black p-3" />
          <textarea name="content" defaultValue={editing.content ?? ""} placeholder="Dars matni" className="min-h-40 w-full rounded-xl bg-black p-3" />
          <input name="mediaUrl" type="url" defaultValue={editing.mediaUrl ?? ""} placeholder="Video yoki PDF URL" className="w-full rounded-xl bg-black p-3" />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-zinc-400">Davomiyligi (daqiqa)<input name="duration" type="number" min="0" defaultValue={editing.duration ?? ""} className="mt-1 w-full rounded-xl bg-black p-3 text-white" /></label>
            <label className="text-xs text-zinc-400">Tartib raqami<input required name="order" type="number" min="0" defaultValue={editing.order} className="mt-1 w-full rounded-xl bg-black p-3 text-white" /></label>
          </div>
          <div className="flex gap-5 text-sm">
            <label className="flex items-center gap-2"><input name="isPreview" type="checkbox" defaultChecked={editing.isPreview} className="accent-blue-600" /> Bepul ko‘rish</label>
            <label className="flex items-center gap-2"><input name="isPublished" type="checkbox" defaultChecked={editing.isPublished} className="accent-blue-600" /> Nashr</label>
          </div>
          <button className="w-full rounded-xl bg-emerald-600 p-3 font-semibold">O‘zgarishlarni saqlash</button>
        </form>
      )}
      {selected && (
        <form onSubmit={(event) => void createQuiz(event)} className="mt-8 space-y-3 rounded-3xl border border-blue-500/30 bg-zinc-900 p-5">
          <h2 className="font-semibold">{selected.title} uchun test</h2>
          <input required name="title" placeholder="Test nomi" className="w-full rounded-xl bg-black p-3" />
          <input required name="passScore" type="number" min="1" max="100" defaultValue="70" className="w-full rounded-xl bg-black p-3" />
          <div className="space-y-4">
            {quizQuestions.map((question, questionIndex) => (
              <fieldset key={questionIndex} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-400">{questionIndex + 1}-savol</span>
                  {quizQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuizQuestions((current) => current.filter((_, index) => index !== questionIndex))}
                      className="ml-auto text-red-400"
                      aria-label="Savolni o‘chirish"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
                <input
                  required
                  value={question.text}
                  onChange={(event) => updateQuestion(questionIndex, event.target.value)}
                  placeholder="Savol matni"
                  className="mt-3 w-full rounded-xl bg-zinc-900 p-3"
                />
                <div className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`correct-${questionIndex}`}
                        checked={option.isCorrect}
                        onChange={() => markCorrect(questionIndex, optionIndex)}
                        className="accent-emerald-500"
                      />
                      <input
                        required
                        value={option.text}
                        onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                        placeholder={`${optionIndex + 1}-javob varianti`}
                        className="min-w-0 flex-1 rounded-xl bg-zinc-900 p-3"
                      />
                    </label>
                  ))}
                </div>
                {question.options.length < 6 && (
                  <button type="button" onClick={() => addOption(questionIndex)} className="mt-3 text-sm text-blue-400">
                    + Javob varianti
                  </button>
                )}
              </fieldset>
            ))}
          </div>
          <button type="button" onClick={() => setQuizQuestions((current) => [...current, emptyQuestion()])} className="w-full rounded-xl border border-blue-500/30 p-3 text-blue-400">
            + Yana savol qo‘shish
          </button>
          <button disabled={quizSaving} className="w-full rounded-xl bg-blue-600 p-3 font-semibold disabled:opacity-50">{quizSaving ? "Saqlanmoqda…" : "Testni yaratish"}</button>
        </form>
      )}
    </main>
  );
}

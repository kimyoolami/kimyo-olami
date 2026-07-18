"use client";

import { ArrowLeft, BookOpen, Crown, Plus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createAdminCourse, getAdminCourses, getProfile, type AdminCourse } from "@/lib/api";

export default function AdminPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getProfile()
      .then((user) => {
        const isAdmin = user.role === "ADMIN";
        setAllowed(isAdmin);
        if (isAdmin) return getAdminCourses().then(setCourses);
      })
      .catch(() => setAllowed(false));
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage("");
    try {
      const course = await createAdminCourse({
        title: String(form.get("title")),
        slug: String(form.get("slug")),
        description: String(form.get("description") || ""),
        isPremium: form.get("isPremium") === "on",
        isPublished: form.get("isPublished") === "on",
      });
      setCourses((current) => [...current, course]);
      event.currentTarget.reset();
      setMessage("Kurs yaratildi");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kursni yaratib bo‘lmadi");
    } finally {
      setSaving(false);
    }
  }

  if (allowed === null) return <main className="min-h-screen bg-black p-8 text-center text-zinc-400">Tekshirilmoqda…</main>;
  if (!allowed) return <main className="min-h-screen bg-black p-8 text-center text-red-400">Bu sahifa faqat administrator uchun.</main>;

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-black px-5 py-8 text-white">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400"><ArrowLeft size={18} /> Bosh sahifa</Link>
      <h1 className="mt-6 text-3xl font-semibold">Kontent boshqaruvi</h1>

      <form onSubmit={(event) => void handleCreate(event)} className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-zinc-900 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Plus size={20} /> Yangi kurs</h2>
        <input required name="title" placeholder="Kurs nomi" className="w-full rounded-xl bg-black p-3 outline-none ring-blue-500 focus:ring-2" />
        <input required name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="slug: organik-kimyo" className="w-full rounded-xl bg-black p-3 outline-none ring-blue-500 focus:ring-2" />
        <textarea name="description" placeholder="Qisqa tavsif" className="min-h-24 w-full rounded-xl bg-black p-3 outline-none ring-blue-500 focus:ring-2" />
        <div className="flex flex-wrap gap-5 text-sm text-zinc-300">
          <label className="flex items-center gap-2"><input type="checkbox" name="isPremium" className="accent-blue-600" /> Premium</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="isPublished" className="accent-blue-600" /> Nashr qilish</label>
        </div>
        <button disabled={saving} className="w-full rounded-xl bg-blue-600 p-3 font-semibold disabled:opacity-50">{saving ? "Saqlanmoqda…" : "Kurs yaratish"}</button>
        {message && <p className="text-sm text-blue-400">{message}</p>}
      </form>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Kurslar</h2>
        <div className="mt-4 space-y-3">
          {courses.map((course) => (
            <Link href={`/admin/courses/${course.id}`} key={course.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-4">
              <BookOpen className="text-blue-400" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium">{course.title}</h3>
                <p className="text-xs text-zinc-500">{course._count.lessons} dars · {course.isPublished ? "Nashr qilingan" : "Qoralama"}</p>
              </div>
              {course.isPremium && <Crown size={18} className="text-amber-400" />}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

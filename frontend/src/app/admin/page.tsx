"use client";

import { ArrowLeft, BookOpen, Crown, Pencil, Plus, ReceiptText, Trash2, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  createAdminCourse,
  deleteAdminCourse,
  getAdminCourses,
  getAdminPayments,
  getProfile,
  updateAdminCourse,
  type AdminCourse,
  type AdminPayment,
} from "@/lib/api";

export default function AdminPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);

  useEffect(() => {
    void getProfile()
      .then((user) => {
        const isAdmin = user.role === "ADMIN";
        setAllowed(isAdmin);
        if (isAdmin) {
          return Promise.all([getAdminCourses(), getAdminPayments()]).then(
            ([courseItems, paymentItems]) => {
              setCourses(courseItems);
              setPayments(paymentItems);
            },
          );
        }
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

  async function togglePublished(course: AdminCourse) {
    setMessage("");
    try {
      const updated = await updateAdminCourse(course.id, {
        isPublished: !course.isPublished,
      });
      setCourses((current) =>
        current.map((item) => (item.id === course.id ? { ...item, ...updated } : item)),
      );
      setMessage(updated.isPublished ? "Kurs nashr qilindi" : "Kurs qoralamaga olindi");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kursni yangilab bo‘lmadi");
    }
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateAdminCourse(editing.id, {
        title: String(form.get("title")),
        description: String(form.get("description") || ""),
        order: Number(form.get("order") || 0),
        isPremium: form.get("isPremium") === "on",
        isPublished: form.get("isPublished") === "on",
      });
      setCourses((current) =>
        current.map((item) => (item.id === editing.id ? { ...item, ...updated } : item)),
      );
      setEditing(null);
      setMessage("Kurs yangilandi");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kursni saqlab bo‘lmadi");
    } finally {
      setSaving(false);
    }
  }

  async function removeCourse(course: AdminCourse) {
    if (!window.confirm(`“${course.title}” kursi va uning darslari o‘chirilsinmi?`)) return;
    setMessage("");
    try {
      await deleteAdminCourse(course.id);
      setCourses((current) => current.filter((item) => item.id !== course.id));
      setMessage("Kurs o‘chirildi");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kursni o‘chirib bo‘lmadi");
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
            <article key={course.id} className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
              <Link href={`/admin/courses/${course.id}`} className="flex items-center gap-4">
                <BookOpen className="text-blue-400" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{course.title}</h3>
                  <p className="text-xs text-zinc-500">{course._count.lessons} dars · {course.isPublished ? "Nashr qilingan" : "Qoralama"}</p>
                </div>
                {course.isPremium && <Crown size={18} className="text-amber-400" />}
              </Link>
              <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
                <button
                  onClick={() => setEditing(course)}
                  aria-label="Kursni tahrirlash"
                  className="rounded-xl bg-white/5 px-3 text-zinc-300"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => void togglePublished(course)}
                  className="flex-1 rounded-xl bg-blue-600/15 px-3 py-2 text-sm text-blue-400"
                >
                  {course.isPublished ? "Qoralamaga olish" : "Nashr qilish"}
                </button>
                <button
                  onClick={() => void removeCourse(course)}
                  aria-label="Kursni o‘chirish"
                  className="rounded-xl bg-red-500/10 px-3 text-red-400"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><ReceiptText size={21} /> So‘nggi to‘lovlar</h2>
        <div className="mt-4 space-y-3">
          {payments.length === 0 && (
            <p className="rounded-2xl bg-zinc-900 p-5 text-center text-sm text-zinc-500">Hozircha to‘lovlar yo‘q</p>
          )}
          {payments.map((payment) => (
            <article key={payment.id} className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{payment.user.firstName ?? payment.user.username ?? payment.user.telegramId}</p>
                  <p className="mt-1 text-xs text-zinc-500">{new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(payment.paidAt ?? payment.createdAt))}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{payment.amount} ⭐</p>
                  <p className={payment.status === "PAID" ? "text-xs text-emerald-400" : payment.status === "PENDING" ? "text-xs text-amber-400" : "text-xs text-zinc-500"}>
                    {payment.status === "PAID" ? "To‘langan" : payment.status === "PENDING" ? "Kutilmoqda" : payment.status === "REFUNDED" ? "Qaytarilgan" : "Muddati o‘tgan"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 px-5 py-8 backdrop-blur-sm">
          <form onSubmit={(event) => void saveCourse(event)} className="mx-auto max-w-lg space-y-3 rounded-3xl border border-blue-500/30 bg-zinc-900 p-5">
            <div className="flex items-center gap-3">
              <h2 className="flex-1 text-lg font-semibold">Kursni tahrirlash</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Yopish" className="text-zinc-400"><X size={20} /></button>
            </div>
            <input required name="title" defaultValue={editing.title} placeholder="Kurs nomi" className="w-full rounded-xl bg-black p-3" />
            <textarea name="description" defaultValue={editing.description ?? ""} placeholder="Qisqa tavsif" className="min-h-28 w-full rounded-xl bg-black p-3" />
            <label className="block text-xs text-zinc-400">Tartib raqami<input required name="order" type="number" min="0" defaultValue={editing.order} className="mt-1 w-full rounded-xl bg-black p-3 text-white" /></label>
            <div className="flex gap-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="isPremium" defaultChecked={editing.isPremium} className="accent-blue-600" /> Premium</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="isPublished" defaultChecked={editing.isPublished} className="accent-blue-600" /> Nashr</label>
            </div>
            <button disabled={saving} className="w-full rounded-xl bg-blue-600 p-3 font-semibold disabled:opacity-50">{saving ? "Saqlanmoqda…" : "O‘zgarishlarni saqlash"}</button>
          </form>
        </div>
      )}
    </main>
  );
}

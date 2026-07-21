"use client";

import { ArrowLeft, FileText, LockKeyhole, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPdfMaterials, type PdfMaterial } from "@/lib/api";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<PdfMaterial[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    void getPdfMaterials()
      .then(setMaterials)
      .catch(() => {
        setMaterials([]);
        setError(true);
      });
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase("uz-UZ");
  const filtered = (materials ?? []).filter((material) =>
    [material.title, material.description, material.course.title]
      .filter(Boolean)
      .some((value) =>
        value?.toLocaleLowerCase("uz-UZ").includes(normalizedQuery),
      ),
  );

  return (
    <main className="mx-auto min-h-screen max-w-md bg-black px-5 pb-12 pt-6 text-white">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400">
        <ArrowLeft size={18} /> Bosh sahifa
      </Link>

      <header className="mt-6">
        <p className="text-sm text-blue-400">Kutubxona</p>
        <h1 className="mt-1 text-3xl font-semibold">PDF materiallar</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Konspektlar, qo‘llanmalar va dars materiallari
        </p>
      </header>

      <label className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3">
        <Search size={20} className="text-zinc-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Material qidiring"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"
        />
      </label>

      <section className="mt-6 space-y-3">
        {materials === null && (
          <p className="rounded-2xl bg-zinc-900 p-5 text-center text-sm text-zinc-500">
            Materiallar yuklanmoqda…
          </p>
        )}
        {materials?.length === 0 && (
          <p className="rounded-2xl bg-zinc-900 p-5 text-center text-sm text-zinc-500">
            {error
              ? "Materiallarni yuklab bo‘lmadi. Qayta urinib ko‘ring."
              : "PDF materiallar hali qo‘shilmagan."}
          </p>
        )}
        {materials !== null && materials.length > 0 && filtered.length === 0 && (
          <p className="rounded-2xl bg-zinc-900 p-5 text-center text-sm text-zinc-500">
            “{query}” bo‘yicha material topilmadi.
          </p>
        )}
        {filtered.map((material) => {
          const locked = material.course.isPremium && !material.isPreview;
          return (
            <Link
              key={material.id}
              href={`/courses/${material.course.slug}/lessons/${material.slug}`}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-400">
                <FileText size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{material.title}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {material.course.title}
                </p>
                {material.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                    {material.description}
                  </p>
                )}
              </div>
              {locked ? (
                <LockKeyhole size={18} className="shrink-0 text-zinc-600" />
              ) : (
                <span className="shrink-0 text-zinc-600">›</span>
              )}
            </Link>
          );
        })}
      </section>
    </main>
  );
}

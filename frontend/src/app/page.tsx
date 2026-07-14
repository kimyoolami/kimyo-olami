import {
  BookOpen,
  Crown,
  FileText,
  FlaskConical,
  GraduationCap,
  Home,
  Play,
  Search,
  User,
} from "lucide-react";

const courses = [
  {
    title: "Organik kimyo",
    subtitle: "Nazariya va masalalar",
    icon: FlaskConical,
  },
  {
    title: "Umumiy kimyo",
    subtitle: "Asosiy mavzular",
    icon: GraduationCap,
  },
  {
    title: "Video yechimlar",
    subtitle: "Murakkab masalalar",
    icon: Play,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black pb-28 text-white">
      <section className="mx-auto max-w-md px-5 pt-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Xush kelibsiz</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Kimyo Olami
            </h1>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
            <FlaskConical size={22} />
          </div>
        </header>

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

              <button className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black">
                Premiumga o‘tish
              </button>
            </div>

            <Crown size={52} className="text-white/20" />
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Mashhur yo‘nalishlar</h2>
            <button className="text-sm text-blue-400">Barchasi</button>
          </div>

          <div className="mt-4 space-y-3">
            {courses.map((course) => {
              const Icon = course.icon;

              return (
                <article
                  key={course.title}
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
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
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
        <button className="flex flex-col items-center gap-1 text-blue-400">
          <Home size={21} />
          <span className="text-xs">Bosh sahifa</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-zinc-500">
          <BookOpen size={21} />
          <span className="text-xs">Kurslar</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-zinc-500">
          <FileText size={21} />
          <span className="text-xs">Materiallar</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-zinc-500">
          <User size={21} />
          <span className="text-xs">Profil</span>
        </button>
      </nav>
    </main>
  );
}
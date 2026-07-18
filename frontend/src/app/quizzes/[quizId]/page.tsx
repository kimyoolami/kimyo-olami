"use client";

import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { getQuiz, submitQuiz, type QuizDetails } from "@/lib/api";

type Result = Awaited<ReturnType<typeof submitQuiz>>;

export default function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getQuiz(quizId)
      .then(setQuiz)
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : "Testni yuklab bo‘lmadi"),
      );
  }, [quizId]);

  async function handleSubmit() {
    if (!quiz || Object.keys(answers).length !== quiz.questions.length) {
      setMessage("Barcha savollarga javob bering");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      setResult(
        await submitQuiz(
          quiz.id,
          quiz.questions.map((question) => ({
            questionId: question.id,
            optionId: answers[question.id],
          })),
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Natijani saqlab bo‘lmadi");
    } finally {
      setSubmitting(false);
    }
  }

  if (message && !quiz) {
    return <main className="min-h-screen bg-black p-8 text-center text-red-400">{message}</main>;
  }
  if (!quiz) {
    return <main className="min-h-screen bg-black p-8 text-center text-zinc-400">Yuklanmoqda…</main>;
  }

  if (result) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-black px-5 py-10 text-center text-white">
        {result.passed ? (
          <CheckCircle2 size={64} className="mx-auto text-emerald-400" />
        ) : (
          <XCircle size={64} className="mx-auto text-red-400" />
        )}
        <h1 className="mt-5 text-3xl font-semibold">
          {result.passed ? "Testdan o‘tdingiz!" : "Yana bir bor urinib ko‘ring"}
        </h1>
        <div className="mt-6 rounded-3xl bg-zinc-900 p-6">
          <p className="text-5xl font-bold text-blue-400">{result.score}%</p>
          <p className="mt-2 text-zinc-400">{result.total} savoldan {result.correct} ta to‘g‘ri</p>
        </div>
        <button
          onClick={() => { setResult(null); setAnswers({}); }}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 font-semibold"
        >
          <RotateCcw size={18} /> Qayta topshirish
        </button>
        <Link href="/" className="mt-5 block text-sm text-zinc-400">Bosh sahifaga qaytish</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-black px-5 pb-10 pt-6 text-white">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400">
        <ArrowLeft size={18} /> Ortga
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">{quiz.title}</h1>
      <p className="mt-2 text-sm text-zinc-500">O‘tish bali: {quiz.passScore}%</p>
      <div className="mt-8 space-y-6">
        {quiz.questions.map((question, index) => (
          <fieldset key={question.id} className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <legend className="px-2 text-sm text-blue-400">{index + 1}-savol</legend>
            <p className="font-medium">{question.text}</p>
            <div className="mt-4 space-y-2">
              {question.options.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-black/40 p-3">
                  <input
                    type="radio"
                    name={question.id}
                    checked={answers[question.id] === option.id}
                    onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                    className="accent-blue-600"
                  />
                  <span>{option.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {message && <p className="mt-4 text-sm text-red-400">{message}</p>}
      <button
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="mt-6 w-full rounded-2xl bg-blue-600 p-4 font-semibold disabled:opacity-50"
      >
        {submitting ? "Tekshirilmoqda…" : "Testni yakunlash"}
      </button>
    </main>
  );
}

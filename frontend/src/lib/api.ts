// Browser requests stay on the frontend origin and are proxied by Next.js.
// This keeps Telegram Mini App requests independent of Vercel preview origins
// and avoids production CORS/environment mismatches.
const API_URL =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api")
    : "/api";

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  isPremium: boolean;
  _count: { lessons: number };
}

export interface AuthUser {
  id: string;
  firstName: string | null;
  username: string | null;
  isPremium: boolean;
  premiumUntil: string | null;
  role: "STUDENT" | "ADMIN";
}

export interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "REFUNDED";
  paidAt: string | null;
  createdAt: string;
  telegramPaymentChargeId: string | null;
  user: {
    telegramId: string;
    firstName: string | null;
    username: string | null;
  };
}

export function getAdminPayments() {
  return authorizedRequest<AdminPayment[]>("/admin/payments");
}

export interface AdminCourse extends CourseSummary {
  isPublished: boolean;
  order: number;
}

export function getAdminCourses() {
  return authorizedRequest<AdminCourse[]>("/admin/courses");
}

export function createAdminCourse(data: {
  slug: string;
  title: string;
  description?: string;
  isPremium: boolean;
  isPublished: boolean;
}) {
  return authorizedRequest<AdminCourse>("/admin/courses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAdminCourse(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    isPremium: boolean;
    isPublished: boolean;
    order: number;
  }>,
) {
  return authorizedRequest<AdminCourse>(`/admin/courses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAdminCourse(id: string) {
  return authorizedRequest<{ deleted: true }>(`/admin/courses/${id}`, {
    method: "DELETE",
  });
}

export interface AdminLesson {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: "TEXT" | "VIDEO" | "PDF";
  content: string | null;
  mediaUrl: string | null;
  duration: number | null;
  isPublished: boolean;
  isPreview: boolean;
  order: number;
  quiz: { id: string; title: string } | null;
}

export function getAdminLessons(courseId: string) {
  return authorizedRequest<AdminLesson[]>(`/admin/courses/${courseId}/lessons`);
}

export function createAdminLesson(courseId: string, data: Record<string, unknown>) {
  return authorizedRequest<AdminLesson>(`/admin/courses/${courseId}/lessons`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAdminLesson(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    type: "TEXT" | "VIDEO" | "PDF";
    content: string;
    mediaUrl: string;
    duration: number;
    isPreview: boolean;
    isPublished: boolean;
    order: number;
  }>,
) {
  return authorizedRequest<AdminLesson>(`/admin/lessons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function uploadAdminLessonPdf(id: string, file: File) {
  const token = localStorage.getItem("kimyo_access_token");
  if (!token) throw new Error("Avval Telegram orqali kiring");
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(`${API_URL}/admin/lessons/${id}/pdf`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : payload?.message;
    throw new Error(message ?? `PDF yuklash xatosi: ${response.status}`);
  }
  return response.json() as Promise<{ id: string; mediaUrl: string }>;
}

export function deleteAdminLesson(id: string) {
  return authorizedRequest<{ deleted: true }>(`/admin/lessons/${id}`, {
    method: "DELETE",
  });
}

export function createAdminQuiz(lessonId: string, data: Record<string, unknown>) {
  return authorizedRequest(`/admin/lessons/${lessonId}/quiz`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteAdminQuiz(id: string) {
  return authorizedRequest<{ deleted: true }>(`/admin/quizzes/${id}`, {
    method: "DELETE",
  });
}

export interface CourseDetails extends Omit<CourseSummary, "_count"> {
  lessons: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    type: "TEXT" | "VIDEO" | "PDF";
    duration: number | null;
    isPreview: boolean;
  }>;
}

export interface LessonDetails {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: "TEXT" | "VIDEO" | "PDF";
  content: string | null;
  mediaUrl: string | null;
  duration: number | null;
  isPreview: boolean;
  locked: boolean;
  course: { slug: string; title: string; isPremium: boolean };
  quiz: { id: string; title: string; passScore: number } | null;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function getTelegramInitData() {
  if (typeof window === "undefined") return "";
  return (
    window as typeof window & {
      Telegram?: { WebApp?: { initData?: string } };
    }
  ).Telegram?.WebApp?.initData ?? "";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : payload?.message;
    throw new ApiError(message ?? `API xatosi: ${response.status}`, response.status);
  }
  return response.json() as Promise<T>;
}

async function authorizedRequest<T>(path: string, options?: RequestInit) {
  let token = localStorage.getItem("kimyo_access_token");
  const initData = getTelegramInitData();
  if (!token && initData) {
    await authenticateTelegram(initData);
    token = localStorage.getItem("kimyo_access_token");
  }
  if (!token) throw new Error("Avval Telegram orqali kiring");

  const send = (accessToken: string) =>
    request<T>(path, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

  try {
    return await send(token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !initData) {
      throw error;
    }
    localStorage.removeItem("kimyo_access_token");
    await authenticateTelegram(initData);
    const refreshedToken = localStorage.getItem("kimyo_access_token");
    if (!refreshedToken) throw error;
    return send(refreshedToken);
  }
}

async function optionallyAuthorizedRequest<T>(path: string) {
  const token = localStorage.getItem("kimyo_access_token");
  return request<T>(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export function getCourses() {
  return request<CourseSummary[]>("/courses");
}

export interface PdfMaterial {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration: number | null;
  isPreview: boolean;
  course: {
    slug: string;
    title: string;
    isPremium: boolean;
  };
}

export function getPdfMaterials() {
  return request<PdfMaterial[]>("/courses/materials/pdf");
}

export function getCourse(slug: string) {
  return request<CourseDetails>(`/courses/${encodeURIComponent(slug)}`);
}

export function getLesson(courseSlug: string, lessonSlug: string) {
  return optionallyAuthorizedRequest<LessonDetails>(
    `/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}`,
  );
}

export async function getLessonMediaBlob(mediaUrl: string) {
  let token = localStorage.getItem("kimyo_access_token");
  const initData = getTelegramInitData();
  if (!token && initData) {
    await authenticateTelegram(initData);
    token = localStorage.getItem("kimyo_access_token");
  }
  const send = (accessToken: string | null) =>
    fetch(mediaUrl, {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    });
  let response = await send(token);
  if (response.status === 401 && initData) {
    localStorage.removeItem("kimyo_access_token");
    await authenticateTelegram(initData);
    token = localStorage.getItem("kimyo_access_token");
    response = await send(token);
  }
  if (!response.ok) throw new Error(`PDF faylini ochib bo‘lmadi: ${response.status}`);
  return response.blob();
}

export async function authenticateTelegram(initData: string) {
  const result = await request<{ accessToken: string; user: AuthUser }>(
    "/auth/telegram",
    { method: "POST", body: JSON.stringify({ initData }) },
  );
  localStorage.setItem("kimyo_access_token", result.accessToken);
  return result.user;
}

export function getProfile() {
  return authorizedRequest<AuthUser>("/auth/me");
}

export interface PremiumPlan {
  title: string;
  stars: number;
  durationDays: number;
  currency: "XTR";
}

export function getPremiumPlan() {
  return request<PremiumPlan>("/payments/premium-plan");
}

export function createPremiumInvoice() {
  return authorizedRequest<{
    invoiceLink: string;
    paymentId: string;
    amount: number;
    currency: "XTR";
  }>("/payments/telegram-stars/invoice", { method: "POST" });
}

export function cancelPremiumInvoice(paymentId: string) {
  return authorizedRequest<{ cancelled: boolean }>(
    `/payments/telegram-stars/${paymentId}/cancel`,
    { method: "POST" },
  );
}

export interface QuizDetails {
  id: string;
  title: string;
  passScore: number;
  lesson: { id: string; title: string };
  questions: Array<{
    id: string;
    text: string;
    order: number;
    options: Array<{ id: string; text: string }>;
  }>;
}

export function getQuiz(quizId: string) {
  return authorizedRequest<QuizDetails>(`/learning/quizzes/${quizId}`);
}

export function submitQuiz(
  quizId: string,
  answers: Array<{ questionId: string; optionId: string }>,
) {
  return authorizedRequest<{
    attemptId: string;
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  }>(`/learning/quizzes/${quizId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export interface ProgressItem {
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  completedAt: string | null;
  updatedAt: string;
  lesson: {
    id: string;
    slug: string;
    title: string;
    course: { slug: string; title: string };
  };
}

export function getProgress() {
  return authorizedRequest<ProgressItem[]>("/learning/progress");
}

export interface QuizAttemptItem {
  id: string;
  score: number;
  passed: boolean;
  submittedAt: string;
  quiz: {
    id: string;
    title: string;
    lesson: {
      title: string;
      course: { title: string };
    };
  };
}

export function getQuizAttempts() {
  return authorizedRequest<QuizAttemptItem[]>("/learning/attempts");
}

export function updateProgress(
  lessonId: string,
  status: ProgressItem["status"],
) {
  return authorizedRequest(`/learning/lessons/${lessonId}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

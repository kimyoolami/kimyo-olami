const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

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
  role: "STUDENT" | "ADMIN";
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

export interface AdminLesson {
  id: string;
  slug: string;
  title: string;
  type: "TEXT" | "VIDEO" | "PDF";
  isPublished: boolean;
  isPreview: boolean;
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

export function createAdminQuiz(lessonId: string, data: Record<string, unknown>) {
  return authorizedRequest(`/admin/lessons/${lessonId}/quiz`, {
    method: "POST",
    body: JSON.stringify(data),
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
    throw new Error(message ?? `API xatosi: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function authorizedRequest<T>(path: string, options?: RequestInit) {
  const token = localStorage.getItem("kimyo_access_token");
  if (!token) throw new Error("Avval Telegram orqali kiring");
  return request<T>(path, {
    ...options,
    headers: { ...options?.headers, Authorization: `Bearer ${token}` },
  });
}

export function getCourses() {
  return request<CourseSummary[]>("/courses");
}

export function getCourse(slug: string) {
  return request<CourseDetails>(`/courses/${encodeURIComponent(slug)}`);
}

export function getLesson(courseSlug: string, lessonSlug: string) {
  return request<LessonDetails>(
    `/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}`,
  );
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

export function updateProgress(
  lessonId: string,
  status: ProgressItem["status"],
) {
  return authorizedRequest(`/learning/lessons/${lessonId}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

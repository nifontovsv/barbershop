export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Базовый URL для запросов к API (тот же origin + basePath при деплое на GitHub Pages) */
export const apiBase = process.env.NEXT_PUBLIC_API_URL ?? basePath;

export function asset(path: string): string {
  return path.startsWith("/") ? `${basePath}${path}` : `${basePath}/${path}`;
}

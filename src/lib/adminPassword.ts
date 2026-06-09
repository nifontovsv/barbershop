import { timingSafeEqual } from "crypto";

function timingSafeEqualUtf8(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Только пароль (без логина) — для обратной совместимости */
export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !input) return false;
  return timingSafeEqualUtf8(input, expected);
}

/** Основной админ из .env — полный доступ, не связан с таблицей сотрудников */
export function verifyEnvAdminCredentials(login: string, password: string): boolean {
  const expectedLogin = process.env.ADMIN_LOGIN?.trim();
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedLogin || !expectedPassword || !login.trim() || !password) return false;
  return (
    timingSafeEqualUtf8(login.trim().toLowerCase(), expectedLogin.toLowerCase()) &&
    timingSafeEqualUtf8(password, expectedPassword)
  );
}

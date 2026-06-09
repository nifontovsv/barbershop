export const PHONE_MASK = "+{7} 000 000-00-00";

/** Цифры после кода страны для react-imask (unmask). */
export function phoneToUnmasked(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("7")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return "";
}

export function normalizeClientPhone(unmasked: string): string {
  const digits = unmasked.replace(/\D/g, "");
  if (digits.length === 10) return "7" + digits;
  return digits;
}

export function isPhoneComplete(unmasked: string): boolean {
  return unmasked.replace(/\D/g, "").length >= 10;
}

export function formatPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("7")) {
    return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
  }
  if (d.length === 10) {
    return `+7 ${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
  }
  return phone;
}

export function normalizeClientEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

export function isEmailValid(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { requireTabSession } from "@/lib/requireAdmin";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return "";
}

export async function POST(request: Request) {
  const auth = await requireTabSession("content");
  if (!auth.ok) return auth.response;
  const form = await request.formData();
  const file = form.get("file");
  const subdirRaw = form.get("subdir");
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ message: "Файл не передан" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: "Файл слишком большой (макс. 8 МБ)" }, { status: 400 });
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ message: "Допустимы только JPG, PNG, WebP, GIF" }, { status: 400 });
  }
  const ext = extForMime(mime);
  if (!ext) return NextResponse.json({ message: "Неверный тип" }, { status: 400 });
  const subdir =
    typeof subdirRaw === "string" && /^[a-z0-9_-]+$/i.test(subdirRaw) ? subdirRaw : "misc";
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buf);
  const publicPath = `/uploads/${subdir}/${name}`;
  return NextResponse.json({ path: publicPath });
}

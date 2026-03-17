"use client";

import Link from "next/link";

const ADDRESS = "ул. Мансура Хасанова, 15, Казань";
const VK_GROUP_URL = "https://vk.ru/id897263128";
const URL_2GIS = "https://2gis.ru/kazan/firm/70000001095119622";
const URL_YANDEX_MAPS =
  "https://yandex.ru/maps/org/muzhskaya_parikmakherskaya/74689483204/?ll=49.184657%2C55.778892&z=17";

function VkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.49-.085.745-.576.745z" />
    </svg>
  );
}

function YandexIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
        fill="currentColor"
      >
        Я
      </text>
    </svg>
  );
}

function TwoGisIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
        fill="currentColor"
      >
        2ГИС
      </text>
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--surface)] bg-[var(--bg)]/85 py-6">
      <div className="container-landing">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div className="text-center sm:text-left">
            <div className="text-sm font-medium text-white/90">Мужская Парикмахерская</div>
            <div className="mt-1 text-sm text-white/70">{ADDRESS}</div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={VK_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0077FF] text-white transition-[transform,filter] hover:brightness-110 active:scale-[0.98]"
              aria-label="Мы во ВКонтакте"
              title="ВКонтакте"
            >
              <VkIcon className="h-5 w-5" />
            </a>
            <a
              href={URL_YANDEX_MAPS}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FC3F1D] text-white transition-[transform,filter] hover:brightness-110 active:scale-[0.98]"
              aria-label="Мы на Яндекс.Картах"
              title="Яндекс.Карты"
            >
              <YandexIcon className="h-6 w-6" />
            </a>
            <a
              href={URL_2GIS}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#29B24A] text-white transition-[transform,filter] hover:brightness-110 active:scale-[0.98]"
              aria-label="Мы в 2ГИС"
              title="2ГИС"
            >
              <TwoGisIcon className="h-6 w-6" />
            </a>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-white/60 sm:justify-between">
          <span>© {new Date().getFullYear()} Мужская Парикмахерская</span>
          <Link href="/privacy" className="hover:text-white/85 hover:underline">
            Политика конфиденциальности
          </Link>
        </div>
      </div>
    </footer>
  );
}

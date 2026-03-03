"use client";

const MASTERS = [
  {
    name: "Владимир",
    specialty: "Стрижки, бритьё",
    rating: 5,
    description:
      "Стригу и брею больше десяти лет. Люблю чёткие линии и аккуратные формы — чтобы выглядели ухоженно и по-мужски сдержанно. Подберу стрижку под форму лица и образ жизни.",
  },
  {
    name: "Марат",
    specialty: "Мужские стрижки, борода",
    rating: 5,
    description:
      "Специализируюсь на мужских стрижках и оформлении бороды. Классика и современные тренды — делаю так, чтобы клиент выходил довольным и уверенным. Всегда подскажу с уходом.",
  },
] as const;

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5 text-[var(--accent)]" aria-label={`Рейтинг: ${count} из 5`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="text-sm sm:text-base">★</span>
      ))}
    </span>
  );
}

export function MastersSection() {
  return (
    <section className="h-full">
      <div className="flex h-full flex-col rounded-2xl bg-[var(--bg)]/90 px-6 py-8 shadow-xl backdrop-blur-sm sm:px-8 sm:py-10">
        <h2 className="text-center text-2xl font-semibold text-[var(--text)] sm:text-3xl">
          Наши мастера
        </h2>
        <ul className="mt-6 flex-1 space-y-6 sm:mt-8">
          {MASTERS.map((master) => (
            <li key={master.name}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-2xl font-semibold text-black sm:h-20 sm:w-20 sm:text-3xl"
                  aria-hidden
                >
                  {master.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <span className="font-semibold text-[var(--text)]">{master.name}</span>
                    <Stars count={master.rating} />
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{master.specialty}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
                    {master.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

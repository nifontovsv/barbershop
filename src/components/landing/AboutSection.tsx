"use client";

export function AboutSection() {
  return (
    <section className="h-full">
      <div className="flex h-full flex-col rounded-2xl bg-[var(--bg)]/90 px-6 py-8 shadow-xl backdrop-blur-sm sm:px-8 sm:py-10">
        <h2 className="text-center text-2xl font-semibold text-[var(--text)] sm:text-3xl">
          О нас
        </h2>
        <div className="mt-6 flex-1 space-y-4 text-[var(--text-muted)] sm:mt-8 sm:text-lg sm:leading-relaxed">
          <p>
            Мужская парикмахерская — то место, где вы можете отключиться от суеты,
            привести себя в порядок и почувствовать заботу. У нас уютная атмосфера:
            кожаные кресла и разговор по душам за чашкой кофе.
          </p>
          <p>
            Наши мастера не просто делают стрижку — они подбирают образ под ваш
            тип лица и образ жизни. Классика или современный стиль, борода или
            чистое бритьё — поможем выглядеть так, как вы хотите.
          </p>
          <p>
            Приходите отдохнуть, провести хорошо время и выйти из кресла с
            уверенностью в каждом движении.
          </p>
        </div>
      </div>
    </section>
  );
}

'use client'

export function AboutSection() {
	return (
		<section className='h-full'>
			<div className='relative flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--bg)]/55 px-4 py-6 shadow-xl ring-1 ring-white/10 sm:px-8 sm:py-10'>
				<div
					className='pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full blur-3xl'
					style={{
						background:
							'radial-gradient(circle, rgba(201,162,39,0.28) 0%, rgba(201,162,39,0.06) 45%, rgba(0,0,0,0) 70%)',
					}}
					aria-hidden
				/>

				<div className='relative'>
					<div className='text-center'>
						<h2 className='section-title'>О нас</h2>
						<p className='mt-1 text-sm text-white/80 sm:text-base'>
							Мужская парикмахерская с характером и вниманием к деталям.
						</p>
					</div>

					{/* Бейджи не влияют на центрирование заголовка */}
					<div
						className='mt-3 flex flex-wrap items-center justify-center gap-2 sm:absolute sm:right-0 sm:top-0 sm:mt-0 sm:justify-end'
						aria-hidden
					>
						<span className='rounded-full bg-[var(--accent)]/20 px-3 py-1 text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]/35'>
							Казань
						</span>
						<span className='rounded-full bg-[var(--accent)]/20 px-3 py-1 text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]/35'>
							Атмосфера
						</span>
					</div>
				</div>

				<div className='mt-5 space-y-4 text-white/85 sm:mt-6 sm:text-lg sm:leading-relaxed'>
					<p>
						Мужская парикмахерская — это место с индивидуальным подходом к
						личности каждого. Место для отдыха, где можно перевести дух от
						повседневной спешки, привести себя в порядок, услышать приятную
						музыку и хорошо побеседовать. Найдём именно твой образ — со вкусом.
					</p>
					<p>
						Здесь рады каждому, у кого добрые намерения и желание хорошо
						подстричься.
					</p>
				</div>

				<div className='mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3'>
					<div className='rounded-xl bg-[var(--surface)] px-4 py-3'>
						<div className='text-xs text-white/70'>Подход</div>
						<div className='mt-1 text-sm font-semibold text-white'>
							Индивидуально под тебя
						</div>
					</div>
					<div className='rounded-xl bg-[var(--surface)] px-4 py-3'>
						<div className='text-xs text-white/70'>Акцент</div>
						<div className='mt-1 text-sm font-semibold text-white'>
							Чёткие линии и стиль
						</div>
					</div>
					<div className='rounded-xl bg-[var(--surface)] px-4 py-3'>
						<div className='text-xs text-white/70'>Сервис</div>
						<div className='mt-1 text-sm font-semibold text-white'>
							Комфорт + разговор по делу
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

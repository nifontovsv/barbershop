'use client'

const MASTERS = [
	{
		name: 'Владимир',
		specialty: 'Стрижки, бритьё',
		rating: 5,
		badges: ['Классика', 'Бритьё', 'Подбор образа'],
		description:
			'«Радости посещения парикмахера… Такие воспоминания есть у каждого мужчины, кроме тех, кого мамы стригли дома.»\n\nРаботаю по призванию более 14 лет, заинтересованно изучаю ремесло и сегодня. Встречать джентельменов в стенах парикмахерской для меня всегда большое событие — здесь мы говорим на актуальные темы и внимательно относимся к процессу, как и к беседе, разумеется придав ценность времени. Безусловно создаём уникальные образы, подчёркивающие стиль. Всё происходящее здесь для меня — случай, когда работа является увлечением, которое приносит удовольствие. Я люблю мотоциклы, редкие автомобили, достойное кино, музыку, спорт и свою работу.',
	},
	{
		name: 'Марат',
		specialty: 'Мужские стрижки, борода',
		rating: 5,
		badges: ['Чёткий контур', 'Графика', 'Борода'],
		description:
			'Меня зовут Марат. Более 10 лет я работаю руками, которые привыкли к точности. Моя страсть — это техника: будь то мощный мотор под капотом или идеально настроенная машинка для стрижки. Я люблю скорость, но в работе ценю не быстроту ради рекорда, а динамику ради результата. Как в гонках важна каждая деталь подвески, так и в стрижке важен каждый миллиметр. Если тебе нужен чёткий, графичный контур и стиль, в котором чувствуется характер — тебе ко мне. Пристегнись, будет интересно.',
	},
] as const

function Stars({ count }: { count: number }) {
	return (
		<span
			className='flex gap-0.5 text-[var(--accent)]'
			aria-label={`Рейтинг: ${count} из 5`}
		>
			{Array.from({ length: count }, (_, i) => (
				<span key={i} className='text-sm sm:text-base'>
					★
				</span>
			))}
		</span>
	)
}

export function MastersSection() {
	return (
		<section className='h-full'>
			<div className='relative flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--bg)]/55 px-4 py-6 shadow-xl ring-1 ring-white/10 sm:px-8 sm:py-10'>
				<div
					className='pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full blur-3xl'
					style={{
						background:
							'radial-gradient(circle, rgba(201,162,39,0.22) 0%, rgba(201,162,39,0.05) 45%, rgba(0,0,0,0) 70%)',
					}}
					aria-hidden
				/>

				<div className='flex flex-col items-center justify-between gap-3'>
					<div className='text-center'>
						<h2 className='section-title'>Наши мастера</h2>
						<p className='mt-1 text-sm text-white/80 sm:text-base'>
							Настроим стиль по форме лица, характеру и ритму жизни.
						</p>
					</div>
				</div>
				<ul className='mt-6 flex-1 space-y-6 sm:mt-8'>
					{MASTERS.map((master) => (
						<li key={master.name}>
							<div className='group relative overflow-hidden rounded-2xl bg-[var(--surface)] p-3 shadow-lg ring-1 ring-white/5 transition-colors hover:ring-white/10 sm:p-5'>
								{/* Верхняя строка: имя/рейтинг слева, бейджи справа (без перекрытия текста) */}
								<div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
									<div className='min-w-0'>
										<div className='flex flex-wrap items-center gap-2'>
											<span className='text-lg font-semibold text-[var(--text)] sm:text-xl'>
												{master.name}
											</span>
											<Stars count={master.rating} />
										</div>
										<p className='mt-0.5 text-sm text-white/80'>{master.specialty}</p>
									</div>

									<div className='flex flex-wrap items-center gap-2 sm:justify-end'>
										{master.badges.map((b) => (
											<span
												key={b}
												className='rounded-full bg-[var(--accent)]/20 px-3 py-1 text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]/35'
											>
												{b}
											</span>
										))}
									</div>
								</div>

								{/* Контент: фото слева, описание справа, выровнены по верхнему краю */}
								<div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[220px_1fr] sm:items-start'>
									<div>
										<div className='overflow-hidden rounded-xl bg-black/20 ring-1 ring-white/10'>
											<div className='relative aspect-[3/4] w-full'>
												<div
													className='absolute inset-0'
													style={{
														background:
															'linear-gradient(135deg, rgba(201,162,39,0.22) 0%, rgba(255,255,255,0.06) 38%, rgba(0,0,0,0.2) 100%)',
													}}
													aria-hidden
												/>
												<div className='absolute inset-0 flex items-center justify-center px-3 text-center text-xs font-medium text-white/70'>
													Фото скоро
												</div>
											</div>
										</div>
									</div>

									<div className='min-w-0'>
										<p className='whitespace-pre-line text-sm leading-relaxed text-white/85 sm:text-base'>
											{master.description}
										</p>
									</div>
								</div>
							</div>
						</li>
					))}
				</ul>
			</div>
		</section>
	)
}

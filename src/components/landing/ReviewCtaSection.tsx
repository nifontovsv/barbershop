'use client'

const URL_2GIS = 'https://2gis.ru/kazan/firm/70000001095119622'
const URL_YANDEX_MAPS =
	'https://yandex.ru/maps/org/muzhskaya_parikmakherskaya/74689483204/?ll=49.184657%2C55.778892&z=17'

export function ReviewCtaSection() {
	return (
		<section>
			<div className='rounded-2xl bg-[var(--bg)]/55 px-4 py-5 shadow-xl sm:px-8 sm:py-7'>
				<h2 className='text-center text-lg font-semibold text-[var(--text)] sm:text-xl'>
					Понравились наши услуги? Оставьте отзыв на 2ГИС и Яндекс.Картах
				</h2>
				<div className='mt-4 flex flex-wrap items-center justify-center gap-4'>
					<a
						href={URL_2GIS}
						target='_blank'
						rel='noopener noreferrer'
						className='rounded-xl bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--accent)] hover:text-black sm:text-base'
						title='Открыть в 2ГИС'
					>
						2ГИС
					</a>
					<a
						href={URL_YANDEX_MAPS}
						target='_blank'
						rel='noopener noreferrer'
						className='rounded-xl bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--accent)] hover:text-black sm:text-base'
						title='Открыть в Яндекс.Картах'
					>
						Яндекс.Карты
					</a>
				</div>
			</div>
		</section>
	)
}

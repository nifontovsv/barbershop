'use client'

import { useState } from 'react'

const ADDRESS = 'ул. Мансура Хасанова, 15, Казань'
const YANDEX_MAPS_PAGE_URL =
	'https://yandex.ru/maps/org/muzhskaya_parikmakherskaya/74689483204/?ll=49.184618%2C55.778553&z=18'

const YANDEX_MAPS_EMBED_URL =
	'https://yandex.ru/map-widget/v1/?ll=49.18451%2C55.77860&z=18&pt=49.18451%2C55.77860%2Cpm2rdm'

export function MapSection() {
	const [mapInteractive, setMapInteractive] = useState(false)

	return (
		<section
			aria-label='Карта и адрес'
			className='relative left-1/2 right-1/2 -mx-[50vw] w-screen border-y border-[var(--surface)] bg-transparent'
		>
			<div className='container-landing py-6 sm:py-10'>
				<div className='mx-auto max-w-5xl'>
					<div className='flex flex-col items-center justify-between gap-4 rounded-2xl bg-[var(--bg)]/55 px-4 py-5 shadow-xl sm:flex-row sm:px-8'>
						<div className='text-center sm:text-left'>
							<h2 className='text-xl font-semibold text-[var(--text)] sm:text-2xl'>
								Где мы находимся
							</h2>
							<p className='mt-1 text-sm text-[var(--text-muted)] sm:text-base'>
								{ADDRESS}
							</p>
						</div>
						<a
							href={YANDEX_MAPS_PAGE_URL}
							target='_blank'
							rel='noopener noreferrer'
							className='rounded-xl bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--accent)] hover:text-black sm:text-base'
							title='Открыть в Яндекс.Картах'
						>
							Открыть в Яндекс.Картах
						</a>
					</div>

					<div className='mt-6 overflow-hidden rounded-2xl bg-[var(--surface)] shadow-xl'>
						<div
							className='relative aspect-[16/10] w-full sm:aspect-[21/9]'
							onMouseLeave={() => setMapInteractive(false)}
						>
							<iframe
								src={YANDEX_MAPS_EMBED_URL}
								title={`Карта: ${ADDRESS}`}
								className='absolute inset-0 h-full w-full'
								loading='lazy'
								referrerPolicy='no-referrer-when-downgrade'
								allowFullScreen
								style={{ pointerEvents: mapInteractive ? 'auto' : 'none' }}
							/>
							{!mapInteractive && (
								<button
									type='button'
									onClick={() => setMapInteractive(true)}
									className='absolute inset-0 flex cursor-pointer items-end justify-center bg-black/0 pb-3 text-xs font-medium text-white/90 transition hover:bg-black/10 sm:pb-4 sm:text-sm'
									aria-label='Включить управление картой'
								>
									<span className='rounded-full bg-black/40 px-3 py-2 backdrop-blur-sm'>
										Нажмите, чтобы включить карту
									</span>
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback, useRef } from 'react'
import { asset } from '@/lib/basePath'

const SLIDES = Array.from({ length: 13 }, (_, i) => i + 1)
const INTERVAL_MS = 5000
const SWIPE_THRESHOLD = 50

export function BarbershopSlider() {
	const [index, setIndex] = useState(0)
	const touchStartX = useRef<number | null>(null)

	const goTo = useCallback((i: number) => {
		const next =
			i < 0 ? SLIDES.length - 1
			: i >= SLIDES.length ? 0
			: i
		setIndex(next)
	}, [])

	useEffect(() => {
		const id = setInterval(() => goTo(index + 1), INTERVAL_MS)
		return () => clearInterval(id)
	}, [index, goTo])

	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		touchStartX.current = e.touches[0].clientX
	}, [])

	const handleTouchEnd = useCallback((e: React.TouchEvent) => {
		if (touchStartX.current === null) return
		const endX = e.changedTouches[0].clientX
		const delta = touchStartX.current - endX
		touchStartX.current = null
		if (Math.abs(delta) < SWIPE_THRESHOLD) return
		if (delta > 0) goTo(index + 1)
		else goTo(index - 1)
	}, [index, goTo])

	return (
		<section>
			<div className='relative w-full overflow-hidden rounded-2xl bg-[var(--surface)] shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:rounded-3xl'>
				<div
					className='relative aspect-[16/10] w-full sm:aspect-[21/9]'
					onTouchStart={handleTouchStart}
					onTouchEnd={handleTouchEnd}
				>
					{(() => {
						const n = SLIDES[index] ?? SLIDES[0]
						const src = asset(`/images/barbershop/${n}.jpg`)
						return (
							<div
								key={n}
								className='absolute inset-0 opacity-100 transition-opacity duration-500 ease-out'
							>
								<Image
									src={src}
									alt={`Парикмахерская — фото ${n}`}
									fill
									className='object-cover scale-110 blur-xl brightness-90'
									sizes='(max-width: 640px) 100vw, (max-width: 1536px) 100vw, 1344px'
									quality={85}
									unoptimized
									priority={n === 1}
								/>
								<Image
									src={src}
									alt={`Парикмахерская — фото ${n}`}
									fill
									className='object-contain'
									sizes='(max-width: 640px) 100vw, (max-width: 1536px) 100vw, 1344px'
									quality={95}
									unoptimized
									priority={n === 1}
								/>
							</div>
						)
					})()}
				</div>
				{/* Стрелки — только на десктопе */}
				<button
					type='button'
					onClick={() => goTo(index - 1)}
					className='absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 sm:flex md:left-4 md:h-12 md:w-12'
					aria-label='Предыдущий слайд'
				>
					<svg
						className='h-5 w-5 md:h-6 md:w-6'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M15 19l-7-7 7-7'
						/>
					</svg>
				</button>
				<button
					type='button'
					onClick={() => goTo(index + 1)}
					className='absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 sm:flex md:right-4 md:h-12 md:w-12'
					aria-label='Следующий слайд'
				>
					<svg
						className='h-5 w-5 md:h-6 md:w-6'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M9 5l7 7-7 7'
						/>
					</svg>
				</button>
				{/* Индикатор — компактнее на мобилке */}
				<div className='absolute bottom-3 left-0 right-0 z-10 flex justify-center sm:bottom-4'>
					<div className='rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm sm:px-3 sm:py-2'>
						<div className='flex items-center gap-1 sm:gap-1.5'>
							{SLIDES.map((_, i) => (
								<button
									key={i}
									type='button'
									onClick={() => setIndex(i)}
									className={`cursor-pointer rounded-full transition-all ${
										i === index
											? 'h-1.5 w-4 bg-[var(--accent)] sm:h-2 sm:w-6'
											: 'h-1.5 w-1.5 bg-white/60 hover:bg-white/90 sm:h-2 sm:w-2'
									}`}
									aria-label={`Слайд ${i + 1}`}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

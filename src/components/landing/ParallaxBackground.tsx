'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { asset } from '@/lib/basePath'

gsap.registerPlugin(ScrollTrigger)

// Фон: фото (параллакс только на десктопе — на мобилке прыгает)
const BG_IMAGE = '/images/parallax/parallax-bikes.jpg'

export function ParallaxBackground() {
	const layerRef = useRef<HTMLDivElement>(null)
	const wrapRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const layer = layerRef.current
		const wrap = wrapRef.current
		if (!layer || !wrap) return

		const ctx = gsap.context(() => {
			ScrollTrigger.matchMedia({
				'(min-width: 768px)': () => {
					gsap.to(layer, {
						yPercent: -18,
						ease: 'none',
						scrollTrigger: {
							trigger: document.body,
							start: 'top top',
							end: 'bottom bottom',
							scrub: 1.2,
						},
					})
				},
				'(max-width: 767px)': () => {},
			})
		}, wrap)

		return () => ctx.revert()
	}, [])

	return (
		<div
			ref={wrapRef}
			className='pointer-events-none fixed inset-0 -z-10 overflow-hidden'
			aria-hidden
		>
			<div
				ref={layerRef}
				className='absolute left-0 right-0 top-[4%] bottom-[-6%] bg-cover bg-center bg-no-repeat'
				style={{
					backgroundImage: `url(${asset(BG_IMAGE)})`,
				}}
			/>
			{/* Лёгкий оверлей: мотоциклы видны, общий тон в духе #121212 */}
			<div
				className='absolute inset-0'
				style={{
					background:
						'linear-gradient(180deg, rgba(18,18,18,0.52) 0%, rgba(18,18,18,0.62) 50%, rgba(18,18,18,0.68) 100%)',
				}}
			/>
		</div>
	)
}

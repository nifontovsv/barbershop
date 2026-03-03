'use client'

import { useState, useMemo } from 'react'
import type { TimeSlot } from '@/types/booking'

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTH_NAMES = [
	'Январь',
	'Февраль',
	'Март',
	'Апрель',
	'Май',
	'Июнь',
	'Июль',
	'Август',
	'Сентябрь',
	'Октябрь',
	'Ноябрь',
	'Декабрь',
]

interface DateSlotStepProps {
	slots: TimeSlot[]
	selectedSlotId: string | null
	onSelectSlot: (slot: TimeSlot) => void
	selectedDate: string | null
	onSelectDate: (dateStr: string) => void
	loading: boolean
}

function toDateStr(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

function getCalendarDays(year: number, month: number): (number | null)[] {
	const first = new Date(year, month, 1)
	const last = new Date(year, month + 1, 0)
	const startWeekday = first.getDay()
	const startOffset = startWeekday === 0 ? 6 : startWeekday - 1
	const daysInMonth = last.getDate()
	const result: (number | null)[] = []
	for (let i = 0; i < startOffset; i++) result.push(null)
	for (let d = 1; d <= daysInMonth; d++) result.push(d)
	const total = result.length
	const remainder = total % 7
	if (remainder) for (let i = 0; i < 7 - remainder; i++) result.push(null)
	return result
}

export function DateSlotStep({
	slots,
	selectedSlotId,
	onSelectSlot,
	selectedDate,
	onSelectDate,
	loading,
}: DateSlotStepProps) {
	const today = useMemo(() => new Date(), [])
	const todayStr = toDateStr(today)

	const [viewDate, setViewDate] = useState(() => {
		const d = new Date()
		d.setDate(1)
		return d
	})
	const viewYear = viewDate.getFullYear()
	const viewMonth = viewDate.getMonth()

	const calendarDays = useMemo(
		() => getCalendarDays(viewYear, viewMonth),
		[viewYear, viewMonth]
	)

	const prevMonth = () => {
		setViewDate((d) => {
			const next = new Date(d)
			next.setMonth(next.getMonth() - 1)
			next.setDate(1)
			return next
		})
	}

	const nextMonth = () => {
		setViewDate((d) => {
			const next = new Date(d)
			next.setMonth(next.getMonth() + 1)
			next.setDate(1)
			return next
		})
	}

	const isPast = (day: number) => {
		const d = new Date(viewYear, viewMonth, day)
		return d < today || toDateStr(d) < todayStr
	}

	const isWeekend = (day: number) => {
		const d = new Date(viewYear, viewMonth, day)
		const w = d.getDay()
		return w === 0 || w === 6
	}

	const handleSelectDay = (day: number) => {
		const dateStr = toDateStr(new Date(viewYear, viewMonth, day))
		if (isPast(day)) return
		onSelectDate(dateStr)
	}

	return (
		<div className='space-y-4'>
			<h3 className='text-lg font-semibold text-[var(--text)]'>Дата и время</h3>

			<div className='rounded-xl border border-[var(--surface)] bg-[var(--surface)] p-3'>
				<div className='mb-3 flex items-center justify-between'>
					<button
						type='button'
						onClick={prevMonth}
						className='cursor-pointer rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)]/50 hover:text-[var(--text)]'
						aria-label='Предыдущий месяц'
					>
						<svg
							width='20'
							height='20'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
						>
							<path
								d='M15 18l-6-6 6-6'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
					</button>
					<span className='text-sm font-medium text-[var(--text)]'>
						{MONTH_NAMES[viewMonth]} {viewYear}
					</span>
					<button
						type='button'
						onClick={nextMonth}
						className='cursor-pointer rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)]/50 hover:text-[var(--text)]'
						aria-label='Следующий месяц'
					>
						<svg
							width='20'
							height='20'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
						>
							<path
								d='M9 18l6-6-6-6'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
					</button>
				</div>

				<div className='grid grid-cols-7 gap-1'>
					{WEEKDAY_NAMES.map((name) => (
						<div
							key={name}
							className='py-1 text-center text-xs font-medium text-[var(--text-muted)]'
						>
							{name}
						</div>
					))}
					{calendarDays.map((day, i) => {
						if (day === null) {
							return <div key={`empty-${i}`} />
						}
						const dateStr = toDateStr(new Date(viewYear, viewMonth, day))
						const selected = selectedDate === dateStr
						const past = isPast(day)
						const weekend = isWeekend(day)
						const disabled = past
						return (
							<button
								key={`${viewYear}-${viewMonth}-${day}`}
								type='button'
								disabled={disabled}
								onClick={() => handleSelectDay(day)}
								className={`aspect-square cursor-pointer rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
									selected ? 'bg-[var(--accent)] font-semibold text-black'
									: disabled ? 'text-[var(--text-muted)]'
									: weekend ? 'text-[var(--text-muted)] hover:bg-[var(--bg)]/30'
									: 'text-[var(--text)] hover:bg-[var(--accent)]/20'
								}`}
							>
								{day}
							</button>
						)
					})}
				</div>
			</div>

			{selectedDate && (
				<div>
					<p className='mb-2 text-sm text-[var(--text-muted)]'>Время</p>
					{loading ?
						<p className='text-sm text-[var(--text-muted)]'>Загрузка…</p>
					:	<div className='flex flex-wrap gap-2'>
							{slots.map((slot) => (
								<button
									key={slot.id}
									type='button'
									disabled={!slot.available}
									onClick={() => slot.available && onSelectSlot(slot)}
									className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
										selectedSlotId === slot.id ? 'bg-[var(--accent)] text-black'
										: slot.available ?
											'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent)]/20'
										:	'bg-[var(--surface)]/60 text-[var(--text-muted)]'
									}`}
								>
									{new Date(slot.start).toLocaleTimeString('ru-RU', {
										hour: '2-digit',
										minute: '2-digit',
										timeZone: 'Europe/Moscow',
									})}
								</button>
							))}
						</div>
					}
				</div>
			)}
		</div>
	)
}

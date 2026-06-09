import {
	defaultSalonHours,
	salonHourOptionsFrom,
	type SalonHoursConfig,
} from '@/lib/salonHours'

export const SCHEDULE_HOUR_HEIGHT_PX = 72
export const SCHEDULE_TIME_GUTTER_PX = 56
export const SCHEDULE_HEADER_HEIGHT_PX = 44
export const SCHEDULE_MIN_COL_WIDTH_PX = 200
/** Вертикальные отступы сетки — чтобы метки на границах часов не обрезались */
export const SCHEDULE_GRID_PAD_Y_PX = 12

const defaultHours = defaultSalonHours()

export function scheduleStartMinutes(config: SalonHoursConfig): number {
	return config.startHour * 60
}

export function scheduleEndMinutes(config: SalonHoursConfig): number {
	return config.endHourExclusive * 60
}

export function scheduleTotalMinutes(config: SalonHoursConfig): number {
	return scheduleEndMinutes(config) - scheduleStartMinutes(config)
}

/** @deprecated используйте scheduleBodyHeightPx(config) */
export const SCHEDULE_START_MINUTES = defaultHours.startHour * 60
/** @deprecated используйте scheduleBodyHeightPx(config) */
export const SCHEDULE_END_MINUTES = defaultHours.endHourExclusive * 60
/** @deprecated используйте scheduleBodyHeightPx(config) */
export const SCHEDULE_TOTAL_MINUTES =
	SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES
/** @deprecated используйте scheduleBodyHeightPx(config) */
export const SCHEDULE_GRID_HEIGHT_PX =
	(SCHEDULE_TOTAL_MINUTES / 60) * SCHEDULE_HOUR_HEIGHT_PX

export function scheduleHourLabels(config?: SalonHoursConfig): number[] {
	return salonHourOptionsFrom(config ?? defaultSalonHours())
}

export function todayYmd(): string {
	const d = new Date()
	return toYmd(d)
}

export function toYmd(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

export function addDaysYmd(ymd: string, delta: number): string {
	const [y, m, d] = ymd.split('-').map(Number)
	const date = new Date(y, m - 1, d)
	date.setDate(date.getDate() + delta)
	return toYmd(date)
}

export function slotStartLocalYmd(iso: string): string {
	try {
		return toYmd(new Date(iso))
	} catch {
		return ''
	}
}

export function isoToLocalMinutes(iso: string): number {
	const d = new Date(iso)
	return d.getHours() * 60 + d.getMinutes()
}

export function scheduleSlotsHeightPx(
	config: SalonHoursConfig,
	hourHeightPx = SCHEDULE_HOUR_HEIGHT_PX
): number {
	return (scheduleTotalMinutes(config) / 60) * hourHeightPx
}

export function hourBoundaryTopPx(
	slotIndex: number,
	hourHeightPx: number
): number {
	return SCHEDULE_GRID_PAD_Y_PX + slotIndex * hourHeightPx
}

export function minutesToTopPx(
	minutes: number,
	config: SalonHoursConfig,
	hourHeightPx = SCHEDULE_HOUR_HEIGHT_PX
): number {
	const rel = minutes - scheduleStartMinutes(config)
	return SCHEDULE_GRID_PAD_Y_PX + (rel / 60) * hourHeightPx
}

export function scheduleBodyHeightPx(
	config: SalonHoursConfig,
	hourHeightPx = SCHEDULE_HOUR_HEIGHT_PX
): number {
	return (
		scheduleSlotsHeightPx(config, hourHeightPx) + 2 * SCHEDULE_GRID_PAD_Y_PX
	)
}

export interface ScheduleOverlapItem {
	id: string
	slotStart: string
	slotEnd: string
}

export interface ScheduleOverlapLayout {
	column: number
	columns: number
}

function scheduleItemStartMs(iso: string): number {
	return new Date(iso).getTime()
}

function scheduleItemEndMs(iso: string): number {
	return new Date(iso).getTime()
}

function scheduleItemsOverlap(
	a: ScheduleOverlapItem,
	b: ScheduleOverlapItem
): boolean {
	return (
		scheduleItemStartMs(a.slotStart) < scheduleItemEndMs(b.slotEnd) &&
		scheduleItemEndMs(a.slotStart) > scheduleItemStartMs(b.slotStart)
	)
}

/** Раскладка пересекающихся записей и перерывов в одной колонке мастера (как в календаре). */
export function computeOverlapLayouts(
	items: ScheduleOverlapItem[]
): Map<string, ScheduleOverlapLayout> {
	const result = new Map<string, ScheduleOverlapLayout>()
	if (items.length === 0) return result

	const sorted = [...items].sort(
		(a, b) =>
			scheduleItemStartMs(a.slotStart) - scheduleItemStartMs(b.slotStart)
	)

	let clusters: ScheduleOverlapItem[][] = sorted.map((item) => [item])
	let merged = true
	while (merged) {
		merged = false
		const next: ScheduleOverlapItem[][] = []
		for (const cluster of clusters) {
			let absorbed = false
			for (const existing of next) {
				if (
					cluster.some((c) => existing.some((e) => scheduleItemsOverlap(c, e)))
				) {
					existing.push(...cluster)
					absorbed = true
					merged = true
					break
				}
			}
			if (!absorbed) next.push(cluster)
		}
		clusters = next
	}

	for (const cluster of clusters) {
		if (cluster.length === 1) {
			result.set(cluster[0].id, { column: 0, columns: 1 })
			continue
		}

		const columns: ScheduleOverlapItem[][] = []
		const ordered = [...cluster].sort(
			(a, b) =>
				scheduleItemStartMs(a.slotStart) - scheduleItemStartMs(b.slotStart)
		)

		for (const item of ordered) {
			let col = 0
			while (true) {
				const colItems = columns[col] ?? []
				if (!colItems.some((other) => scheduleItemsOverlap(item, other))) {
					if (!columns[col]) columns[col] = []
					columns[col].push(item)
					result.set(item.id, { column: col, columns: 0 })
					break
				}
				col++
			}
		}

		const totalCols = columns.length
		for (const item of cluster) {
			const layout = result.get(item.id)
			if (layout) layout.columns = totalCols
		}
	}

	return result
}

export function columnHorizontalStyle(
	layout: ScheduleOverlapLayout,
	gapPx = 4
): { left: number | string; right: number | string; width?: string } {
	if (layout.columns <= 1) {
		return { left: gapPx, right: gapPx }
	}
	const unit = 100 / layout.columns
	return {
		left: `calc(${layout.column * unit}% + ${gapPx / 2}px)`,
		width: `calc(${unit}% - ${gapPx}px)`,
		right: 'auto',
	}
}

/** Минимальная высота полоски перерыва, чтобы текст и иконка читались. */
export const BREAK_MIN_RENDER_PX = 28

export interface ScheduleBlockLayout {
	top: number
	height: number
}

/** Перерыв сверху, запись снизу; общий блок выше слота при необходимости. */
export function computeBreakBookingVerticalLayouts(
	bookings: ScheduleOverlapItem[],
	breaks: ScheduleOverlapItem[],
	config: SalonHoursConfig,
	hourHeightPx = SCHEDULE_HOUR_HEIGHT_PX,
	gapPx = 4
): Map<string, ScheduleBlockLayout> {
	const result = new Map<string, ScheduleBlockLayout>()
	const inset = gapPx / 2

	const breaksByBooking = new Map<string, ScheduleOverlapItem[]>()

	for (const br of breaks) {
		const overlappingBookings = bookings
			.filter((b) => scheduleItemsOverlap(b, br))
			.sort(
				(a, b) =>
					scheduleItemStartMs(a.slotStart) - scheduleItemStartMs(b.slotStart)
			)

		if (overlappingBookings.length === 0) {
			const natural = bookingBlockLayout(
				br.slotStart,
				br.slotEnd,
				config,
				hourHeightPx
			)
			const renderH = Math.max(BREAK_MIN_RENDER_PX, natural.height)
			result.set(br.id, {
				top: natural.top + inset,
				height: Math.max(renderH - gapPx, 12),
			})
			continue
		}

		const booking = overlappingBookings[0]
		const list = breaksByBooking.get(booking.id) ?? []
		list.push(br)
		breaksByBooking.set(booking.id, list)
	}

	for (const b of bookings) {
		const natural = bookingBlockLayout(
			b.slotStart,
			b.slotEnd,
			config,
			hourHeightPx
		)
		const relatedBreaks = (breaksByBooking.get(b.id) ?? []).sort(
			(a, br) =>
				scheduleItemStartMs(a.slotStart) - scheduleItemStartMs(br.slotStart)
		)

		if (relatedBreaks.length === 0) {
			result.set(b.id, {
				top: natural.top + inset,
				height: Math.max(natural.height - gapPx, 14),
			})
			continue
		}

		let cursorTop = natural.top + inset

		for (const br of relatedBreaks) {
			const brNatural = bookingBlockLayout(
				br.slotStart,
				br.slotEnd,
				config,
				hourHeightPx
			)
			const renderH = Math.max(BREAK_MIN_RENDER_PX, brNatural.height)
			result.set(br.id, {
				top: cursorTop,
				height: Math.max(renderH - inset, 12),
			})
			cursorTop += renderH
		}

		const lastBreak = relatedBreaks[relatedBreaks.length - 1]
		const bookingStartMs = scheduleItemStartMs(b.slotStart)
		const bookingEndMs = scheduleItemEndMs(b.slotEnd)
		const afterBreakMs = Math.max(
			scheduleItemEndMs(lastBreak.slotEnd),
			bookingStartMs
		)
		const remainingMin = (bookingEndMs - afterBreakMs) / 60_000
		const bookingHeight = Math.max(
			(remainingMin / 60) * hourHeightPx - inset,
			20
		)

		result.set(b.id, { top: cursorTop + inset, height: bookingHeight })
	}

	return result
}

export function bookingBlockLayout(
	slotStart: string,
	slotEnd: string,
	config: SalonHoursConfig,
	hourHeightPx = SCHEDULE_HOUR_HEIGHT_PX
): { top: number; height: number } {
	const startMin = isoToLocalMinutes(slotStart)
	const endMin = isoToLocalMinutes(slotEnd)
	const top = minutesToTopPx(startMin, config, hourHeightPx)
	const gridHeight = scheduleBodyHeightPx(config, hourHeightPx)
	const rawHeight =
		((Math.max(endMin, startMin + 15) - startMin) / 60) * hourHeightPx
	const maxBottom = gridHeight - top
	return {
		top: Math.max(0, top),
		height: Math.min(Math.max(rawHeight, 16), maxBottom),
	}
}

export function formatScheduleNavDate(ymd: string): string {
	const [y, m, d] = ymd.split('-').map(Number)
	const date = new Date(y, m - 1, d)
	const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short' })
	const rest = date.toLocaleDateString('ru-RU', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})
	return `${weekday}, ${rest}`
}

export function formatTimeShort(d: Date): string {
	return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatSlotRange(slotStart: string, slotEnd: string): string {
	try {
		const start = new Date(slotStart)
		const end = new Date(slotEnd)
		const datePart = start.toLocaleDateString('ru-RU', {
			day: 'numeric',
			month: 'short',
		})
		const timeFmt: Intl.DateTimeFormatOptions = {
			hour: '2-digit',
			minute: '2-digit',
		}
		return `${datePart}, ${start.toLocaleTimeString('ru-RU', timeFmt)} – ${end.toLocaleTimeString('ru-RU', timeFmt)}`
	} catch {
		return slotStart
	}
}

export function formatTimeRangeShort(
	slotStart: string,
	slotEnd: string
): string {
	try {
		const start = new Date(slotStart)
		const end = new Date(slotEnd)
		const timeFmt: Intl.DateTimeFormatOptions = {
			hour: '2-digit',
			minute: '2-digit',
		}
		return `${start.toLocaleTimeString('ru-RU', timeFmt)} – ${end.toLocaleTimeString('ru-RU', timeFmt)}`
	} catch {
		return ''
	}
}

export function isoToTimeInputValue(iso: string): string {
	try {
		const d = new Date(iso)
		const h = String(d.getHours()).padStart(2, '0')
		const m = String(d.getMinutes()).padStart(2, '0')
		return `${h}:${m}`
	} catch {
		return '12:00'
	}
}

export function bookingDurationMinutes(
	slotStart: string,
	slotEnd: string
): number {
	try {
		const ms = new Date(slotEnd).getTime() - new Date(slotStart).getTime()
		return Math.max(15, Math.round(ms / 60_000))
	} catch {
		return 60
	}
}

export type BookingStatusTone =
	| 'pending'
	| 'confirmed'
	| 'cancelled'
	| 'done'
	| 'default'

export function bookingStatusTone(status: string): BookingStatusTone {
	if (
		status === 'pending' ||
		status === 'confirmed' ||
		status === 'cancelled' ||
		status === 'done'
	) {
		return status
	}
	return 'default'
}

export function bookingBlockClass(status: string): string {
	switch (bookingStatusTone(status)) {
		case 'pending':
			return 'border-amber-300/40 bg-amber-400/85 text-amber-950'
		case 'confirmed':
			return 'border-emerald-300/40 bg-emerald-500/85 text-emerald-950'
		case 'cancelled':
			return 'border-zinc-400/25 bg-zinc-600/55 text-zinc-200 line-through opacity-75'
		case 'done':
			return 'border-sky-300/35 bg-sky-600/80 text-sky-50'
		default:
			return 'border-white/20 bg-[var(--surface)] text-white/90'
	}
}

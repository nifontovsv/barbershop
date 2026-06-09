'use client'

import { bookingStatusTone, formatTimeRangeShort } from '@/lib/scheduleLayout'
import {
	BOOKING_STATUS_THEMES,
	bookingStatusLabel,
} from '@/lib/bookingStatusTheme'
import type { ScheduleBooking } from '@/components/admin/ScheduleDayView'

/** Зазор между соседними записями в колонке */
export const BOOKING_CELL_GAP_PX = 4

const NEW_BOOKING_MS = 24 * 60 * 60 * 1000

function isBookingNew(createdAt?: string): boolean {
	if (!createdAt) return false
	const ts = new Date(createdAt).getTime()
	if (Number.isNaN(ts)) return false
	return Date.now() - ts < NEW_BOOKING_MS
}

function formatPhoneShort(phone: string): string {
	const digits = phone.replace(/\D/g, '')
	const d = digits.length >= 11 ? digits.slice(-11) : digits
	if (d.length === 11) {
		return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`
	}
	if (d.length === 10) {
		return `+7 ${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`
	}
	return d.length > 7 ? `${d.slice(0, 7)}…` : phone
}

interface BookingGridCardProps {
	booking: ScheduleBooking
	selected: boolean
	height: number
	style: React.CSSProperties
	onClick?: (e: React.MouseEvent) => void
	hidePhone?: boolean
	readOnly?: boolean
}

export function BookingGridCard({
	booking,
	selected,
	height,
	style,
	onClick,
	hidePhone = false,
	readOnly = false,
}: BookingGridCardProps) {
	const theme = BOOKING_STATUS_THEMES[bookingStatusTone(booking.status)]
	const time = formatTimeRangeShort(booking.slotStart, booking.slotEnd)
	const isNew = isBookingNew(booking.createdAt)

	const showName = height >= 18
	const showService = height >= 40
	const showPhone = !hidePhone && height >= 28 && !!booking.clientPhone
	const showStatus = height >= 28

	const timeClass =
		height >= 52 ? 'text-[12px] leading-tight' : 'text-[11px] leading-tight'
	const nameClass =
		height >= 52 ? 'text-[14px] leading-tight' : 'text-[12px] leading-tight'
	const serviceClass =
		height >= 52 ? 'text-[11px] leading-tight' : 'text-[10px] leading-tight'
	const phoneClass =
		height >= 52 ? 'text-[11px] leading-tight' : 'text-[10px] leading-tight'

	const statusClass =
		height >= 52 ?
			'px-2 py-0.5 text-[12px] leading-tight'
		:	'px-1.5 py-px text-[10px] leading-tight'

	const lineClass = 'block min-w-0 shrink-0 truncate'

	const interactive = !readOnly && !!onClick

	return (
		<button
			type='button'
			onClick={interactive ? onClick : undefined}
			disabled={!interactive}
			tabIndex={interactive ? 0 : -1}
			className={`absolute z-5 box-border flex min-h-0 overflow-hidden rounded-[7px] text-left shadow-[0_2px_8px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] ${theme.card} ${
				interactive ?
					'cursor-pointer transition hover:brightness-[1.06] active:brightness-[0.98]'
				:	'cursor-default'
			} ${selected ? 'z-10 outline outline-2 -outline-offset-2 outline-white/90' : ''}`}
			style={style}
		>
			<span
				className={`w-1 shrink-0 self-stretch ${theme.accent}`}
				aria-hidden
			/>

			<span className='relative box-border h-full min-h-0 min-w-0 flex-1'>
				{isNew ?
					<span className='absolute top-1 right-1 z-20 rounded bg-rose-600 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-white shadow-sm'>
						new
					</span>
				:	null}

				<span
					className={`flex h-full min-h-0 flex-col justify-between overflow-hidden py-1 pl-2 ${
						isNew ? 'pr-7' : 'pr-1'
					} ${showStatus ? 'pb-0' : 'pb-1'}`}
				>
					<span
						className={`${lineClass} font-semibold tabular-nums ${timeClass} ${theme.sub}`}
					>
						{time}
					</span>

					{showName ?
						<span
							className={`${lineClass} font-bold ${nameClass} ${theme.text}`}
						>
							{booking.clientName}
						</span>
					:	null}

					{showService ?
						<span
							className={`${lineClass} font-semibold ${serviceClass} ${theme.sub}`}
						>
							{booking.serviceName}
						</span>
					:	null}

					{showPhone ?
						<span
							className={`${lineClass} font-medium tabular-nums ${phoneClass} ${theme.sub} ${
								showStatus ? 'pr-[42%]' : ''
							}`}
						>
							{formatPhoneShort(booking.clientPhone)}
						</span>
					:	null}
				</span>

				{showStatus ?
					<span
						className={`absolute right-0 bottom-0 z-10 max-w-[62%] truncate rounded-tl-md font-bold ${statusClass} ${theme.statusBadge}`}
					>
						{bookingStatusLabel(booking.status)}
					</span>
				:	null}
			</span>
		</button>
	)
}

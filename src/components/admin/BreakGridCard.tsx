'use client'

import { formatBreakDuration } from '@/lib/masterBreak'
import { formatTimeRangeShort } from '@/lib/scheduleLayout'
import type { ScheduleBreak } from '@/components/admin/ScheduleDayView'

interface BreakGridCardProps {
	breakRow: ScheduleBreak
	selected: boolean
	style: React.CSSProperties
	onClick?: (e: React.MouseEvent) => void
	readOnly?: boolean
}

export function BreakGridCard({
	breakRow,
	selected,
	style,
	onClick,
	readOnly = false,
}: BreakGridCardProps) {
	const time = formatTimeRangeShort(breakRow.slotStart, breakRow.slotEnd)
	const duration = formatBreakDuration(breakRow.durationMinutes)
	const interactive = !readOnly && !!onClick

	return (
		<button
			type='button'
			onClick={interactive ? onClick : undefined}
			disabled={!interactive}
			tabIndex={interactive ? 0 : -1}
			className={`absolute z-6 box-border flex min-h-0 items-center gap-1.5 overflow-hidden rounded-[7px] border border-violet-400/30 bg-linear-to-r from-violet-900/90 via-violet-800/85 to-violet-700/80 px-2 py-1 text-left text-violet-50 shadow-[0_2px_8px_rgba(0,0,0,0.28)] ${
				interactive ?
					'cursor-pointer transition hover:brightness-110 active:brightness-95'
				:	'cursor-default'
			} ${selected ? 'z-10 outline outline-2 -outline-offset-2 outline-violet-200/90' : ''}`}
			style={style}
			title={`Технический перерыв · ${duration}`}
		>
			<span className='shrink-0 text-sm leading-none' aria-hidden>
				⏰
			</span>
			<span className='min-w-0 flex-1 truncate'>
				<span className='block text-[10px] font-medium leading-tight text-violet-200/90 tabular-nums'>
					{time}
				</span>
				<span className='block truncate text-[11px] font-bold leading-tight'>
					{duration}
				</span>
			</span>
		</button>
	)
}

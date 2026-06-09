'use client'

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	BookingGridCard,
	BOOKING_CELL_GAP_PX,
} from '@/components/admin/BookingGridCard'
import { BreakGridCard } from '@/components/admin/BreakGridCard'
import {
	BreakJournalModal,
	type BreakJournalSavePayload,
} from '@/components/admin/BreakJournalModal'
import {
	BookingJournalModal,
	type BookingJournalSavePayload,
} from '@/components/admin/BookingJournalModal'
import { ALL_MASTERS_BLOCK_ID } from '@/lib/slotBlockConstants'
import type { Service } from '@/types/booking'
import { isHourAvailableForMaster } from '@/lib/masterSchedule'
import type { SalonHoursConfig } from '@/lib/salonHours'
import {
	SCHEDULE_GRID_PAD_Y_PX,
	SCHEDULE_HEADER_HEIGHT_PX,
	SCHEDULE_HOUR_HEIGHT_PX,
	SCHEDULE_MIN_COL_WIDTH_PX,
	SCHEDULE_TIME_GUTTER_PX,
	hourBoundaryTopPx,
	columnHorizontalStyle,
	computeBreakBookingVerticalLayouts,
	computeOverlapLayouts,
	formatScheduleNavDate,
	formatTimeShort,
	minutesToTopPx,
	scheduleBodyHeightPx,
	scheduleHourLabels,
	slotStartLocalYmd,
	todayYmd,
} from '@/lib/scheduleLayout'

export interface ScheduleBooking {
	id: string
	masterId: string
	masterName: string
	serviceId: string
	serviceName: string
	clientName: string
	clientPhone: string
	clientEmail?: string | null
	slotStart: string
	slotEnd: string
	status: string
	comment?: string | null
	masterComment?: string | null
	createdAt?: string
}

export interface ScheduleBlock {
	id: string
	masterId: string
	blockDate: string
	hour: number
	note: string | null
}

export interface ScheduleBreak {
	id: string
	masterId: string
	masterName: string
	slotStart: string
	slotEnd: string
	durationMinutes: number
	comment?: string | null
}

export interface ScheduleDayShift {
	masterId: string
	startHour: number
	endHourExclusive: number
	isDayOff: number
}

interface ScheduleDayViewProps {
	date: string
	salonHours: SalonHoursConfig
	masters: { id: string; name: string }[]
	services: Service[]
	bookings: ScheduleBooking[] | null
	breaks: ScheduleBreak[] | null
	blocks: ScheduleBlock[] | null
	dayShifts: ScheduleDayShift[] | null
	busy: boolean
	/** Если задан — взаимодействие только со своей колонкой */
	ownMasterId?: string | null
	/** Скрывать телефоны в чужих ячейках */
	hideOthersPhones?: boolean
	/** Профиль мастера текущего сотрудника (для сравнения при скрытии телефонов) */
	viewerMasterId?: string | null
	onSaveBooking: (
		id: string,
		payload: BookingJournalSavePayload
	) => Promise<void>
	onCreateBooking: (payload: BookingJournalSavePayload) => Promise<void>
	onDeleteBooking: (id: string) => Promise<void>
	onSaveBreak: (id: string, payload: BreakJournalSavePayload) => Promise<void>
	onCreateBreak: (payload: BreakJournalSavePayload) => Promise<void>
	onDeleteBreak: (id: string) => Promise<void>
}

function localSlotIso(workDate: string, time: string): string {
	const [y, m, d] = workDate.split('-').map(Number)
	const [hh, mm] = time.split(':').map(Number)
	return new Date(y, m - 1, d, hh, mm ?? 0, 0, 0).toISOString()
}

function hourEndTime(hour: number, endHourExclusive: number): string {
	const endHour = Math.min(hour + 1, endHourExclusive)
	return `${String(endHour).padStart(2, '0')}:00`
}

export function ScheduleDayView({
	date,
	salonHours,
	masters,
	services,
	bookings,
	breaks,
	blocks,
	dayShifts,
	busy,
	ownMasterId = null,
	hideOthersPhones = false,
	viewerMasterId = null,
	onSaveBooking,
	onCreateBooking,
	onDeleteBooking,
	onSaveBreak,
	onCreateBreak,
	onDeleteBreak,
}: ScheduleDayViewProps) {
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [selectedBreakId, setSelectedBreakId] = useState<string | null>(null)
	const [draftBooking, setDraftBooking] = useState<ScheduleBooking | null>(null)
	const [draftBreak, setDraftBreak] = useState<ScheduleBreak | null>(null)
	const [cellChooser, setCellChooser] = useState<{
		masterId: string
		hour: number
	} | null>(null)
	const [now, setNow] = useState(() => new Date())
	const scrollHostRef = useRef<HTMLDivElement>(null)
	const baseGridHeight = useMemo(
		() => scheduleBodyHeightPx(salonHours),
		[salonHours]
	)
	const [gridLayout, setGridLayout] = useState({
		bodyHeight: baseGridHeight,
		hourHeight: SCHEDULE_HOUR_HEIGHT_PX,
	})
	const hours = useMemo(() => scheduleHourLabels(salonHours), [salonHours])

	const sortedMasters = useMemo(
		() => [...masters].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
		[masters]
	)

	const dayBookings = useMemo(() => {
		if (!bookings) return []
		return bookings.filter((b) => slotStartLocalYmd(b.slotStart) === date)
	}, [bookings, date])

	const dayBlocks = useMemo(() => {
		if (!blocks) return []
		return blocks.filter((b) => b.blockDate === date)
	}, [blocks, date])

	const dayBreaks = useMemo(() => {
		if (!breaks) return []
		return breaks.filter((b) => slotStartLocalYmd(b.slotStart) === date)
	}, [breaks, date])

	const bookingsByMaster = useMemo(() => {
		const map = new Map<string, ScheduleBooking[]>()
		for (const m of sortedMasters) map.set(m.id, [])
		for (const b of dayBookings) {
			const list = map.get(b.masterId)
			if (list) list.push(b)
		}
		return map
	}, [dayBookings, sortedMasters])

	const breaksByMaster = useMemo(() => {
		const map = new Map<string, ScheduleBreak[]>()
		for (const m of sortedMasters) map.set(m.id, [])
		for (const b of dayBreaks) {
			const list = map.get(b.masterId)
			if (list) list.push(b)
		}
		return map
	}, [dayBreaks, sortedMasters])

	const blocksByMaster = useMemo(() => {
		const map = new Map<string, ScheduleBlock[]>()
		for (const m of sortedMasters) map.set(m.id, [])
		const allBlocks = dayBlocks.filter(
			(b) => b.masterId === ALL_MASTERS_BLOCK_ID
		)
		for (const m of sortedMasters) {
			const own = dayBlocks.filter((bl) => bl.masterId === m.id)
			map.set(m.id, [...own, ...allBlocks])
		}
		return map
	}, [dayBlocks, sortedMasters])

	const shiftByMaster = useMemo(() => {
		const map = new Map<
			string,
			{ startHour: number; endHourExclusive: number; isDayOff: boolean }
		>()
		if (!dayShifts) return map
		for (const s of dayShifts) {
			map.set(s.masterId, {
				startHour: s.startHour,
				endHourExclusive: s.endHourExclusive,
				isDayOff: s.isDayOff === 1,
			})
		}
		return map
	}, [dayShifts])

	const isHourOffSchedule = useCallback(
		(masterId: string, hour: number) => {
			const shift = shiftByMaster.get(masterId) ?? null
			return !isHourAvailableForMaster(hour, salonHours, date, shift)
		},
		[shiftByMaster, salonHours, date]
	)

	const selectedBooking = useMemo(() => {
		if (!selectedId || !bookings) return null
		const booking = bookings.find((b) => b.id === selectedId)
		if (!booking || slotStartLocalYmd(booking.slotStart) !== date) return null
		return booking
	}, [bookings, selectedId, date])

	const selectedBreak = useMemo(() => {
		if (!selectedBreakId || !breaks) return null
		const row = breaks.find((b) => b.id === selectedBreakId)
		if (!row || slotStartLocalYmd(row.slotStart) !== date) return null
		return row
	}, [breaks, selectedBreakId, date])

	const modalBooking = selectedBooking ?? draftBooking
	const isNewBooking = draftBooking !== null && selectedBooking === null
	const modalBreak = selectedBreak ?? draftBreak
	const isNewBreak = draftBreak !== null && selectedBreak === null

	const isToday = date === todayYmd()
	const nowMinutes = now.getHours() * 60 + now.getMinutes()
	const showNowLine =
		isToday &&
		nowMinutes >= salonHours.startHour * 60 &&
		nowMinutes < salonHours.endHourExclusive * 60
	const nowTopPx =
		showNowLine ?
			minutesToTopPx(nowMinutes, salonHours, gridLayout.hourHeight)
		:	null

	const minGridWidth =
		SCHEDULE_TIME_GUTTER_PX +
		Math.max(sortedMasters.length, 1) * SCHEDULE_MIN_COL_WIDTH_PX

	useEffect(() => {
		const tick = () => setNow(new Date())
		tick()
		const id = window.setInterval(tick, 30_000)
		return () => window.clearInterval(id)
	}, [])

	useLayoutEffect(() => {
		const host = scrollHostRef.current
		if (!host) return

		const measure = () => {
			const available = host.clientHeight
			if (available <= 0) return
			const minTotal = SCHEDULE_HEADER_HEIGHT_PX + baseGridHeight
			const contentHeight = Math.max(minTotal, available)
			const bodyHeight = contentHeight - SCHEDULE_HEADER_HEIGHT_PX
			const hourHeight =
				(bodyHeight - 2 * SCHEDULE_GRID_PAD_Y_PX) / hours.length
			setGridLayout((prev) => {
				if (prev.bodyHeight === bodyHeight && prev.hourHeight === hourHeight)
					return prev
				return { bodyHeight, hourHeight }
			})
		}

		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(host)
		window.addEventListener('resize', measure)
		return () => {
			observer.disconnect()
			window.removeEventListener('resize', measure)
		}
	}, [hours.length, baseGridHeight])

	const gridContentHeight = SCHEDULE_HEADER_HEIGHT_PX + gridLayout.bodyHeight

	const canInteract = useCallback(
		(masterId: string) => !ownMasterId || ownMasterId === masterId,
		[ownMasterId]
	)

	const shouldHidePhone = useCallback(
		(masterId: string) =>
			hideOthersPhones && !!viewerMasterId && masterId !== viewerMasterId,
		[hideOthersPhones, viewerMasterId]
	)

	const handleBookingClick = (id: string, e: React.MouseEvent) => {
		e.stopPropagation()
		setDraftBooking(null)
		setDraftBreak(null)
		setSelectedBreakId(null)
		setSelectedId(id)
	}

	const handleBreakClick = (id: string, e: React.MouseEvent) => {
		e.stopPropagation()
		setDraftBooking(null)
		setDraftBreak(null)
		setSelectedId(null)
		setSelectedBreakId(id)
	}

	const handleEmptyCellClick = (masterId: string, hour: number) => {
		if (!canInteract(masterId)) return
		const colBlocks = blocksByMaster.get(masterId) ?? []
		if (colBlocks.some((bl) => bl.hour === hour)) return
		if (isHourOffSchedule(masterId, hour)) return
		setCellChooser({ masterId, hour })
	}

	const openNewBooking = (masterId: string, hour: number) => {
		const master = sortedMasters.find((m) => m.id === masterId)
		const startTime = `${String(hour).padStart(2, '0')}:00`
		const endTime = hourEndTime(hour, salonHours.endHourExclusive)
		const defaultService = services[0]
		setCellChooser(null)
		setSelectedBreakId(null)
		setDraftBreak(null)
		setSelectedId(null)
		setDraftBooking({
			id: '__new__',
			masterId,
			masterName: master?.name ?? '',
			serviceId: defaultService?.id ?? '',
			serviceName: defaultService?.name ?? '',
			clientName: '',
			clientPhone: '',
			clientEmail: null,
			slotStart: localSlotIso(date, startTime),
			slotEnd: localSlotIso(date, endTime),
			status: 'pending',
			comment: null,
			masterComment: null,
		})
	}

	const openNewBreak = (masterId: string, hour: number) => {
		const master = sortedMasters.find((m) => m.id === masterId)
		const startTime = `${String(hour).padStart(2, '0')}:00`
		const durationMinutes = 10
		const endMin = hour * 60 + durationMinutes
		const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
		setCellChooser(null)
		setSelectedId(null)
		setDraftBooking(null)
		setSelectedBreakId(null)
		setDraftBreak({
			id: '__new_break__',
			masterId,
			masterName: master?.name ?? '',
			slotStart: localSlotIso(date, startTime),
			slotEnd: localSlotIso(date, endTime),
			durationMinutes,
			comment: null,
		})
	}

	const closeModal = () => {
		setSelectedId(null)
		setDraftBooking(null)
		setSelectedBreakId(null)
		setDraftBreak(null)
		setCellChooser(null)
	}

	const isHourBlocked = (masterId: string, hour: number) => {
		const colBlocks = blocksByMaster.get(masterId) ?? []
		return colBlocks.some((bl) => bl.hour === hour)
	}

	return (
		<>
			<div className='grid h-full min-h-0 flex-1 basis-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-white/10 bg-(--bg-content)'>
				<div className='flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3'>
					<p className='text-sm font-medium capitalize text-white/90 sm:text-base'>
						{formatScheduleNavDate(date)}
					</p>
					<p className='text-xs text-white/45'>
						{bookings === null ? 'Загрузка…' : `${dayBookings.length} записей`}
					</p>
				</div>

				<div
					ref={scrollHostRef}
					className='relative min-h-0 flex-1 overflow-hidden'
				>
					<div className='h-full w-full overflow-x-auto overflow-y-auto overscroll-contain scrollbar-theme'>
						{!bookings ?
							<div className='flex h-full min-h-48 items-center justify-center text-sm text-white/50'>
								Загрузка журнала…
							</div>
						: sortedMasters.length === 0 ?
							<div className='flex h-full min-h-48 items-center justify-center text-sm text-white/50'>
								Добавьте мастеров в разделе «Контент»
							</div>
						:	<div
								className='relative flex w-full min-w-full flex-col'
								style={{
									minWidth: minGridWidth,
									height: gridContentHeight,
									minHeight: gridContentHeight,
								}}
							>
								<div
									className='sticky top-0 z-20 flex w-full border-b border-white/10 bg-(--bg-content)/98 backdrop-blur'
									style={{ height: SCHEDULE_HEADER_HEIGHT_PX }}
								>
									<div
										className='sticky left-0 z-30 shrink-0 border-r border-white/10 bg-(--bg-content)/98'
										style={{ width: SCHEDULE_TIME_GUTTER_PX }}
									/>
									<div className='flex flex-1'>
										{sortedMasters.map((m) => (
											<div
												key={m.id}
												className='flex shrink-0 grow items-center justify-center border-r border-white/8 px-2 text-center text-sm font-semibold text-white/90 last:border-r-0'
												style={{
													flexBasis: SCHEDULE_MIN_COL_WIDTH_PX,
													minWidth: SCHEDULE_MIN_COL_WIDTH_PX,
												}}
											>
												<span className='truncate'>{m.name}</span>
											</div>
										))}
									</div>
								</div>

								<div
									className='relative flex w-full'
									style={{ height: gridLayout.bodyHeight }}
								>
									<div
										className='pointer-events-none absolute inset-0 z-[2]'
										aria-hidden
									>
										{Array.from({ length: hours.length + 1 }, (_, i) => (
											<div
												key={i}
												className='absolute inset-x-0 border-t border-white/6'
												style={{
													top: hourBoundaryTopPx(i, gridLayout.hourHeight),
												}}
											/>
										))}
									</div>

									<div
										className='sticky left-0 z-10 shrink-0 border-r border-white/10 bg-(--bg-content) relative'
										style={{
											width: SCHEDULE_TIME_GUTTER_PX,
											height: gridLayout.bodyHeight,
										}}
									>
										{Array.from({ length: hours.length + 1 }, (_, i) => (
											<div
												key={`gutter-line-${i}`}
												className='pointer-events-none absolute inset-x-0 border-t border-white/6'
												style={{
													top: hourBoundaryTopPx(i, gridLayout.hourHeight),
												}}
											/>
										))}
										{hours.map((h, i) => (
											<span
												key={h}
												className='pointer-events-none absolute right-2 z-20 -translate-y-1/2 text-[11px] leading-none text-white/40'
												style={{
													top: hourBoundaryTopPx(i, gridLayout.hourHeight),
												}}
											>
												{String(h).padStart(2, '0')}:00
											</span>
										))}
										<span
											className='pointer-events-none absolute right-2 z-20 -translate-y-1/2 text-[11px] leading-none text-white/40'
											style={{
												top: hourBoundaryTopPx(
													hours.length,
													gridLayout.hourHeight
												),
											}}
										>
											{String(salonHours.endHourExclusive).padStart(2, '0')}:00
										</span>
									</div>

									<div className='relative flex flex-1'>
										{sortedMasters.map((m) => {
											const colBookings = bookingsByMaster.get(m.id) ?? []
											const colBreaks = breaksByMaster.get(m.id) ?? []
											const colBlocks = blocksByMaster.get(m.id) ?? []
											const bookingItems = colBookings.map((b) => ({
												id: b.id,
												slotStart: b.slotStart,
												slotEnd: b.slotEnd,
											}))
											const breakItems = colBreaks.map((br) => ({
												id: br.id,
												slotStart: br.slotStart,
												slotEnd: br.slotEnd,
											}))
											const bookingColumnLayouts =
												computeOverlapLayouts(bookingItems)
											const blockLayouts = computeBreakBookingVerticalLayouts(
												bookingItems,
												breakItems,
												salonHours,
												gridLayout.hourHeight,
												BOOKING_CELL_GAP_PX
											)
											return (
												<div
													key={m.id}
													className='relative shrink-0 grow border-r border-white/6 last:border-r-0'
													style={{
														height: gridLayout.bodyHeight,
														flexBasis: SCHEDULE_MIN_COL_WIDTH_PX,
														minWidth: SCHEDULE_MIN_COL_WIDTH_PX,
													}}
												>
													{hours.map((h) => {
														const blocked = isHourBlocked(m.id, h)
														const offSchedule = isHourOffSchedule(m.id, h)
														const noAccess = !canInteract(m.id)
														const unavailable =
															blocked || offSchedule || noAccess
														return (
															<button
																key={h}
																type='button'
																disabled={unavailable}
																onClick={() => handleEmptyCellClick(m.id, h)}
																className={`absolute inset-x-0 z-0 transition ${
																	unavailable ? 'cursor-not-allowed' : (
																		'cursor-pointer hover:bg-white/4 active:bg-white/6'
																	)
																}`}
																style={{
																	top: minutesToTopPx(
																		h * 60,
																		salonHours,
																		gridLayout.hourHeight
																	),
																	height: gridLayout.hourHeight,
																}}
																aria-label={`${m.name}, ${h}:00`}
															/>
														)
													})}

													{hours.map((h) => {
														if (
															!isHourOffSchedule(m.id, h) ||
															isHourBlocked(m.id, h)
														)
															return null
														return (
															<div
																key={`off-${h}`}
																className='pointer-events-none absolute inset-x-1 z-1 rounded-sm border border-zinc-600/25 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.025)_0,rgba(255,255,255,0.025)_3px,transparent_3px,transparent_9px)] bg-zinc-900/60'
																style={{
																	top:
																		minutesToTopPx(
																			h * 60,
																			salonHours,
																			gridLayout.hourHeight
																		) + 1,
																	height: gridLayout.hourHeight - 2,
																}}
																title='Вне графика мастера'
															/>
														)
													})}

													{colBlocks.map((bl) => (
														<div
															key={bl.id}
															className='pointer-events-none absolute inset-x-1 z-1 flex items-center justify-center overflow-hidden rounded-md border border-zinc-500/30 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_4px,transparent_4px,transparent_10px)] bg-zinc-700/35 px-1'
															style={{
																top:
																	minutesToTopPx(
																		bl.hour * 60,
																		salonHours,
																		gridLayout.hourHeight
																	) + 1,
																height: gridLayout.hourHeight - 2,
															}}
															title={bl.note ?? 'Заблокировано'}
														>
															{bl.note ?
																<span className='line-clamp-3 text-center text-[10px] leading-tight font-semibold text-white/80 drop-shadow-sm sm:text-[11px]'>
																	{bl.note}
																</span>
															:	<span className='text-[9px] font-medium uppercase tracking-wide text-white/35'>
																	Блок
																</span>
															}
														</div>
													))}

													{colBookings.map((b) => {
														const gap = BOOKING_CELL_GAP_PX
														const interactive = canInteract(m.id)
														const column = bookingColumnLayouts.get(b.id) ?? {
															column: 0,
															columns: 1,
														}
														const block = blockLayouts.get(b.id) ?? {
															top: 0,
															height: 14,
														}
														return (
															<BookingGridCard
																key={b.id}
																booking={b}
																selected={selectedId === b.id}
																height={Math.max(block.height, 14)}
																hidePhone={shouldHidePhone(m.id)}
																readOnly={!interactive}
																style={{
																	top: block.top,
																	height: Math.max(block.height, 14),
																	...columnHorizontalStyle(column, gap),
																}}
																onClick={
																	interactive ?
																		(e) => handleBookingClick(b.id, e)
																	:	undefined
																}
															/>
														)
													})}

													{colBreaks.map((br) => {
														const gap = BOOKING_CELL_GAP_PX
														const interactive = canInteract(m.id)
														const block = blockLayouts.get(br.id) ?? {
															top: 0,
															height: 12,
														}
														return (
															<BreakGridCard
																key={br.id}
																breakRow={br}
																selected={selectedBreakId === br.id}
																readOnly={!interactive}
																style={{
																	top: block.top,
																	height: Math.max(block.height, 12),
																	left: gap,
																	right: gap,
																}}
																onClick={
																	interactive ?
																		(e) => handleBreakClick(br.id, e)
																	:	undefined
																}
															/>
														)
													})}
												</div>
											)
										})}

										{nowTopPx !== null && (
											<div
												className='pointer-events-none absolute z-30 flex items-center'
												style={{
													top: nowTopPx,
													left: 0,
													right: 0,
													height: 0,
												}}
											>
												<span
													className='absolute rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm'
													style={{ left: -52 }}
												>
													{formatTimeShort(now)}
												</span>
												<div className='h-[2px] w-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' />
											</div>
										)}
									</div>
								</div>
							</div>
						}
					</div>
				</div>
			</div>

			{cellChooser ?
				<div
					className='fixed inset-0 z-190 flex items-center justify-center bg-black/50 p-4'
					onClick={() => setCellChooser(null)}
				>
					<div
						className='w-full max-w-sm rounded-2xl border border-white/10 bg-(--bg-content) p-4 shadow-2xl'
						onClick={(e) => e.stopPropagation()}
					>
						<p className='mb-3 text-sm font-semibold text-white/90'>
							Что создать?
						</p>
						<div className='flex flex-col gap-2'>
							<button
								type='button'
								onClick={() =>
									openNewBooking(cellChooser.masterId, cellChooser.hour)
								}
								className='cursor-pointer rounded-xl bg-(--accent) px-4 py-3 text-left text-sm font-semibold text-black transition hover:brightness-110'
							>
								Запись клиента
							</button>
							<button
								type='button'
								onClick={() =>
									openNewBreak(cellChooser.masterId, cellChooser.hour)
								}
								className='cursor-pointer rounded-xl border border-violet-400/35 bg-violet-500/15 px-4 py-3 text-left text-sm font-semibold text-violet-100 transition hover:bg-violet-500/25'
							>
								⏰ Технический перерыв
							</button>
						</div>
					</div>
				</div>
			:	null}

			{modalBooking ?
				<BookingJournalModal
					booking={modalBooking}
					masters={masters}
					services={services}
					isNew={isNewBooking}
					busy={busy}
					lockedMasterId={ownMasterId}
					onClose={closeModal}
					onSave={async (payload) => {
						if (isNewBooking) {
							await onCreateBooking(payload)
							closeModal()
						} else if (selectedBooking) {
							await onSaveBooking(selectedBooking.id, payload)
							closeModal()
						}
					}}
					onDelete={
						selectedBooking ?
							async () => {
								await onDeleteBooking(selectedBooking.id)
								closeModal()
							}
						:	undefined
					}
				/>
			:	null}

			{modalBreak ?
				<BreakJournalModal
					breakRow={modalBreak}
					masters={masters}
					isNew={isNewBreak}
					busy={busy}
					lockedMasterId={ownMasterId}
					onClose={closeModal}
					onSave={async (payload) => {
						if (isNewBreak) {
							await onCreateBreak(payload)
							closeModal()
						} else if (selectedBreak) {
							await onSaveBreak(selectedBreak.id, payload)
							closeModal()
						}
					}}
					onDelete={
						selectedBreak ?
							async () => {
								await onDeleteBreak(selectedBreak.id)
								closeModal()
							}
						:	undefined
					}
				/>
			:	null}
		</>
	)
}

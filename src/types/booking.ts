export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
  sortOrder: number;
}

export interface Master {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  phone?: string | null;
}

export interface TimeSlot {
  id: string;
  masterId: string;
  start: string;
  end: string;
  available: boolean;
}

export interface BookingRequest {
  masterId: string;
  serviceId: string;
  slotId: string;
  clientName: string;
  clientPhone: string;
  comment?: string;
}

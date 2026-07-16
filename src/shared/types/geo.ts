export interface MapBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface PlaceInBounds {
  id: string;
  name: string;
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
  category: string;
  status: string;
  claim: 'allowed' | 'not_allowed' | 'outdoor_only' | null;
  agreeing_devices: number;
}

export interface ReportItem {
  claim: 'allowed' | 'not_allowed' | 'outdoor_only';
  notes: string | null;
  created_at: string;
}

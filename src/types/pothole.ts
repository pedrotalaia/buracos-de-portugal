export type Severity = 'low' | 'moderate' | 'high';
export type Status = 'reported' | 'repairing' | 'repaired' | 'archived';

export interface Pothole {
  id: string;
  lat: number;
  lng: number;
  address?: string;
  normalized_address?: string;
  parish?: string;
  municipality?: string;
  district?: string;
  postal_code?: string;
  geocode_status?: 'pending' | 'resolved' | 'failed' | 'manual';
  geocoded_at?: string;
  description?: string;
  photo_url?: string;
  severity: Severity;
  status: Status;
  votes: number;
  comments_count: number;
  created_at: string;
  user_id?: string;
  repaired_at?: string;
  reopen_count?: number;
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Leve',
  moderate: 'Moderado',
  high: 'Grave',
};

export const STATUS_LABELS: Record<Status, string> = {
  reported: 'Reportado',
  repairing: 'Em reparação',
  repaired: 'Reparado',
  archived: 'Arquivado',
};

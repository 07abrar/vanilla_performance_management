export interface User {
  id: number;
  name: string;
}

export interface Activity {
  id: number;
  name: string;
}

export interface Track {
  id: number;
  user_id: number;
  activity_id: number;
  start_time: string;
  end_time: string;
  comment: string | null;
}

export type RecapMode = 'daily' | 'weekly' | 'monthly';

export interface RecapEntry {
  activity_id: number;
  activity_name: string | null;
  minutes: number;
  percentage: number;
}

export interface RecapOut {
  mode: RecapMode;
  label: string;
  start: string;
  end: string;
  total_minutes: number;
  entries: RecapEntry[];
}

export interface CreateUserPayload {
  name: string;
}

export interface CreateActivityPayload {
  name: string;
}

export interface CreateTrackPayload {
  user: number;
  activity: number;
  start_time: string;
  end_time: string;
  comment?: string | null;
}

export interface RecapParams {
  mode: RecapMode;
  date?: string;
  week_start?: string;
  year?: number;
  month?: number;
}
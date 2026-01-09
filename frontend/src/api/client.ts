import {
  Activity,
  CreateActivityPayload,
  CreateTrackPayload,
  CreateUserPayload,
  PaginatedResponse,
  RecapMode,
  RecapOut,
  Track,
  User
} from '../type';

const BASE_URL = 'http://localhost:8000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data === 'string') return data;
    if (data && typeof data.detail === 'string') return data.detail;
    if (data && typeof data.message === 'string') return data.message;
  } catch (error) {
    // ignore
  }
  return `Request failed with status ${response.status}`;
}

export const apiClient = {
  async listUsers(): Promise<User[]> {
    return request<User[]>('/users');
  },
  async createUser(payload: CreateUserPayload): Promise<User> {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async deleteUser(id: number): Promise<void> {
    await request<void>(`/users/${id}`, { method: 'DELETE' });
  },

  async listActivities(): Promise<Activity[]> {
    return request<Activity[]>('/activities');
  },
  async createActivity(payload: CreateActivityPayload): Promise<Activity> {
    return request<Activity>('/activities', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async deleteActivity(id: number): Promise<void> {
    await request<void>(`/activities/${id}`, { method: 'DELETE' });
  },

  async listTracks(params: Record<string, string> = {}): Promise<PaginatedResponse<Track>> {
    const search = new URLSearchParams(params);
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<PaginatedResponse<Track>>(`/tracks${suffix}`);
  },
  async createTrack(payload: CreateTrackPayload): Promise<Track> {
    return request<Track>('/tracks', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async deleteTrack(id: number): Promise<void> {
    await request<void>(`/tracks/${id}`, { method: 'DELETE' });
  },

  async getRecap(mode: RecapMode, params: Record<string, string>): Promise<RecapOut> {
    const search = new URLSearchParams(params);
    return request<RecapOut>(`/recap/${mode}?${search.toString()}`);
  }
};

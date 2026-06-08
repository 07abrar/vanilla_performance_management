import {
  CreateActivityPayload,
  CreateTrackPayload,
  CreateUserPayload,
  Entity,
  RecapMode,
  RecapOut,
  Track,
} from "./types";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
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
    if (typeof data === "string") return data;
    if (data && typeof data.detail === "string") return data.detail;
    if (data && typeof data.message === "string") return data.message;
  } catch (error) {
    // ignore
  }
  return `Request failed with status ${response.status}`;
}

export const apiClient = {
  async listUsers(): Promise<Entity[]> {
    return request<Entity[]>("/users");
  },
  async createUser(payload: CreateUserPayload): Promise<Entity> {
    return request<Entity>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async deleteUser(id: number): Promise<void> {
    await request<void>(`/users/${id}`, { method: "DELETE" });
  },

  async listActivities(): Promise<Entity[]> {
    return request<Entity[]>("/activities");
  },
  async createActivity(payload: CreateActivityPayload): Promise<Entity> {
    return request<Entity>("/activities", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async deleteActivity(id: number): Promise<void> {
    await request<void>(`/activities/${id}`, { method: "DELETE" });
  },

  async listTracks(params?: {
    date?: string;
    start?: string;
    end?: string;
    tz_offset?: number;
  }): Promise<Track[]> {
    const search = new URLSearchParams();
    if (params?.date) search.set("date", params.date);
    if (params?.start) search.set("start", params.start);
    if (params?.end) search.set("end", params.end);
    if (params?.tz_offset !== undefined)
      search.set("tz_offset", String(params.tz_offset));
    const suffix = search.toString();
    return request<Track[]>(`/tracks${suffix ? `?${suffix}` : ""}`);
  },
  async createTrack(payload: CreateTrackPayload): Promise<Track> {
    return request<Track>("/tracks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async deleteTrack(id: number): Promise<void> {
    await request<void>(`/tracks/${id}`, { method: "DELETE" });
  },

  async getRecap(
    mode: RecapMode,
    params: Record<string, string>,
  ): Promise<RecapOut> {
    const search = new URLSearchParams(params);
    return request<RecapOut>(`/recap/${mode}?${search.toString()}`);
  },
};

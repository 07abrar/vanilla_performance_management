import dayjs from 'dayjs';
import { apiClient } from './api/client';
import {
  Activity,
  CreateActivityPayload,
  CreateTrackPayload,
  CreateUserPayload,
  RecapMode,
  RecapOut,
  Track,
  User
} from './type';

interface ResourceState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
}

interface RecapState extends ResourceState<RecapOut | null> {
  params: Record<string, string> | null;
  mode: RecapMode;
}

interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

interface TracksState extends ResourceState<Track[]> {
  pagination: PaginationMeta | null;
  selectedDate: string;
  page: number;
}

type ResourceKey = 'users' | 'activities' | 'tracks' | 'recap';

type Listener = () => void;

const listeners: Record<ResourceKey, Set<Listener>> = {
  users: new Set(),
  activities: new Set(),
  tracks: new Set(),
  recap: new Set()
};

const defaultRecap: RecapOut | null = null;

const state = {
  users: createResource<User[]>([]),
  activities: createResource<Activity[]>([]),
  tracks: createTracksState(),
  recap: createRecapState()
};

function createResource<T>(initialData: T): ResourceState<T> {
  return {
    data: initialData,
    isLoading: false,
    error: null
  };
}

function createRecapState(): RecapState {
  return {
    data: defaultRecap,
    isLoading: false,
    error: null,
    params: null,
    mode: 'daily'
  };
}

function createTracksState(): TracksState {
  return {
    data: [],
    isLoading: false,
    error: null,
    pagination: null,
    selectedDate: dayjs().format('YYYY-MM-DD'),
    page: 1
  };
}

function notify(key: ResourceKey): void {
  listeners[key].forEach((listener) => listener());
}

export function subscribe(keys: ResourceKey[], listener: Listener): () => void {
  keys.forEach((key) => listeners[key].add(listener));
  return () => {
    keys.forEach((key) => listeners[key].delete(listener));
  };
}

export function getUsersState(): ResourceState<User[]> {
  return state.users;
}

export function getActivitiesState(): ResourceState<Activity[]> {
  return state.activities;
}

export function getTracksState(): TracksState {
  return state.tracks;
}

export function getRecapState(): RecapState {
  return state.recap;
}

export async function loadUsers(force = false): Promise<void> {
  if (state.users.isLoading) return;
  if (!force && state.users.data.length > 0) return;
  state.users.isLoading = true;
  state.users.error = null;
  notify('users');
  try {
    const users = await apiClient.listUsers();
    state.users.data = users;
  } catch (error) {
    state.users.error = (error as Error).message;
  } finally {
    state.users.isLoading = false;
    notify('users');
  }
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
  state.users.error = null;
  notify('users');
  try {
    const created = await apiClient.createUser(payload);
    state.users.data = [...state.users.data, created].sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    state.users.error = (error as Error).message;
    throw error;
  } finally {
    notify('users');
  }
}

export async function deleteUser(id: number): Promise<void> {
  state.users.error = null;
  notify('users');
  try {
    await apiClient.deleteUser(id);
    state.users.data = state.users.data.filter((user) => user.id !== id);
  } catch (error) {
    state.users.error = (error as Error).message;
    throw error;
  } finally {
    notify('users');
  }
}

export async function loadActivities(force = false): Promise<void> {
  if (state.activities.isLoading) return;
  if (!force && state.activities.data.length > 0) return;
  state.activities.isLoading = true;
  state.activities.error = null;
  notify('activities');
  try {
    const activities = await apiClient.listActivities();
    state.activities.data = activities;
  } catch (error) {
    state.activities.error = (error as Error).message;
  } finally {
    state.activities.isLoading = false;
    notify('activities');
  }
}

export async function createActivity(payload: CreateActivityPayload): Promise<void> {
  state.activities.error = null;
  notify('activities');
  try {
    const created = await apiClient.createActivity(payload);
    state.activities.data = [...state.activities.data, created].sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    state.activities.error = (error as Error).message;
    throw error;
  } finally {
    notify('activities');
  }
}

export async function deleteActivity(id: number): Promise<void> {
  state.activities.error = null;
  notify('activities');
  try {
    await apiClient.deleteActivity(id);
    state.activities.data = state.activities.data.filter((activity) => activity.id !== id);
  } catch (error) {
    state.activities.error = (error as Error).message;
    throw error;
  } finally {
    notify('activities');
  }
}

export async function loadTracks(options: {
  date?: string;
  start?: string;
  end?: string;
  page?: number;
  force?: boolean;
} = {}): Promise<void> {
  if (state.tracks.isLoading) return;
  const resolvedDate =
    options.date ?? (options.start || options.end ? undefined : state.tracks.selectedDate);
  const resolvedPage = options.page ?? state.tracks.page;
  const shouldForce = options.force ?? true;
  const comparisonDate = resolvedDate ?? state.tracks.selectedDate;
  if (
    !shouldForce &&
    state.tracks.data.length > 0 &&
    comparisonDate === state.tracks.selectedDate &&
    resolvedPage === state.tracks.page
  ) {
    return;
  }
  state.tracks.isLoading = true;
  state.tracks.error = null;
  notify('tracks');
  try {
    const response = await apiClient.listTracks({
      date: resolvedDate,
      start: options.start,
      end: options.end,
      page: resolvedPage
    });
    if (resolvedDate) {
      state.tracks.selectedDate = resolvedDate;
    }
    state.tracks.page = resolvedPage;
    state.tracks.pagination = {
      count: response.count,
      next: response.next,
      previous: response.previous
    };
    state.tracks.data = response.results.sort(
      (a, b) => dayjs(b.start_time).valueOf() - dayjs(a.start_time).valueOf()
    );
  } catch (error) {
    state.tracks.error = (error as Error).message;
  } finally {
    state.tracks.isLoading = false;
    notify('tracks');
  }
}

export async function createTrack(payload: CreateTrackPayload): Promise<void> {
  state.tracks.error = null;
  notify('tracks');
  try {
    const created = await apiClient.createTrack(payload);
    const createdDate = dayjs(created.start_time).format('YYYY-MM-DD');
    if (createdDate === state.tracks.selectedDate) {
      state.tracks.data = [created, ...state.tracks.data].sort(
        (a, b) => dayjs(b.start_time).valueOf() - dayjs(a.start_time).valueOf()
      );
    }
  } catch (error) {
    state.tracks.error = (error as Error).message;
    throw error;
  } finally {
    notify('tracks');
  }
}

export async function deleteTrack(id: number): Promise<void> {
  state.tracks.error = null;
  notify('tracks');
  try {
    await apiClient.deleteTrack(id);
    state.tracks.data = state.tracks.data.filter((track) => track.id !== id);
  } catch (error) {
    state.tracks.error = (error as Error).message;
    throw error;
  } finally {
    notify('tracks');
  }
}

export async function loadRecap(mode: RecapMode, params: Record<string, string>): Promise<void> {
  state.recap.mode = mode;
  state.recap.params = params;
  state.recap.isLoading = true;
  state.recap.error = null;
  notify('recap');
  try {
    const data = await apiClient.getRecap(mode, params);
    state.recap.data = data;
  } catch (error) {
    state.recap.error = (error as Error).message;
    state.recap.data = null;
  } finally {
    state.recap.isLoading = false;
    notify('recap');
  }
}

export function getUserName(id: number): string {
  const found = state.users.data.find((user) => user.id === id);
  return found ? found.name : `User #${id}`;
}

export function getActivityName(id: number): string {
  const found = state.activities.data.find((activity) => activity.id === id);
  return found ? found.name : `Activity #${id}`;
}

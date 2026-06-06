import dayjs from 'shared/lib/dayjs';
import { apiClient } from 'shared/api/client';
import { CreateTrackPayload, Track } from 'shared/api/types';
import { notify } from './subscribe';

interface ResourceState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
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

export const tracksState: TracksState = {
  data: [],
  isLoading: false,
  error: null,
  pagination: null,
  selectedDate: dayjs().format('YYYY-MM-DD'),
  page: 1
};

export function getTracksState(): TracksState {
  return tracksState;
}

export async function loadTracks(options: {
  date?: string;
  start?: string;
  end?: string;
  page?: number;
  force?: boolean;
} = {}): Promise<void> {
  if (tracksState.isLoading) return;
  const resolvedDate =
    options.date ?? (options.start || options.end ? undefined : tracksState.selectedDate);
  const resolvedPage = options.page ?? tracksState.page;
  const shouldForce = options.force ?? true;
  const comparisonDate = resolvedDate ?? tracksState.selectedDate;
  if (
    !shouldForce &&
    tracksState.data.length > 0 &&
    comparisonDate === tracksState.selectedDate &&
    resolvedPage === tracksState.page
  ) {
    return;
  }
  tracksState.isLoading = true;
  tracksState.error = null;
  notify('tracks');
  try {
    const response = await apiClient.listTracks({
      date: resolvedDate,
      start: options.start,
      end: options.end,
      page: resolvedPage,
      tz_offset: new Date().getTimezoneOffset()
    });
    if (resolvedDate) {
      tracksState.selectedDate = resolvedDate;
    }
    tracksState.page = resolvedPage;
    tracksState.pagination = {
      count: response.count,
      next: response.next,
      previous: response.previous
    };
    tracksState.data = response.results.sort(
      (a, b) => dayjs(b.start_time).valueOf() - dayjs(a.start_time).valueOf()
    );
  } catch (error) {
    tracksState.error = (error as Error).message;
  } finally {
    tracksState.isLoading = false;
    notify('tracks');
  }
}

export async function createTrack(payload: CreateTrackPayload): Promise<void> {
  tracksState.error = null;
  notify('tracks');
  try {
    const created = await apiClient.createTrack(payload);
    const createdDate = dayjs(created.start_time).format('YYYY-MM-DD');
    if (createdDate === tracksState.selectedDate) {
      tracksState.data = [created, ...tracksState.data].sort(
        (a, b) => dayjs(b.start_time).valueOf() - dayjs(a.start_time).valueOf()
      );
    }
  } catch (error) {
    tracksState.error = (error as Error).message;
    throw error;
  } finally {
    notify('tracks');
  }
}

export async function deleteTrack(id: number): Promise<void> {
  tracksState.error = null;
  notify('tracks');
  try {
    await apiClient.deleteTrack(id);
    tracksState.data = tracksState.data.filter((track) => track.id !== id);
  } catch (error) {
    tracksState.error = (error as Error).message;
    throw error;
  } finally {
    notify('tracks');
  }
}

import dayjs from 'shared/lib/dayjs';
import { apiClient } from 'shared/api/client';
import { CreateTrackPayload, Track } from 'shared/api/types';
import { notify } from './subscribe';

interface ResourceState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
}

interface TracksState extends ResourceState<Track[]> {
  selectedDate: string;
}

export const tracksState: TracksState = {
  data: [],
  isLoading: false,
  error: null,
  selectedDate: dayjs().format('YYYY-MM-DD')
};

export function getTracksState(): TracksState {
  return tracksState;
}

export async function loadTracks(options: {
  date?: string;
  start?: string;
  end?: string;
  force?: boolean;
} = {}): Promise<void> {
  if (tracksState.isLoading) return;
  const resolvedDate =
    options.date ?? (options.start || options.end ? undefined : tracksState.selectedDate);
  const shouldForce = options.force ?? true;
  const comparisonDate = resolvedDate ?? tracksState.selectedDate;
  if (
    !shouldForce &&
    tracksState.data.length > 0 &&
    comparisonDate === tracksState.selectedDate
  ) {
    return;
  }
  tracksState.isLoading = true;
  tracksState.error = null;
  notify('tracks');
  try {
    const tracks = await apiClient.listTracks({
      date: resolvedDate,
      start: options.start,
      end: options.end,
      tz_offset: new Date().getTimezoneOffset()
    });
    if (resolvedDate) {
      tracksState.selectedDate = resolvedDate;
    }
    tracksState.data = tracks.sort(
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

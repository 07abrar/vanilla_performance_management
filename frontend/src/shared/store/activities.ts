import { apiClient } from 'shared/api/client';
import { Activity, CreateActivityPayload } from 'shared/api/types';
import { notify } from './subscribe';

interface ResourceState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
}

export const activitiesState: ResourceState<Activity[]> = {
  data: [],
  isLoading: false,
  error: null
};

export function getActivitiesState(): ResourceState<Activity[]> {
  return activitiesState;
}

export async function loadActivities(force = false): Promise<void> {
  if (activitiesState.isLoading) return;
  if (!force && activitiesState.data.length > 0) return;
  activitiesState.isLoading = true;
  activitiesState.error = null;
  notify('activities');
  try {
    const activities = await apiClient.listActivities();
    activitiesState.data = activities;
  } catch (error) {
    activitiesState.error = (error as Error).message;
  } finally {
    activitiesState.isLoading = false;
    notify('activities');
  }
}

export async function createActivity(payload: CreateActivityPayload): Promise<void> {
  activitiesState.error = null;
  notify('activities');
  try {
    const created = await apiClient.createActivity(payload);
    activitiesState.data = [...activitiesState.data, created].sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    activitiesState.error = (error as Error).message;
    throw error;
  } finally {
    notify('activities');
  }
}

export async function deleteActivity(id: number): Promise<void> {
  activitiesState.error = null;
  notify('activities');
  try {
    await apiClient.deleteActivity(id);
    activitiesState.data = activitiesState.data.filter((activity) => activity.id !== id);
  } catch (error) {
    activitiesState.error = (error as Error).message;
    throw error;
  } finally {
    notify('activities');
  }
}

export function getActivityName(id: number): string {
  const found = activitiesState.data.find((activity) => activity.id === id);
  return found ? found.name : `Activity #${id}`;
}

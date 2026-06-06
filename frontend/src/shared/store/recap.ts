import { apiClient } from 'shared/api/client';
import { RecapMode, RecapOut } from 'shared/api/types';
import { notify } from './subscribe';

interface ResourceState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
}

interface RecapState extends ResourceState<RecapOut | null> {
  params: Record<string, string> | null;
  mode: RecapMode;
}

const defaultRecap: RecapOut | null = null;

export const recapState: RecapState = {
  data: defaultRecap,
  isLoading: false,
  error: null,
  params: null,
  mode: 'daily'
};

export let recapRequestId = 0;

export function getRecapState(): RecapState {
  return recapState;
}

export async function loadRecap(mode: RecapMode, params: Record<string, string>): Promise<void> {
  const requestId = ++recapRequestId;
  recapState.mode = mode;
  recapState.params = params;
  recapState.isLoading = true;
  recapState.error = null;
  notify('recap');
  try {
    const data = await apiClient.getRecap(mode, params);
    if (requestId !== recapRequestId) return; // a newer request superseded this one
    recapState.data = data;
  } catch (error) {
    if (requestId !== recapRequestId) return;
    recapState.error = (error as Error).message;
    recapState.data = null;
  } finally {
    if (requestId === recapRequestId) {
      recapState.isLoading = false;
      notify('recap');
    }
  }
}

import { apiClient } from 'shared/api/client';
import { CreateUserPayload, Entity } from 'shared/api/types';
import { notify } from './subscribe';

interface ResourceState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
}

export const usersState: ResourceState<Entity[]> = {
  data: [],
  isLoading: false,
  error: null
};

export function getUsersState(): ResourceState<Entity[]> {
  return usersState;
}

export async function loadUsers(force = false): Promise<void> {
  if (usersState.isLoading) return;
  if (!force && usersState.data.length > 0) return;
  usersState.isLoading = true;
  usersState.error = null;
  notify('users');
  try {
    const users = await apiClient.listUsers();
    usersState.data = users;
  } catch (error) {
    usersState.error = (error as Error).message;
  } finally {
    usersState.isLoading = false;
    notify('users');
  }
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
  usersState.error = null;
  notify('users');
  try {
    const created = await apiClient.createUser(payload);
    usersState.data = [...usersState.data, created].sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    usersState.error = (error as Error).message;
    throw error;
  } finally {
    notify('users');
  }
}

export async function deleteUser(id: number): Promise<void> {
  usersState.error = null;
  notify('users');
  try {
    await apiClient.deleteUser(id);
    usersState.data = usersState.data.filter((user) => user.id !== id);
  } catch (error) {
    usersState.error = (error as Error).message;
    throw error;
  } finally {
    notify('users');
  }
}

export function getUserName(id: number): string {
  const found = usersState.data.find((user) => user.id === id);
  return found ? found.name : `User #${id}`;
}

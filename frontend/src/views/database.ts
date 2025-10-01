import {
  createActivity,
  createUser,
  deleteActivity,
  deleteUser,
  getActivitiesState,
  getUsersState,
  loadActivities,
  loadUsers,
  subscribe
} from '../store';
import { Activity, User } from '../type';
import { createButton, createCard, el, renderList, setChildren, showMessage } from '../ui/dom';

export function renderDatabaseView(container: HTMLElement): () => void {
  const page = el('div', { className: 'page' });
  const pageHeader = el('div', { className: 'page-header' }, [
    el('h2', { textContent: 'Database' }),
    el('p', { className: 'page-subtitle', textContent: 'Manage users and activities list.' })
  ]);

  const grid = el('div', { className: 'dashboard-grid' });
  page.append(pageHeader, grid);
  container.replaceChildren(page);

  const usersCard = buildEntityCard<User>({
    title: 'Users',
    subtitle: 'User name to be tracked.',
    placeholder: 'User name',
    stateSelector: getUsersState,
    onCreate: (name) => createUser({ name }),
    onDelete: (id) => deleteUser(id)
  });

  const activitiesCard = buildEntityCard<Activity>({
    title: 'Activities',
    subtitle: 'Activity name to be tracked.',
    placeholder: 'Activity name',
    stateSelector: getActivitiesState,
    onCreate: (name) => createActivity({ name }),
    onDelete: (id) => deleteActivity(id)
  });

  grid.append(usersCard.element, activitiesCard.element);

  const unsubscribe = subscribe(['users', 'activities'], () => {
    usersCard.refresh();
    activitiesCard.refresh();
  });

  void loadUsers();
  void loadActivities();

  usersCard.refresh();
  activitiesCard.refresh();

  return () => {
    unsubscribe();
    usersCard.cleanup();
    activitiesCard.cleanup();
  };
}

interface EntityCardOptions<T> {
  title: string;
  subtitle: string;
  placeholder: string;
  stateSelector: () => { data: T[]; isLoading: boolean; error: string | null };
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function buildEntityCard<T extends { id: number; name: string }>(options: EntityCardOptions<T>) {
  const section = createCard('data-card');
  const header = el('div', { className: 'card-header' }, [
    el('h3', { className: 'section-title', textContent: options.title }),
    el('p', { className: 'card-subtitle', textContent: options.subtitle })
  ]);

  const form = document.createElement('form');
  form.className = 'form-row';
  form.autocomplete = 'off';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = options.placeholder;

  const submitButton = createButton('Add', 'primary', { type: 'submit' });

  form.append(input, submitButton);

  const feedback = el('p', { className: 'status-message' });
  const listContainer = el('div');

  section.append(header, form, feedback, el('div', { className: 'card-divider' }), listContainer);

  let isSubmitting = false;
  const deletingIds = new Set<number>();

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    if (isSubmitting) return;
    const trimmed = input.value.trim();
    if (!trimmed) return;
    isSubmitting = true;
    submitButton.disabled = true;
    input.disabled = true;
    showMessage(feedback, null, 'success');
    try {
      await options.onCreate(trimmed);
      input.value = '';
      showMessage(feedback, 'Created successfully.', 'success');
    } catch (error) {
      showMessage(feedback, (error as Error).message, 'error');
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
      input.disabled = false;
    }
  };

  form.addEventListener('submit', handleSubmit);

  const renderListItems = () => {
    const state = options.stateSelector();
    if (state.isLoading) {
      setChildren(listContainer, [el('div', { className: 'skeleton' })]);
      return;
    }
    if (state.error) {
      setChildren(listContainer, [
        el('p', { className: 'status-message status-error', textContent: state.error })
      ]);
      return;
    }
    renderList(listContainer, state.data, (item) => {
      const row = el('div', { className: 'item' });
      const name = el('span', { textContent: item.name });
      const deleteBtn = createButton('Delete', 'danger');
      deleteBtn.disabled = deletingIds.has(item.id);
      deleteBtn.addEventListener('click', async () => {
        if (deletingIds.has(item.id)) return;
        deletingIds.add(item.id);
        deleteBtn.disabled = true;
        showMessage(feedback, null, 'success');
        try {
          await options.onDelete(item.id);
          showMessage(feedback, 'Deleted.', 'success');
        } catch (error) {
          showMessage(feedback, (error as Error).message, 'error');
        } finally {
          deletingIds.delete(item.id);
          deleteBtn.disabled = false;
        }
      });
      row.append(name, deleteBtn);
      return row;
    });
  };

  return {
    element: section,
    refresh: renderListItems,
    cleanup: () => {
      form.removeEventListener('submit', handleSubmit);
    }
  };
}
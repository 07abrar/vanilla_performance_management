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
  const grid = el('div', { className: 'grid' });
  container.replaceChildren(grid);

  const usersCard = buildEntityCard<User>({
    title: 'Users',
    placeholder: 'Add a new user',
    stateSelector: getUsersState,
    onCreate: (name) => createUser({ name }),
    onDelete: (id) => deleteUser(id)
  });

  const activitiesCard = buildEntityCard<Activity>({
    title: 'Activities',
    placeholder: 'Add a new activity',
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
  placeholder: string;
  stateSelector: () => { data: T[]; isLoading: boolean; error: string | null };
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function buildEntityCard<T extends { id: number; name: string }>(options: EntityCardOptions<T>) {
  const card = createCard(options.title);
  const form = document.createElement('form');
  form.className = 'entity-form';
  form.autocomplete = 'off';

  const input = document.createElement('input');
  input.placeholder = options.placeholder;

  const button = createButton('Add', 'primary', { type: 'submit' });

  const controls = el('div', { className: 'inputs-inline' });
  const inputWrapper = el('div');
  inputWrapper.append(input);
  const buttonWrapper = el('div');
  buttonWrapper.style.maxWidth = '160px';
  buttonWrapper.append(button);
  controls.append(inputWrapper, buttonWrapper);

  form.append(controls);

  const feedback = el('div');
  form.append(feedback);

  const listContainer = el('div');

  card.append(form, listContainer);

  let isSubmitting = false;
  const deletingIds = new Set<number>();

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    if (isSubmitting) return;
    const trimmed = input.value.trim();
    if (!trimmed) return;
    isSubmitting = true;
    button.disabled = true;
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
      button.disabled = false;
      input.disabled = false;
    }
  };

  form.addEventListener('submit', handleSubmit);

  const renderListItems = () => {
    const state = options.stateSelector();
    if (state.isLoading) {
      setChildren(listContainer, [el('div', { className: 'loading-skeleton' })]);
      return;
    }
    if (state.error) {
      setChildren(listContainer, [el('div', { className: 'error-text', textContent: state.error })]);
      return;
    }
    renderList(listContainer, state.data, (item) => {
      const row = el('div', { className: 'list-item' });
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
    element: card,
    refresh: renderListItems,
    cleanup: () => {
      form.removeEventListener('submit', handleSubmit);
    }
  };
}
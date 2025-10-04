import dayjs from 'dayjs';
import {
  createTrack,
  deleteTrack,
  getActivitiesState,
  getTracksState,
  getActivityName,
  getUserName,
  getUsersState,
  loadActivities,
  loadTracks,
  loadUsers,
  subscribe
} from '../store';
import { Activity, Track, User } from '../type';
import { createButton, createCard, el, formatMinutes, setChildren } from '../ui/dom';
import { createTimePicker, roundToNextQuarterHour, toMinutes } from '../ui/timePicker';

interface FormState {
  date: string;
  start: string;
  end: string;
  userId: string;
  activityId: string;
  comment: string;
  errors: Partial<Record<'date' | 'start' | 'end' | 'user' | 'activity', string>>;
}

export function renderTracksView(container: HTMLElement): () => void {
  const page = el('div', { className: 'page' });
  const pageHeader = el('div', { className: 'page-header' }, [
    el('h2', { textContent: 'Tracks' }),
    el('p', { className: 'page-subtitle', textContent: 'Input what have been done today.' })
  ]);

  const card = createCard('data-card');
  const createHeader = el('div', { className: 'card-header' }, [
    el('h3', { className: 'section-title', textContent: 'Create a track' }),
    el('p', { className: 'card-subtitle', textContent: 'Input activities.' })
  ]);

  const form = document.createElement('form');
  form.className = 'track-form';

  const formGrid = el('div', { className: 'form-grid' });

  const today = dayjs();
  const startDefault = roundToNextQuarterHour(dayjs());
  const endDefault = startDefault.add(1, 'hour');

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = today.format('YYYY-MM-DD');

    const startTimePicker = createTimePicker(startDefault.format('HH:mm'));
  const endTimePicker = createTimePicker(endDefault.format('HH:mm'));

  const userSelect = document.createElement('select');
  const activitySelect = document.createElement('select');
  const commentInput = document.createElement('textarea');
  commentInput.placeholder = 'Optional comment';
  commentInput.rows = 2;

  const errorDate = el('div', { className: 'err' });
  const errorStart = el('div', { className: 'err' });
  const errorEnd = el('div', { className: 'err' });
  const errorUser = el('div', { className: 'err' });
  const errorActivity = el('div', { className: 'err' });

  const firstRow = el('div', { className: 'form-row form-row-3' });
  firstRow.append(
    createControl('Date', dateInput, errorDate),
    createControl('User', userSelect, errorUser),
    createControl('Activity', activitySelect, errorActivity)
  );

  const secondRow = el('div', { className: 'form-row form-row-2' });
  secondRow.append(
    createControl('Start time', startTimePicker.element, errorStart),
    createControl('End time', endTimePicker.element, errorEnd)
  );

  const thirdRow = el('div', { className: 'form-row form-row-1' });
  thirdRow.append(createControl('Comment', commentInput, null, true));

  formGrid.append(firstRow, secondRow, thirdRow);

  const actions = el('div', { className: 'form-actions' });
  const submitButton = createButton('Create track', 'primary', { type: 'submit' });
  actions.append(submitButton);

  const feedback = el('p', { className: 'status-message' });
  const messages = el('div', { className: 'form-messages' }, [feedback]);

  form.append(formGrid, actions, messages);

  const divider = el('div', { className: 'card-divider' });

  const listHeader = el('div', { className: 'card-header' }, [
    el('h3', { className: 'section-title', textContent: 'Existing tracks' }),
    el('p', { className: 'card-subtitle', textContent: 'List of activities that have been done.' })
  ]);

  const tableWrapper = el('div', { className: 'table-wrapper' });

  card.append(createHeader, form, divider, listHeader, tableWrapper);

  page.append(pageHeader, card);
  container.replaceChildren(page);

  const formState: FormState = {
    date: dateInput.value,
    start: startTimePicker.getValue(),
    end: endTimePicker.getValue(),
    userId: '',
    activityId: '',
    comment: '',
    errors: {}
  };

  const resetErrors = () => {
    [errorDate, errorStart, errorEnd, errorUser, errorActivity].forEach((element) => {
      element.textContent = '';
    });
  };

  const validate = (): boolean => {
    resetErrors();
    const errors: FormState['errors'] = {};
    if (!formState.date) errors.date = 'Date is required.';
    if (!formState.userId) errors.user = 'Select a user.';
    if (!formState.activityId) errors.activity = 'Select an activity.';
    const startMinutes = toMinutes(formState.start);
    const endMinutes = toMinutes(formState.end);
    if (endMinutes <= startMinutes) {
      errors.end = 'End time must be after start.';
    }
    if (Object.keys(errors).length > 0) {
      if (errors.date) errorDate.textContent = errors.date;
      if (errors.user) errorUser.textContent = errors.user;
      if (errors.activity) errorActivity.textContent = errors.activity;
      if (errors.end) errorEnd.textContent = errors.end;
      return false;
    }
    return true;
  };

  const updateSelectOptions = () => {
    populateSelect(userSelect, getUsersState().data, 'user');
    populateSelect(activitySelect, getActivitiesState().data, 'activity');
  };

  const handleFormChange = () => {
    formState.date = dateInput.value;
    formState.start = startTimePicker.getValue();
    formState.end = endTimePicker.getValue();
    formState.userId = userSelect.value;
    formState.activityId = activitySelect.value;
    formState.comment = commentInput.value;
  };

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    handleFormChange();
    if (!validate()) return;

    submitButton.disabled = true;
    feedback.textContent = '';
    feedback.className = 'status-message';

    const startDateTime = dayjs(`${formState.date}T${formState.start}`);
    const endDateTime = dayjs(`${formState.date}T${formState.end}`);

    try {
      await createTrack({
        user: Number(formState.userId),
        activity: Number(formState.activityId),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        comment: formState.comment.trim() ? formState.comment.trim() : undefined
      });
      await loadTracks(true);
      commentInput.value = '';
      formState.comment = '';
      const nextStart = startDateTime.add(1, 'hour');
      const nextEnd = endDateTime.add(1, 'hour');
      const dayEnd = dayjs(`${formState.date}T23:59`);
      const resolvedStart = nextStart.isAfter(dayEnd) ? dayEnd : nextStart;
      const resolvedEnd = nextEnd.isAfter(dayEnd) ? dayEnd : nextEnd;
      startTimePicker.setValue(resolvedStart.format('HH:mm'));
      endTimePicker.setValue(resolvedEnd.format('HH:mm'));
      handleFormChange();
      showSuccess(feedback, 'Track created!');
    } catch (error) {
      showError(feedback, (error as Error).message);
    } finally {
      submitButton.disabled = false;
    }
  };

  form.addEventListener('submit', handleSubmit);
  form.addEventListener('change', handleFormChange);
  form.addEventListener('input', handleFormChange);

  const renderTable = () => {
    const tracksState = getTracksState();

    if (tracksState.isLoading) {
      setChildren(tableWrapper, [el('div', { className: 'skeleton' })]);
      return;
    }

    if (tracksState.error) {
      setChildren(tableWrapper, [
        el('p', { className: 'status-message status-error', textContent: tracksState.error })
      ]);
      return;
    }

    if (!tracksState.data.length) {
      setChildren(tableWrapper, [el('p', { className: 'empty-state', textContent: 'No tracks yet.' })]);
      return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Date', 'Start', 'End', 'Duration', 'User', 'Activity', 'Comment', ''].forEach((heading) => {
      const th = document.createElement('th');
      th.textContent = heading;
      if (heading === '') {
        th.classList.add('text-right');
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    tracksState.data.forEach((track) => {
      const row = document.createElement('tr');
      const start = dayjs(track.start_time);
      const end = dayjs(track.end_time);
      const duration = end.diff(start, 'minute');

      appendCell(row, start.format('YYYY-MM-DD'));
      appendCell(row, start.format('HH:mm'));
      appendCell(row, end.format('HH:mm'));
      const durationCell = document.createElement('td');
      durationCell.appendChild(el('span', { className: 'badge', textContent: formatMinutes(duration) }));
      row.appendChild(durationCell);
      appendCell(row, getUserName(track.user_id));
      appendCell(row, getActivityName(track.activity_id));
      appendCell(row, track.comment ?? '—');
      const actionCell = document.createElement('td');
      actionCell.className = 'text-right';
      const deleteBtn = createButton('Delete', 'danger');
      deleteBtn.addEventListener('click', async () => {
        deleteBtn.disabled = true;
        try {
          await deleteTrack(track.id);
        } catch (error) {
          showError(feedback, (error as Error).message);
        } finally {
          deleteBtn.disabled = false;
        }
      });
      actionCell.appendChild(deleteBtn);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    setChildren(tableWrapper, [table]);
  };

  updateSelectOptions();
  void loadUsers();
  void loadActivities();
  void loadTracks(true);
  renderTable();

  const unsubscribe = subscribe(['tracks', 'users', 'activities'], () => {
    updateSelectOptions();
    renderTable();
  });

  return () => {
    unsubscribe();
    form.removeEventListener('submit', handleSubmit);
    form.removeEventListener('change', handleFormChange);
    form.removeEventListener('input', handleFormChange);
  };
}

function appendCell(row: HTMLTableRowElement, value: string): void {
  const cell = document.createElement('td');
  cell.textContent = value;
  row.appendChild(cell);
}

function populateSelect(select: HTMLSelectElement, items: (User | Activity)[], type: 'user' | 'activity'): void {
  const current = select.value;
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = type === 'user' ? 'Select a user' : 'Select an activity';
  select.appendChild(placeholder);
  items
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((item) => {
      const option = document.createElement('option');
      option.value = String(item.id);
      option.textContent = item.name;
      select.appendChild(option);
    });
  if (Array.from(select.options).some((option) => option.value === current)) {
    select.value = current;
  }
}

function createControl(
  label: string,
  input: HTMLElement,
  helper?: HTMLElement | null,
  optional = false
): HTMLElement {
  const wrapper = el('label', { className: 'control' });
  const labelText = el('span', { className: 'control-label', textContent: label });
  if (optional) {
    labelText.append(el('span', { className: 'control-optional', textContent: ' (optional)' }));
  }
  wrapper.append(labelText, input);
  if (helper) wrapper.append(helper);
  return wrapper;
}

function showSuccess(target: HTMLElement, message: string): void {
  target.textContent = message;
  target.className = 'status-message status-success';
}

function showError(target: HTMLElement, message: string): void {
  target.textContent = message;
  target.className = 'status-message status-error';
}
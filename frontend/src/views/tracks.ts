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
import { createTimePicker, roundToNextQuarterHour } from '../ui/timePicker';

interface FormState {
  startDate: string;
  start: string;
  endDate: string;
  end: string;
  userId: string;
  activityId: string;
  comment: string;
  errors: Partial<Record<'startDate' | 'endDate' | 'start' | 'end' | 'user' | 'activity', string>>;
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

  const startDateInput = document.createElement('input');
  startDateInput.type = 'date';
  startDateInput.value = today.format('YYYY-MM-DD');

  const endDateInput = document.createElement('input');
  endDateInput.type = 'date';
  endDateInput.value = startDateInput.value;

  const startTimePicker = createTimePicker(startDefault.format('HH:mm'));
  const endTimePicker = createTimePicker(endDefault.format('HH:mm'));

  const userSelect = document.createElement('select');
  const activitySelect = document.createElement('select');
  const commentInput = document.createElement('textarea');
  commentInput.placeholder = 'Optional comment';
  commentInput.rows = 2;

  const errorStartDate = el('div', { className: 'err' });
  const errorEndDate = el('div', { className: 'err' });
  const errorStart = el('div', { className: 'err' });
  const errorEnd = el('div', { className: 'err' });
  const errorUser = el('div', { className: 'err' });
  const errorActivity = el('div', { className: 'err' });

  const firstRow = el('div', { className: 'form-row form-row-3' });
  firstRow.append(
    createControl('Start date', startDateInput, errorStartDate),
    createControl('Start time', startTimePicker.element, errorStart),
    createControl('User', userSelect, errorUser)
  );

  const secondRow = el('div', { className: 'form-row form-row-3' });
  secondRow.append(
    createControl('End date', endDateInput, errorEndDate),
    createControl('End time', endTimePicker.element, errorEnd),
    createControl('Activity', activitySelect, errorActivity)
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

  const todayString = dayjs().format('YYYY-MM-DD');

  const listHeader = el('div', { className: 'card-header' }, [
    el('div', { className: 'card-header-main' }, [
      el('h3', { className: 'section-title', textContent: 'Existing tracks' }),
      el('p', { className: 'card-subtitle', textContent: 'List of activities that have been done.' })
    ]),
    createDateControls()
  ]);

  const tableWrapper = el('div', { className: 'table-wrapper' });

  card.append(createHeader, form, divider, listHeader, tableWrapper);

  page.append(pageHeader, card);
  container.replaceChildren(page);

  const formState: FormState = {
    startDate: startDateInput.value,
    start: startTimePicker.getValue(),
    endDate: endDateInput.value,
    end: endTimePicker.getValue(),
    userId: '',
    activityId: '',
    comment: '',
    errors: {}
  };

  const resetErrors = () => {
    [errorStartDate, errorEndDate, errorStart, errorEnd, errorUser, errorActivity].forEach((element) => {
      element.textContent = '';
    });
  };

  const validate = (): boolean => {
    resetErrors();
    const errors: FormState['errors'] = {};
    if (!formState.startDate) errors.startDate = 'Start date is required.';
    if (!formState.endDate) errors.endDate = 'End date is required.';
    if (!formState.userId) errors.user = 'Select a user.';
    if (!formState.activityId) errors.activity = 'Select an activity.';
    if (formState.start && formState.end && formState.startDate && formState.endDate) {
      const startDateTime = dayjs(`${formState.startDate}T${formState.start}`);
      const endDateTime = dayjs(`${formState.endDate}T${formState.end}`);
      if (!endDateTime.isAfter(startDateTime)) {
        errors.end = 'End date/time must be after start.';
        errors.endDate = 'End date/time must be after start.';
      }
    }
    if (Object.keys(errors).length > 0) {
      if (errors.startDate) errorStartDate.textContent = errors.startDate;
      if (errors.endDate) errorEndDate.textContent = errors.endDate;
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
    formState.startDate = startDateInput.value;
    formState.start = startTimePicker.getValue();
    formState.endDate = endDateInput.value;
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

    const startDateTime = dayjs(`${formState.startDate}T${formState.start}`);
    const endDateTime = dayjs(`${formState.endDate}T${formState.end}`);

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
      const nextStart = endDateTime;
      const nextEnd = nextStart.add(1, 'hour');
      startDateInput.value = nextStart.format('YYYY-MM-DD');
      endDateInput.value = nextEnd.format('YYYY-MM-DD');
      startTimePicker.setValue(nextStart.format('HH:mm'));
      endTimePicker.setValue(nextEnd.format('HH:mm'));
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

  let selectedDate = todayString;

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

    updateDateOptions(tracksState.data);

    const tracksForDay = tracksState.data.filter(
      (track) => dayjs(track.start_time).format('YYYY-MM-DD') === selectedDate
    );

    if (!tracksForDay.length) {
      setChildren(tableWrapper, [
        el('p', { className: 'empty-state', textContent: 'No tracks for this date.' })
      ]);
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

    tracksForDay.forEach((track) => {
      const row = document.createElement('tr');
      const start = dayjs(track.start_time);
      const end = dayjs(track.end_time);
      const duration = end.diff(start, 'minute');

      appendCell(row, start.format('YYYY-MM-DD'));
      appendCell(row, start.format('HH:mm'));
      const endCell = end.isSame(start, 'day')
        ? end.format('HH:mm')
        : `${end.format('YYYY-MM-DD')} ${end.format('HH:mm')}`;
      appendCell(row, endCell);
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

  function createDateControls(): HTMLElement {
    const wrapper = el('div', { className: 'date-controls' });
    const label = el('label', { className: 'date-label' }, [
      el('span', { className: 'control-label', textContent: 'Day' })
    ]);

    const selector = document.createElement('select');
    selector.addEventListener('change', () => {
      selectedDate = selector.value || todayString;
      renderTable();
    });

    label.append(selector);
    wrapper.append(label);

    const update = () => {
      updateDateOptions(getTracksState().data, selector);
    };

    update();

    return wrapper;
  }

  function updateDateOptions(tracks: Track[], selector?: HTMLSelectElement): void {
    const targetSelector = selector ?? (document.querySelector('.date-controls select') as HTMLSelectElement);

    if (!targetSelector) return;

    const datesSet = new Set<string>();
    tracks.forEach((track) => {
      datesSet.add(dayjs(track.start_time).format('YYYY-MM-DD'));
    });

    if (!datesSet.has(selectedDate)) {
      datesSet.add(selectedDate);
    }

    const dates = Array.from(datesSet).sort((a, b) => (dayjs(a).isBefore(b) ? 1 : -1));

    const currentValue = targetSelector.value || selectedDate;
    targetSelector.innerHTML = '';

    dates.forEach((date) => {
      const option = document.createElement('option');
      option.value = date;
      option.textContent = dayjs(date).format('YYYY-MM-DD');
      targetSelector.append(option);
    });

    if (dates.includes(currentValue)) {
      targetSelector.value = currentValue;
      selectedDate = currentValue;
    } else {
      targetSelector.value = selectedDate;
    }
  }

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
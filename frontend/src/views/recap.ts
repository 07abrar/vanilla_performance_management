import dayjs from 'dayjs';
import Chart from 'chart.js/auto';
import { getRecapState, loadRecap, subscribe } from '../store';
import { RecapMode } from '../type';
import { createButton, createCard, el, setChildren } from '../ui/dom';

interface RecapInputs {
  mode: RecapMode;
  date: string;
  weekStart: string;
  year: number;
  month: number;
}

export function renderRecapView(container: HTMLElement): () => void {
  const page = el('div', { className: 'page recap-page' });
  const pageHeader = el('div', { className: 'page-header' }, [
    el('h2', { textContent: 'Recap' }),
    el('p', { className: 'page-subtitle', textContent: 'Shows the conclusion of user activity.' })
  ]);

  const controlCard = createCard();
  controlCard.classList.add('control-panel');
  const controlGrid = el('div', { className: 'form-grid' });

  const today = dayjs();
  const inputs: RecapInputs = {
    mode: 'daily',
    date: today.format('YYYY-MM-DD'),
    weekStart: today.startOf('week').format('YYYY-MM-DD'),
    year: today.year(),
    month: today.month() + 1
  };

  const viewControl = createSelectControl('View', [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' }
  ]);
  const refreshButton = createButton('Refresh', 'primary');
  refreshButton.addEventListener('click', () => triggerLoad());

  viewControl.select.value = inputs.mode;

  const modeInputsContainer = el('div', { className: 'form-grid control-span-2' });

  viewControl.select.addEventListener('change', () => {
    inputs.mode = viewControl.select.value as RecapMode;
    renderModeInputs();
    triggerLoad();
  });

  const actions = el('div', { className: 'form-actions control-span-2' }, [refreshButton]);

  controlGrid.append(viewControl.wrapper, modeInputsContainer, actions);
  controlCard.append(controlGrid);

  const recapCard = createCard('recap-card');
  const summaryContainer = el('p', { className: 'recap-period' });
  recapCard.append(summaryContainer);

  const bodyContainer = el('div', { className: 'recap-body' });
  const canvas = document.createElement('canvas');
  const chartCard = el('div', { className: 'card recap-chart' }, [
    el('div', { className: 'chart-container' }, [canvas])
  ]);
  const tableContainer = el('div', { className: 'table-wrapper' });
  const tableCard = el('div', { className: 'card table-wrapper' }, [tableContainer]);
  bodyContainer.append(chartCard, tableCard);
  recapCard.append(bodyContainer);

  page.append(pageHeader, controlCard, recapCard);
  container.replaceChildren(page);

  let chart: Chart | null = null;

  function renderModeInputs(): void {
    const fields: HTMLElement[] = [];

    if (inputs.mode === 'daily') {
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.value = inputs.date;
      dateInput.addEventListener('input', () => {
        inputs.date = dateInput.value;
      });
      fields.push(createControl('Date', dateInput));
    }

    if (inputs.mode === 'weekly') {
      const weekInput = document.createElement('input');
      weekInput.type = 'date';
      weekInput.value = inputs.weekStart;
      weekInput.addEventListener('input', () => {
        inputs.weekStart = weekInput.value;
      });
      fields.push(createControl('Week start', weekInput));
    }

    if (inputs.mode === 'monthly') {
      const yearInput = document.createElement('input');
      yearInput.type = 'number';
      yearInput.min = '2000';
      yearInput.max = '2100';
      yearInput.value = String(inputs.year);
      yearInput.addEventListener('input', () => {
        inputs.year = Number(yearInput.value);
      });
      const monthInput = document.createElement('input');
      monthInput.type = 'number';
      monthInput.min = '1';
      monthInput.max = '12';
      monthInput.value = String(inputs.month);
      monthInput.addEventListener('input', () => {
        inputs.month = Number(monthInput.value);
      });
      fields.push(createControl('Year', yearInput));
      fields.push(createControl('Month', monthInput));
    }

    setChildren(modeInputsContainer, fields);
  }

  function triggerLoad(): void {
    const params: Record<string, string> = {};
    if (inputs.mode === 'daily') {
      params.date = inputs.date;
    } else if (inputs.mode === 'weekly') {
      params.week_start = inputs.weekStart;
    } else {
      params.year = String(inputs.year);
      params.month = String(inputs.month);
    }
    void loadRecap(inputs.mode, params);
  }

  function renderRecap(): void {
    const recapState = getRecapState();

    refreshButton.disabled = recapState.isLoading;
    refreshButton.textContent = recapState.isLoading ? 'Refreshing…' : 'Refresh';

    if (recapState.isLoading) {
      setChildren(summaryContainer, [el('span', { className: 'skeleton' })]);
      setChildren(tableContainer, [el('div', { className: 'skeleton' })]);
      destroyChart();
      return;
    }

    if (recapState.error) {
      setChildren(summaryContainer, [
        el('span', { className: 'status-message status-error', textContent: recapState.error })
      ]);
      setChildren(tableContainer, []);
      destroyChart();
      return;
    }

    if (!recapState.data) {
      setChildren(summaryContainer, [
        el('span', { className: 'status-message', textContent: 'No recap data yet.' })
      ]);
      setChildren(tableContainer, []);
      destroyChart();
      return;
    }

    const summary = recapState.data;
    const pieces = [
      `Period: ${summary.label}`,
      `${dayjs(summary.start).format('YYYY-MM-DD HH:mm')} → ${dayjs(summary.end).format('YYYY-MM-DD HH:mm')}`,
      `Total minutes: ${summary.total_minutes}`
    ];

    const summaryElements = pieces.flatMap((text, index) => {
      const elements: HTMLElement[] = [];
      elements.push(el('span', { textContent: text }));
      if (index < pieces.length - 1) {
        elements.push(el('span', { className: 'dot', attrs: { 'aria-hidden': 'true' } }));
      }
      return elements;
    });

    setChildren(summaryContainer, summaryElements);

    if (!summary.entries.length) {
      setChildren(tableContainer, [el('p', { className: 'empty-state', textContent: 'No data for the selected period.' })]);
      destroyChart();
      return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Activity', 'Minutes', '%'].forEach((label, index) => {
      const th = document.createElement('th');
      th.textContent = label;
      if (index > 0) th.classList.add('text-right');
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    summary.entries.forEach((entry) => {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      nameCell.textContent = entry.activity_name ?? `Activity #${entry.activity_id}`;
      const minutesCell = document.createElement('td');
      minutesCell.textContent = String(entry.minutes);
      minutesCell.className = 'text-right';
      const percentCell = document.createElement('td');
      percentCell.textContent = `${entry.percentage.toFixed(1)}%`;
      percentCell.className = 'text-right';
      row.append(nameCell, minutesCell, percentCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    setChildren(tableContainer, [table]);

    renderChart(summary.entries);
  }

  function renderChart(entries: { activity_name: string | null; activity_id: number; minutes: number }[]): void {
    destroyChart();
    if (!entries.length) return;
    chart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: entries.map((entry) => entry.activity_name ?? `Activity #${entry.activity_id}`),
        datasets: [
          {
            data: entries.map((entry) => entry.minutes),
            backgroundColor: generatePalette(entries.length)
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  function destroyChart(): void {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function generatePalette(count: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const hue = Math.round((360 / Math.max(1, count)) * i);
      colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
  }

  renderModeInputs();
  triggerLoad();
  renderRecap();

  const unsubscribe = subscribe(['recap'], renderRecap);

  return () => {
    unsubscribe();
    destroyChart();
  };
}

function createSelectControl(
  label: string,
  options: { label: string; value: string }[]
): { wrapper: HTMLElement; select: HTMLSelectElement } {
  const select = document.createElement('select');
  options.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    select.appendChild(opt);
  });
  return {
    wrapper: createControl(label, select),
    select
  };
}

function createControl(label: string, input: HTMLElement): HTMLElement {
  const wrapper = el('label', { className: 'control' });
  wrapper.append(el('span', { className: 'control-label', textContent: label }), input);
  return wrapper;
}
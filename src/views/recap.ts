import dayjs from 'dayjs';
import Chart from 'chart.js/auto';
import {
  getRecapState,
  loadRecap,
  subscribe
} from '../store';
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
  const card = createCard('Recap analytics');
  const controls = el('div', { className: 'controls' });

  const modeToggle = el('div', { className: 'segmented' });
  const modes: RecapMode[] = ['daily', 'weekly', 'monthly'];

  const today = dayjs();
  const inputs: RecapInputs = {
    mode: 'daily',
    date: today.format('YYYY-MM-DD'),
    weekStart: today.startOf('week').format('YYYY-MM-DD'),
    year: today.year(),
    month: today.month() + 1
  };

  const refreshButton = createButton('Refresh', 'primary');

  const modeButtons = modes.map((mode) => {
    const button = createButton(mode.charAt(0).toUpperCase() + mode.slice(1), '', { type: 'button' });
    button.classList.toggle('active', mode === inputs.mode);
    button.addEventListener('click', () => {
      inputs.mode = mode;
      modeButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
      renderModeInputs();
    });
    modeToggle.appendChild(button);
    return button;
  });

  const modeInputsContainer = el('div', { className: 'inputs-inline' });

  refreshButton.addEventListener('click', () => {
    triggerLoad();
  });

  controls.append(modeToggle, modeInputsContainer, refreshButton);
  card.append(controls);

  const recapCard = createCard('Summary');
  const summaryContainer = el('div');
  recapCard.append(summaryContainer);

  const chartAndTable = el('div', { className: 'grid' });
  const chartContainer = el('div', { className: 'card chart-container' });
  const canvas = document.createElement('canvas');
  chartContainer.append(canvas);
  const tableContainer = el('div', { className: 'card table-wrapper' });
  chartAndTable.append(chartContainer, tableContainer);

  container.replaceChildren(card, recapCard, chartAndTable);

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
      fields.push(createLabeledField('Date', dateInput));
    }

    if (inputs.mode === 'weekly') {
      const weekInput = document.createElement('input');
      weekInput.type = 'date';
      weekInput.value = inputs.weekStart;
      weekInput.addEventListener('input', () => {
        inputs.weekStart = weekInput.value;
      });
      fields.push(createLabeledField('Week start', weekInput));
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
      fields.push(createLabeledField('Year', yearInput));
      fields.push(createLabeledField('Month', monthInput));
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

    if (recapState.isLoading) {
      setChildren(summaryContainer, [el('div', { className: 'loading-skeleton' })]);
      setChildren(tableContainer, [el('div', { className: 'loading-skeleton' })]);
      return;
    }

    if (recapState.error) {
      setChildren(summaryContainer, [el('div', { className: 'error-text', textContent: recapState.error })]);
      setChildren(tableContainer, []);
      destroyChart();
      return;
    }

    if (!recapState.data) {
      setChildren(summaryContainer, [el('div', { className: 'muted', textContent: 'No recap data yet.' })]);
      setChildren(tableContainer, []);
      destroyChart();
      return;
    }

    const summary = recapState.data;
    const summaryText = `${summary.label}: ${dayjs(summary.start).format('YYYY-MM-DD HH:mm')} → ${dayjs(summary.end).format('YYYY-MM-DD HH:mm')} · ${summary.total_minutes} minutes`;
    setChildren(summaryContainer, [el('p', { textContent: summaryText })]);

    if (!summary.entries.length) {
      setChildren(tableContainer, [el('div', { className: 'empty-state', textContent: 'No activity recorded.' })]);
      destroyChart();
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Activity', 'Minutes', 'Percentage'].forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      if (label !== 'Activity') {
        th.style.textAlign = 'right';
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    summary.entries.forEach((entry) => {
      const row = document.createElement('tr');
      const activityCell = document.createElement('td');
      activityCell.textContent = entry.activity_name ?? `Activity #${entry.activity_id}`;
      const minutesCell = document.createElement('td');
      minutesCell.textContent = String(entry.minutes);
      minutesCell.style.textAlign = 'right';
      const percentCell = document.createElement('td');
      percentCell.textContent = `${entry.percentage.toFixed(1)}%`;
      percentCell.style.textAlign = 'right';
      row.append(activityCell, minutesCell, percentCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    setChildren(tableContainer, [table]);

    renderChart(summary);
  }

  function renderChart(summary: { entries: { activity_name: string | null; activity_id: number; minutes: number }[] }): void {
    destroyChart();
    chart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: summary.entries.map((entry) => entry.activity_name ?? `Activity #${entry.activity_id}`),
        datasets: [
          {
            data: summary.entries.map((entry) => entry.minutes),
            backgroundColor: generatePalette(summary.entries.length)
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
      const hue = Math.round((360 / count) * i);
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

function createLabeledField(label: string, input: HTMLElement): HTMLElement {
  const wrapper = el('div');
  const labelElement = el('label', { textContent: label });
  labelElement.append(input);
  wrapper.append(labelElement);
  return wrapper;
}
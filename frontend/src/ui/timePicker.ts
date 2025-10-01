import dayjs from 'dayjs';

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 5) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    options.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

export function createTimeSelect(defaultValue: string): HTMLSelectElement {
  const select = document.createElement('select');
  TIME_OPTIONS.forEach((time) => {
    const option = document.createElement('option');
    option.value = time;
    option.textContent = time;
    if (time === defaultValue) {
      option.selected = true;
    }
    select.append(option);
  });
  return select;
}

export function roundToNextFive(date: dayjs.Dayjs): dayjs.Dayjs {
  const remainder = date.minute() % 5;
  if (remainder === 0 && date.second() === 0) return date;
  return date.add(5 - remainder, 'minute').startOf('minute');
}

export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map((v) => parseInt(v, 10));
  const base = dayjs().hour(hours).minute(mins).second(0);
  const next = base.add(minutes, 'minute');
  return `${String(next.hour()).padStart(2, '0')}:${String(next.minute()).padStart(2, '0')}`;
}

export function toMinutes(time: string): number {
  const [hours, mins] = time.split(':').map((v) => parseInt(v, 10));
  return hours * 60 + mins;
}
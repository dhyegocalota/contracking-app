const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const DAYS_THRESHOLD = 7;

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function formatHoursMinutes(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatRelativeTime(date: Date): string {
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSeconds < SECONDS_PER_HOUR) {
    const minutes = Math.floor(diffSeconds / SECONDS_PER_MINUTE);
    const seconds = diffSeconds % SECONDS_PER_MINUTE;
    const parts = [minutes > 0 && `${minutes}min`, seconds > 0 && `${seconds}s`].filter(Boolean);
    return parts.join(' ') || '0s';
  }

  if (diffSeconds < SECONDS_PER_DAY) {
    const hours = Math.floor(diffSeconds / SECONDS_PER_HOUR);
    const minutes = Math.floor((diffSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    const parts = [`${hours}h`, minutes > 0 && `${minutes}min`].filter(Boolean);
    return parts.join(' ');
  }

  const days = Math.floor(diffSeconds / SECONDS_PER_DAY);
  if (days <= DAYS_THRESHOLD) return `${days} dias atrás`;

  return formatAbsoluteDate(date);
}

export function formatAbsoluteDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function formatShortDateTime(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} às ${formatHoursMinutes(date)}`;
}

export function formatTimeWithDate(date: Date): string {
  if (isToday(date)) return formatHoursMinutes(date);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${formatHoursMinutes(date)}`;
}

export function formatDayHeader(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

export function formatChartTime({ date, includeDate }: { date: Date; includeDate: boolean }): string {
  if (!includeDate) return formatHoursMinutes(date);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${formatHoursMinutes(date)}`;
}

export function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

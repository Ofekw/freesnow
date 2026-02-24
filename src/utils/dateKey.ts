export function isoDateInTimezone(date: Date, iana: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (year && month && day) return `${year}-${month}-${day}`;
  } catch { /* ignore */ }

  return date.toISOString().slice(0, 10);
}

export function todayIsoInTimezone(iana: string): string {
  return isoDateInTimezone(new Date(), iana);
}

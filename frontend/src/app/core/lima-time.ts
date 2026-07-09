const LIMA_TZ = 'America/Lima';

function limaParts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value])) as Record<string, string>;
  return { y: parts['year'], m: parts['month'], d: parts['day'], hh: parts['hour'] === '24' ? '00' : parts['hour'], mm: parts['minute'] };
}

export function limaDateString(date: Date = new Date()): string {
  const p = limaParts(date);
  return `${p.y}-${p.m}-${p.d}`;
}

export function limaDateTimeLocalString(date: Date = new Date()): string {
  const p = limaParts(date);
  return `${p.y}-${p.m}-${p.d}T${p.hh}:${p.mm}`;
}

export function minutesUntil(isoString: string): number {
  return Math.round((new Date(isoString).getTime() - Date.now()) / 60000);
}

// Minimal RFC 5545 generator. No dependency — an .ics file is a text
// format with hard line rules, and a library would be more surface than
// the twenty lines it replaces.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** RFC 5545 UTC timestamp: 20260830T063000Z */
function toIcsUtc(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Escaped per RFC 5545 §3.3.11: backslash first (so it can't double-escape
 * the sequences added after it), then semicolon, comma, and newline.
 */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Content lines must be folded at 75 octets. Outlook in particular drops
 * an event whose DESCRIPTION runs long and unfolded.
 */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length > 73) {
    parts.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  if (rest.length) parts.push(" " + rest);
  return parts.join("\r\n");
}

export interface CalendarEvent {
  uid: string;
  title: string;
  description: string;
  startISO: string;
  durationMinutes: number;
  url?: string;
  location?: string;
  organiserName?: string;
  organiserEmail?: string;
}

/** Returns null when the start date is missing or unparseable. */
export function buildIcs(event: CalendarEvent): string | null {
  const start = new Date(event.startISO);
  if (Number.isNaN(start.getTime())) return null;
  const minutes = event.durationMinutes > 0 ? event.durationMinutes : 60;
  const end = new Date(start.getTime() + minutes * 60_000);

  // DTSTAMP must be the moment the file was produced; every generated file
  // is a fresh one, so "now" is correct and no stored value is needed.
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//deepanshutyagi.live//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${esc(event.uid)}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${esc(event.title)}`,
    `DESCRIPTION:${esc(event.description)}`,
  ];
  if (event.location) lines.push(`LOCATION:${esc(event.location)}`);
  if (event.url) lines.push(`URL:${esc(event.url)}`);
  if (event.organiserEmail) {
    lines.push(
      `ORGANIZER;CN=${esc(event.organiserName || event.organiserEmail)}:mailto:${event.organiserEmail}`
    );
  }
  lines.push(
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  return lines.map(fold).join("\r\n") + "\r\n";
}

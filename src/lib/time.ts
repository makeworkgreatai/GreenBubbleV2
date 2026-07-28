// Timezone helpers for the app's Eastern-time display/inputs.

// Interpret a datetime-local string ("2026-07-28T13:30") or date-only
// ("2026-07-28") as Eastern wall-clock time and return the matching UTC Date.
// DST-safe (handles EDT and EST).
export function easternToUtc(local: string): Date | undefined {
  if (!local) return undefined;
  const [datePart, timePart = "00:00"] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if (!y || !m || !d) return undefined;

  const tzOffsetMinutes = (date: Date): number => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }).formatToParts(date).map((p) => [p.type, p.value])
    );
    const asUTC = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour === "24" ? "0" : parts.hour), Number(parts.minute), Number(parts.second)
    );
    return (asUTC - date.getTime()) / 60000;
  };

  let utc = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  for (let i = 0; i < 2; i++) {
    const off = tzOffsetMinutes(new Date(utc));
    utc = Date.UTC(y, m - 1, d, hh || 0, mm || 0) - off * 60000;
  }
  return new Date(utc);
}

// Format a UTC timestamp as an Eastern "YYYY-MM-DDTHH:mm" string for
// prefilling datetime-local inputs.
export function utcToEasternLocal(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    }).formatToParts(d).map((p) => [p.type, p.value])
  );
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

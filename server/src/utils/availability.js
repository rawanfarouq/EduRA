// server/src/utils/availability.js
export function isNowWithinAvailability(availability = []) {
  if (!Array.isArray(availability) || !availability.length) return false;

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  const minutesNow = now.getHours() * 60 + now.getMinutes();

  // date-based availability
  return availability.some((slot) => {
    if (!slot.date || slot.startMin == null || slot.endMin == null) return false;
    const slotDateISO = new Date(slot.date).toISOString().slice(0, 10);
    if (slotDateISO !== todayISO) return false;

    return minutesNow >= slot.startMin && minutesNow <= slot.endMin;
  });
}

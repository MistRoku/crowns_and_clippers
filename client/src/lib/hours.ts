import { DateTime } from 'luxon';
import type { ShopHoursEntry } from './api';

export interface OpenStatus {
  isOpen: boolean;
  /** e.g. "Open now, until 19:00" or "Closed. Opens Tuesday at 9:00" */
  text: string;
}

/**
 * Live open/closed status for the resolved shop, computed in the shop's own
 * time zone so it is correct for every visitor, anywhere in the world.
 */
export function getOpenStatus(
  hours: ShopHoursEntry[],
  timezone: string,
  now: DateTime = DateTime.now().setZone(timezone),
): OpenStatus {
  const dayIndex = now.weekday - 1; // hours arrays are Monday-first
  const today = hours[dayIndex];

  const parse = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    return now.set({ hour: h, minute: m, second: 0, millisecond: 0 });
  };

  if (today?.open && today?.close) {
    const open = parse(today.open);
    const close = parse(today.close);
    if (now >= open && now < close) {
      return { isOpen: true, text: `Open now, until ${today.close}` };
    }
    if (now < open) {
      return { isOpen: false, text: `Closed. Opens today at ${today.open}` };
    }
  }

  // Find the next opening day
  for (let i = 1; i <= 7; i++) {
    const candidate = now.plus({ days: i });
    const entry = hours[candidate.weekday - 1];
    if (entry?.open) {
      const dayLabel = i === 1 ? 'tomorrow' : candidate.toFormat('cccc');
      return { isOpen: false, text: `Closed. Opens ${dayLabel} at ${entry.open}` };
    }
  }

  return { isOpen: false, text: 'Closed' };
}

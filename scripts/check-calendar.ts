import { DateTime } from "luxon";
import { eventIdFor, freeBusy, insertEvent } from "../lib/calendar";
import { calendarIdFor } from "../lib/booking";
import { config, formatSlot, generateSlots } from "../lib/policy";

async function main() {
  const from = DateTime.now().toUTC().toISO()!;
  const to = DateTime.now().plus({ days: 8 }).toUTC().toISO()!;

  for (const rep of config.reps) {
    const calendarId = calendarIdFor(rep.id);
    if (!calendarId) {
      console.log(rep.name, "has no calendar id in .env.local");
      continue;
    }
    const busy = await freeBusy(calendarId, from, to);
    const slots = generateSlots(busy);
    console.log(rep.name, "busy blocks:", busy.length);
    console.log(rep.name, "slots:", slots.map(formatSlot));
  }

  const start = generateSlots([])[0];
  const end = DateTime.fromISO(start).plus({ minutes: config.slotMinutes }).toUTC().toISO()!;
  const result = await insertEvent(calendarIdFor("asha"), {
    id: eventIdFor("setup-check", start),
    summary: "Calendar setup check",
    description: "Created by scripts/check-calendar.ts",
    start,
    end,
    timeZone: config.timezone
  });
  console.log("test event:", result);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});

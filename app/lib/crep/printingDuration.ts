const examsPrintedPerHour = 100;
// If this is set to `30`, that means that we round to upper 30min (1h15 → 1h30, 15min → 30min, ...)
const roungindMinutes = 30;

export function getPrintingDurationInMinutes(nbExams: number): number {
  const durationInMinutes = (nbExams / examsPrintedPerHour) * 60;

  return Math.ceil(durationInMinutes / roungindMinutes) * roungindMinutes;
}

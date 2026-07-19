// Demo: current time message for Telegram (IST default)
const tz = $env.TELEGRAM_TIMEZONE || 'Asia/Kolkata';
const now = new Date();

const formatted = now.toLocaleString('en-IN', {
  timeZone: tz,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

return [
  {
    json: {
      text: `🕐 LifeSolveNow Demo\n${formatted}\n(${tz})`,
      timestamp: now.toISOString(),
      timezone: tz,
    },
  },
];

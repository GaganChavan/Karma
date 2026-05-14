// ─── KARMA APP — DATE UTILITIES (TIMEZONE FIX) ───────────────────────
// ROOT CAUSE OF BUGS 1,2,3: toISOString() returns UTC date.
// In IST (UTC+5:30), before 5:30 AM, toISOString() returns YESTERDAY.
// FIX: use getFullYear/getMonth/getDate directly — these use LOCAL time.

// Safe local date string from any Date object
const _localDate = (d) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export const DateUtils = {

  // FIX: was new Date().toISOString().split('T')[0]  → gives UTC date → wrong in IST
  today: () => _localDate(new Date()),

  toDateString: (date) => {
    if (typeof date === 'string') return date.split('T')[0];
    return _localDate(date);
  },

  getGreeting: () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  },

  getDayOfWeek: (date = new Date()) => {
    return ['Sunday','Monday','Tuesday','Wednesday',
            'Thursday','Friday','Saturday'][date.getDay()];
  },

  formatDate: (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  // FIX: was toISOString().split('T')[0] inside loop
  getLastNDays: (n) => {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(_localDate(d));
    }
    return days;
  },

  // FIX: was comparing to toISOString()
  isToday: (dateStr) => {
    return dateStr === _localDate(new Date());
  },

  isYesterday: (dateStr) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === _localDate(yesterday);
  },

  daysBetween: (dateStr1, dateStr2) => {
    const d1 = new Date(dateStr1 + 'T00:00:00');
    const d2 = new Date(dateStr2 + 'T00:00:00');
    return Math.abs(Math.floor((d2 - d1) / 86400000));
  },

  // FIX: all toISOString() calls replaced
  getWeekDates: () => {
    const today      = new Date();
    const dayOfWeek  = today.getDay();
    const monday     = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d       = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = _localDate(d);
      return {
        dateStr,
        label:   ['M','T','W','T','F','S','S'][i],
        isToday: dateStr === _localDate(new Date()),
      };
    });
  },
};
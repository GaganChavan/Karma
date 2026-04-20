// ─── KARMA APP — DATE UTILITIES ──────────────────────────────────────

export const DateUtils = {

  today: () => new Date().toISOString().split('T')[0],

  toDateString: (date) => {
    if (typeof date === 'string') return date.split('T')[0];
    return date.toISOString().split('T')[0];
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
    const date    = new Date(dateStr + 'T00:00:00');
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
  },

  getLastNDays: (n) => {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  },

  isToday: (dateStr) => {
    return dateStr === new Date().toISOString().split('T')[0];
  },

  isYesterday: (dateStr) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === yesterday.toISOString().split('T')[0];
  },

  daysBetween: (dateStr1, dateStr2) => {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    return Math.abs(Math.floor((d2 - d1) / 86400000));
  },

  getWeekDates: () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        dateStr: d.toISOString().split('T')[0],
        label:   ['M','T','W','T','F','S','S'][i],
        isToday: DateUtils.isToday(d.toISOString().split('T')[0]),
      };
    });
  },
};
// ─── KARMA APP — VALIDATION UTILITIES ───────────────────────────────
// Reusable validators. All return { valid: bool, message: string }.

export const Validators = {

  habitName: (name) => {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: "Habit name can't be empty, Gagan" };
    }
    if (name.trim().length < 3) {
      return { valid: false, message: 'Habit name must be at least 3 characters' };
    }
    if (name.trim().length > 50) {
      return { valid: false, message: 'Habit name must be under 50 characters' };
    }
    return { valid: true, message: '' };
  },

  habitType: (type) => {
    if (!['build', 'break'].includes(type)) {
      return { valid: false, message: 'Please select Build or Break habit type' };
    }
    return { valid: true, message: '' };
  },

  reminderTime: (time) => {
    if (!time) return { valid: true, message: '' }; // Optional
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regex.test(time)) {
      return { valid: false, message: 'Reminder time must be in HH:MM format (e.g. 06:00)' };
    }
    return { valid: true, message: '' };
  },

  note: (note) => {
    if (!note) return { valid: true, message: '' }; // Optional
    if (note.length > 300) {
      return { valid: false, message: 'Note must be under 300 characters' };
    }
    return { valid: true, message: '' };
  },

  goalDays: (days) => {
    if (days === undefined || days === null || days === '') {
      return { valid: true, message: '' }; // Optional
    }
    const n = parseInt(days);
    if (isNaN(n) || n < 0) {
      return { valid: false, message: 'Goal days must be a positive number' };
    }
    if (n > 3650) {
      return { valid: false, message: 'Goal days must be under 3650 (10 years)' };
    }
    return { valid: true, message: '' };
  },
};

// Validate a full habit object — returns array of error messages
export const validateHabitForm = (form) => {
  const errors = [];

  const nameResult = Validators.habitName(form.name);
  if (!nameResult.valid) errors.push(nameResult.message);

  const typeResult = Validators.habitType(form.type);
  if (!typeResult.valid) errors.push(typeResult.message);

  if (form.reminder_time) {
    const timeResult = Validators.reminderTime(form.reminder_time);
    if (!timeResult.valid) errors.push(timeResult.message);
  }

  if (form.goal_days !== undefined) {
    const goalResult = Validators.goalDays(form.goal_days);
    if (!goalResult.valid) errors.push(goalResult.message);
  }

  return errors; // Empty array = all valid
};
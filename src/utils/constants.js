export const EDUCATION_LEVELS = ['High School', 'Undergraduate', 'Graduate', 'PhD', 'Bootcamp', 'Self-Taught', 'Other'];

export const YEAR_OPTIONS = {
  'High School': ['Freshman', 'Sophomore', 'Junior', 'Senior'],
  'Undergraduate': ['Freshman', 'Sophomore', 'Junior', 'Senior', '5th Year+'],
  'Graduate': ['1st Year', '2nd Year', '3rd Year+'],
  'PhD': ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year+'],
  'Bootcamp': ['Month 1-3', 'Month 4-6', 'Month 7-9', 'Month 10-12'],
  'Self-Taught': ['Beginner', 'Intermediate', 'Advanced'],
  'Other': ['N/A']
};

export const checkPasswordStrength = (password) => {
  if (password.length === 0) return { score: 0, message: '', color: 'var(--text-tertiary)' };
  if (password.length < 8) return { score: 1, message: 'Too short (min 8 characters)', color: 'var(--text-primary)' };
  let score = 1;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;
  const messages = {
    1: { message: 'Weak', color: 'var(--text-primary)' },
    2: { message: 'Fair', color: 'var(--text-primary)' },
    3: { message: 'Moderate', color: 'var(--text-secondary)' },
    4: { message: 'Good', color: 'var(--text-secondary)' },
    5: { message: 'Strong', color: 'var(--text-primary)' }
  };
  return { score, ...messages[score] };
};

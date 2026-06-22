export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  'What city were you born in?',
  'What was the name of your first school?',
  'What is the name of your childhood best friend?',
];

export const normalizeSecurityAnswer = (answer: string) =>
  answer.trim().toLowerCase().replace(/\s+/g, ' ');

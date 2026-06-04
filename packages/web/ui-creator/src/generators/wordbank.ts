/**
 * Словари строк для fuzzer'а и preset'ов — лучше чем `lorem ipsum`, потому
 * что подсказывает «формообразный» контекст без хардкода конкретной формы.
 */

export const FIELD_LABELS: readonly string[] = [
  'Email',
  'Name',
  'Full name',
  'First name',
  'Last name',
  'Username',
  'Password',
  'Confirm password',
  'Phone',
  'Phone number',
  'Address',
  'City',
  'Country',
  'Zip code',
  'Company',
  'Job title',
  'Website',
  'Bio',
  'Subject',
  'Message',
];

export const FIELD_DESCRIPTIONS: readonly string[] = [
  'Optional',
  'Required',
  'Must be unique',
  'Used for login',
  'We never share this',
  'At least 8 characters',
  'Numbers and letters only',
];

export const CARD_TITLES: readonly string[] = [
  'Sign in',
  'Sign up',
  'Create account',
  'Welcome back',
  'Profile',
  'Account settings',
  'Personal info',
  'Contact us',
  'Get in touch',
  'Subscribe',
];

export const CARD_DESCRIPTIONS: readonly string[] = [
  'Enter your details below',
  'Fill in the form to continue',
  'All fields are required unless marked optional',
  'We will get back to you shortly',
  'Your information stays private',
];

export const BUTTON_PRIMARY_TEXTS: readonly string[] = [
  'Submit',
  'Save',
  'Continue',
  'Send',
  'Create',
  'Sign in',
  'Sign up',
  'Subscribe',
];

export const BUTTON_SECONDARY_TEXTS: readonly string[] = ['Cancel', 'Back', 'Reset', 'Clear'];

/** Сопоставление label → подходящий type у `<Input>` (для согласованности UX). */
export const labelToInputType = (
  label: string,
): 'text' | 'password' | 'email' | 'tel' | 'number' => {
  const lower = label.toLowerCase();
  if (lower.includes('email')) return 'email';
  if (lower.includes('password')) return 'password';
  if (lower.includes('phone')) return 'tel';
  if (lower.includes('zip') || lower.includes('age') || lower.includes('count')) return 'number';
  return 'text';
};

/** Placeholder из label'а (более полезный чем повтор label'а). */
export const labelToPlaceholder = (label: string): string => {
  const lower = label.toLowerCase();
  if (lower.includes('email')) return 'you@example.com';
  if (lower.includes('phone')) return '+1 555 123 4567';
  if (lower.includes('password')) return '••••••••';
  if (lower.includes('website')) return 'https://example.com';
  return label;
};

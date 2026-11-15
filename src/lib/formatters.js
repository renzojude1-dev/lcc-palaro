
import { TIME_ZONE } from './constants';

export const titleCase = (value) =>
  String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const formatDate = (value) => {
  if (!value) return 'TBA';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'TBA';

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: TIME_ZONE,
  }).format(date);
};

export const formatDateTime = (value) => {
  if (!value) return 'TBA';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'TBA';

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(date);
};

export const initials = (value) =>
  String(value || 'LCC')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

export const errorMessage = (error) =>
  error?.message || 'Something went wrong. Please try again.';


export function required(value, label = 'This field') {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return `${label} is required.`;
  }

  return '';
}

export function positiveInteger(value, label = 'Value') {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return `${label} must be a non-negative whole number.`;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number >= 0
    ? ''
    : `${label} must be a non-negative whole number.`;
}

export function validateImage(file, { maxMB = 5 } = {}) {
  if (!file) return '';

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];

  if (!allowedTypes.includes(file.type)) {
    return 'Choose a JPG, PNG, WebP, GIF, or SVG image.';
  }

  if (file.size > maxMB * 1024 * 1024) {
    return `Image must be ${maxMB} MB or smaller.`;
  }

  return '';
}

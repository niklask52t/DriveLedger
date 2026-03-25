/**
 * Shared utility functions for the DriveLedger API.
 */

/**
 * Converts a camelCase string to snake_case.
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Converts a snake_case string to camelCase.
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts all keys of an object from camelCase to snake_case.
 */
export function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[camelToSnake(key)] = obj[key];
  }
  return result;
}

/**
 * Converts all keys of an object from snake_case to camelCase.
 */
export function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[snakeToCamel(key)] = obj[key];
  }
  return result;
}

/**
 * Converts an array of DB rows to camelCase.
 */
export function rowsToCamelCase(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map(toCamelCase);
}

/**
 * Validates an email address format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password requirements: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number.
 */
export function isValidPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true, message: '' };
}

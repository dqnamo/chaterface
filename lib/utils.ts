import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts camelCase or snake_case strings to human-readable format
 * Examples: 
 * - firstName -> First Name
 * - first_name -> First Name
 * - user_id -> User ID
 */
export function humanizeColumnName(columnName: string): string {
  return columnName
    // Handle camelCase: firstName -> first Name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Handle snake_case: first_name -> first name
    .replace(/_/g, ' ')
    // Capitalize each word
    .replace(/\b\w/g, letter => letter.toUpperCase())
    // Handle common abbreviations
    .replace(/\bId\b/g, 'ID')
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bApi\b/g, 'API');
}

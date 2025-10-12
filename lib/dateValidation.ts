// Date validation utilities
// This file provides date validation functions to prevent future dates and ensure proper date logic

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates investment dates - no future dates allowed
 */
export function validateInvestmentDate(date: string): DateValidationResult {
  if (!date) {
    return { isValid: false, error: 'Investment date is required' };
  }

  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (isNaN(inputDate.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (inputDate > today) {
    return { isValid: false, error: 'Investment date cannot be in the future' };
  }

  // Check if date is too far in the past (more than 50 years)
  const fiftyYearsAgo = new Date();
  fiftyYearsAgo.setFullYear(today.getFullYear() - 50);
  
  if (inputDate < fiftyYearsAgo) {
    return { isValid: false, error: 'Investment date cannot be more than 50 years in the past' };
  }

  return { isValid: true };
}

/**
 * Validates financial record dates - no future dates allowed
 */
export function validateFinancialRecordDate(date: string): DateValidationResult {
  if (!date) {
    return { isValid: false, error: 'Financial record date is required' };
  }

  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (isNaN(inputDate.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (inputDate > today) {
    return { isValid: false, error: 'Financial record date cannot be in the future' };
  }

  // Check if date is too far in the past (more than 50 years)
  const fiftyYearsAgo = new Date();
  fiftyYearsAgo.setFullYear(today.getFullYear() - 50);
  
  if (inputDate < fiftyYearsAgo) {
    return { isValid: false, error: 'Financial record date cannot be more than 50 years in the past' };
  }

  return { isValid: true };
}

/**
 * Validates valuation dates - no future dates allowed
 */
export function validateValuationDate(date: string): DateValidationResult {
  if (!date) {
    return { isValid: false, error: 'Valuation date is required' };
  }

  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (isNaN(inputDate.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (inputDate > today) {
    return { isValid: false, error: 'Valuation date cannot be in the future' };
  }

  // Check if date is too far in the past (more than 50 years)
  const fiftyYearsAgo = new Date();
  fiftyYearsAgo.setFullYear(today.getFullYear() - 50);
  
  if (inputDate < fiftyYearsAgo) {
    return { isValid: false, error: 'Valuation date cannot be more than 50 years in the past' };
  }

  return { isValid: true };
}

/**
 * Validates employee joining dates - no future dates allowed
 */
export function validateJoiningDate(date: string): DateValidationResult {
  if (!date) {
    return { isValid: false, error: 'Joining date is required' };
  }

  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (isNaN(inputDate.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (inputDate > today) {
    return { isValid: false, error: 'Joining date cannot be in the future' };
  }

  // Check if date is too far in the past (more than 50 years)
  const fiftyYearsAgo = new Date();
  fiftyYearsAgo.setFullYear(today.getFullYear() - 50);
  
  if (inputDate < fiftyYearsAgo) {
    return { isValid: false, error: 'Joining date cannot be more than 50 years in the past' };
  }

  return { isValid: true };
}

/**
 * Validates company registration dates - no future dates allowed
 */
export function validateRegistrationDate(date: string): DateValidationResult {
  if (!date) {
    return { isValid: false, error: 'Registration date is required' };
  }

  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (isNaN(inputDate.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (inputDate > today) {
    return { isValid: false, error: 'Registration date cannot be in the future' };
  }

  // Check if date is too far in the past (more than 100 years)
  const hundredYearsAgo = new Date();
  hundredYearsAgo.setFullYear(today.getFullYear() - 100);
  
  if (inputDate < hundredYearsAgo) {
    return { isValid: false, error: 'Registration date cannot be more than 100 years in the past' };
  }

  return { isValid: true };
}

/**
 * Gets the maximum allowed date string (today) for HTML date inputs
 */
export function getMaxAllowedDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Validates employee increment dates - must be after joining date and not in the future
 */
export function validateIncrementDate(incrementDate: string, joiningDate: string): DateValidationResult {
  if (!incrementDate) {
    return { isValid: false, error: 'Increment date is required' };
  }

  if (!joiningDate) {
    return { isValid: false, error: 'Employee joining date is required for validation' };
  }

  const incrementDateObj = new Date(incrementDate);
  const joiningDateObj = new Date(joiningDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (isNaN(incrementDateObj.getTime())) {
    return { isValid: false, error: 'Invalid increment date format' };
  }

  if (isNaN(joiningDateObj.getTime())) {
    return { isValid: false, error: 'Invalid joining date format' };
  }

  // Check if increment date is in the future
  if (incrementDateObj > today) {
    return { isValid: false, error: 'Increment date cannot be in the future' };
  }

  // Check if increment date is before joining date
  if (incrementDateObj < joiningDateObj) {
    return { isValid: false, error: `Increment date cannot be before the employee's joining date (${joiningDate}). Please select a date on or after the joining date.` };
  }

  return { isValid: true };
}

/**
 * Gets the minimum allowed date string (50 years ago) for HTML date inputs
 */
export function getMinAllowedDateString(): string {
  const fiftyYearsAgo = new Date();
  fiftyYearsAgo.setFullYear(fiftyYearsAgo.getFullYear() - 50);
  return fiftyYearsAgo.toISOString().split('T')[0];
}

/**
 * Validation Utilities
 * Common validation functions
 */

/**
 * Validate mobile number (10 digits)
 */
export function validateMobile(mobile) {
  if (!mobile) return 'Mobile number is required';
  if (!/^\d{10}$/.test(mobile)) return 'Mobile number must be 10 digits';
  return null;
}

/**
 * Validate email
 */
export function validateEmail(email) {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email address';
  return null;
}

/**
 * Validate required field
 */
export function validateRequired(value, fieldName) {
  if (!value || !value.trim()) return `${fieldName} is required`;
  return null;
}

/**
 * Validate password length
 */
export function validatePassword(password, minLength = 6) {
  if (!password) return 'Password is required';
  if (password.length < minLength) return `Password must be at least ${minLength} characters`;
  return null;
}

/**
 * Validate file size
 */
export function validateFileSize(file, maxSizeMB = 5) {
  if (!file) return 'File is required';
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) return `File size must be less than ${maxSizeMB}MB`;
  return null;
}

/**
 * Validate image file
 */
export function validateImageFile(file) {
  if (!file) return 'Image is required';
  if (!file.type.startsWith('image/')) return 'Only image files allowed';
  return null;
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AuthError, User } from 'firebase/auth';
import type { AuthErrorResponse } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Convert Firebase auth error to user-friendly message
 */
export const getAuthErrorMessage = (error: AuthError): AuthErrorResponse => {
  const errorMessages: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address format',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/operation-not-allowed': 'This operation is not allowed',
    'auth/requires-recent-login': 'Please log in again to perform this action',
  };

  return {
    code: error.code,
    message: errorMessages[error.code] || error.message || 'An authentication error occurred'
  };
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

/**
 * Type guard to check if error is an AuthError
 */
export const isAuthError = (error: unknown): error is AuthError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as AuthError).code === 'string' &&
    (error as AuthError).code.startsWith('auth/')
  );
};

/**
 * Type guard to check if user is authenticated
 */
export const isUserAuthenticated = (user: User | null): user is User => {
  return user !== null;
};


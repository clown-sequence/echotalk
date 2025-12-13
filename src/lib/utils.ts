import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AuthError, User } from 'firebase/auth';
import type { Timestamp } from "firebase/firestore";
import type { AuthErrorResponse, UserDocument, UserPresence } from "../types";

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

export const formatLastSeen = (lastSeen: Timestamp | null | undefined): string => {
  if (!lastSeen) return 'Never';

  try {
    const now = new Date();
    const lastSeenDate = lastSeen.toDate();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return lastSeenDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day : 'numeric',
      year: lastSeenDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  } catch (error) {
    console.error('Error formatting last seen:', error);
    return 'Unknown';
  }
};

/**
 * Get status text based on presence
 */
export const getStatusText = (presence: UserPresence | null | undefined): string => {
  if (!presence) return 'Offline';
  if (presence.isOnline) return 'Online';
  return `Last seen ${formatLastSeen(presence.lastSeen)}`;
};

/**
 * Get short status text
 */
export const getShortStatusText = (presence: UserPresence | null | undefined): string => {
  if (!presence) return 'Offline';
  if (presence.isOnline) return 'Online';
  return formatLastSeen(presence.lastSeen);
};

/**
 * Format exact timestamp for tooltips
 */
export const formatExactTimestamp = (timestamp: Timestamp | null | undefined): string => {
  if (!timestamp) return 'Unknown';
  
  try {
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting exact timestamp:', error);
    return 'Unknown';
  }
};


export const userToUserDocument = (user: User): UserDocument => {
  return {
    uid: user.uid,
    displayName: user.displayName || 'Unknown User',
    email: user.email || '',
    userImg: user.photoURL || undefined,
  };
};

/**
 * Converts array of Users to UserDocuments
 */
export const usersToUserDocuments = (users: User[]): UserDocument[] => {
  return users.map(userToUserDocument);
};

/**
 * Safely gets display name from user object
 */
export const getDisplayName = (user: User | UserDocument | null | undefined): string => {
  if (!user) return 'Unknown User';
  
  if ('displayName' in user) {
    return user.displayName || 'Unknown User';
  }
  
  return 'Unknown User';
};

/**
 * Safely gets user image from user object
 */
export const getUserImage = (user: User | UserDocument | null | undefined): string => {
  if (!user) return '';
  
  if ('userImg' in user && user.userImg) {
    return user.userImg;
  }
  
  if ('photoURL' in user && user.photoURL) {
    return user.photoURL;
  }
  
  return 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100&fit=crop';
};
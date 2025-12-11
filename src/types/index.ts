import type { User, UserCredential } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  displayName?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  userImg?: string;
}

export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserPresence {
  uid: string;
  isOnline: boolean;
  lastSeen: Timestamp | null;
  lastActivity: Timestamp | null;
}

export interface UserDocument {
  uid: string;
  email: string;
  displayName: string | null;
  userImg: string | null;
  role: 'admin' | 'user';
  presence?: UserPresence;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuthContextType {
  // State
  user: User | null;
  loading: boolean;
  error: AuthErrorResponse | null;
  isOnline: boolean;
  
  // Methods
  signIn: (credentials: SignInCredentials) => Promise<UserCredential>;
  signUp: (credentials: SignUpCredentials) => Promise<UserCredential>;
  logout: () => Promise<void>;
  clearError: () => void;
  
  // Profile update methods
  updateUserProfile: (data: UpdateProfileData) => Promise<void>;
  updateUserPassword: (data: UpdatePasswordData) => Promise<void>;
  
  // Helper methods
  isAuthenticated: boolean;
  getUserId: () => string | null;
  getUserEmail: () => string | null;
  getUserDisplayName: () => string | null;
  getUserDoc: () => Promise<UserDocument | null>;
}

export interface AuthErrorResponse {
  code: string;
  message: string;
}
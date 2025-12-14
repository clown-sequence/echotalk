import { createContext, useState, useEffect, type ReactNode, useContext } from 'react';
import { 
  type User,
  type UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type AuthError
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp,
  type DocumentReference,
  type DocumentSnapshot
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { 
  AuthContextType, 
  AuthErrorResponse,
  SignInCredentials,
  SignUpCredentials,
  UpdateProfileData,
  UpdatePasswordData,
  UserDocument
} from '../types';
import { 
  getAuthErrorMessage, 
  isValidEmail, 
  isValidPassword 
} from '../lib/utils';

// ============================================
// CONTEXT CREATION
// ============================================

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// FIRESTORE USER MANAGEMENT FUNCTIONS
// ============================================

/**
 * Create or update user document in Firestore
 * Enhanced with better error handling and logging
 */
async function createOrUpdateUserDocument(
  user: User,
  additionalData?: Partial<Omit<UserDocument, 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!user) {
    console.error('❌ No user provided to createOrUpdateUserDocument');
    return;
  }

  console.log('📝 Starting createOrUpdateUserDocument for:', user.uid);
  console.log('📝 User email:', user.email);
  console.log('📝 Additional data:', additionalData);
  console.log('📝 Additional data:', user);

  const userRef: DocumentReference = doc(db, 'users', user.uid);
  
  try {
    console.log('🔍 Checking if user document exists...');
    const userSnapshot: DocumentSnapshot = await getDoc(userRef);
    
    if (!userSnapshot.exists()) {
      console.log('✨ User document does NOT exist, creating new one...');
      
      // Create new user document with server timestamps
      const userData: Omit<UserDocument, 'createdAt' | 'updatedAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>;
        updatedAt: ReturnType<typeof serverTimestamp>;
      } = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName,
        userImg: user.photoURL || undefined,
        role: 'user' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...additionalData
      };
      
      console.log('📄 User data to be created:', userData);
      
      await setDoc(userRef, userData);
      console.log('✅ User document created successfully:', user.uid);
      
      // Verify the document was created
      const verifySnapshot = await getDoc(userRef);
      if (verifySnapshot.exists()) {
        console.log('✅ Verified: Document exists in Firestore');
        console.log('📄 Document data:', verifySnapshot.data());
      } else {
        console.error('❌ WARNING: Document was not found after creation!');
      }
    } else {
      console.log('📝 User document exists, updating...');
      
      // Update existing user document
      const updateData: Partial<Omit<UserDocument, 'createdAt'>> & {
        updatedAt: ReturnType<typeof serverTimestamp>;
      } = {
        email: user.email || '',
        displayName: user.displayName || undefined,
        userImg: user.photoURL || undefined,
        updatedAt: serverTimestamp(),
        ...additionalData
      };
      
      console.log('📄 Update data:', updateData);
      
      await setDoc(userRef, updateData, { merge: true });
      console.log('✅ User document updated successfully:', user.uid);
    }
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; name?: string };
    
    console.error('❌ ERROR in createOrUpdateUserDocument:');
    console.error('Error code:', err?.code);
    console.error('Error message:', err?.message);
    console.error('Error name:', err?.name);
    console.error('Full error:', error);
    
    // Handle offline errors gracefully
    if (err?.code === 'unavailable' || err?.message?.includes('offline')) {
      console.warn('⚠️ Cannot sync user document while offline. Will sync when connection is restored.');
      return;
    }
    
    // Handle permission errors
    if (err?.code === 'permission-denied') {
      console.error('❌ PERMISSION DENIED: Check your Firestore security rules!');
      console.error('Make sure you have rules like:');
      console.error(`
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /users/{userId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
        }
      }`);
    }
    
    throw error;
  }
}

/**
 * Get user document from Firestore
 */
async function getUserDocument(uid: string): Promise<UserDocument | null> {
  try {
    console.log('🔍 Fetching user document for:', uid);
    const userRef: DocumentReference = doc(db, 'users', uid);
    const userSnapshot: DocumentSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
      console.log('✅ User document found');
      return userSnapshot.data() as UserDocument;
    }
    console.log('⚠️ User document not found');
    return null;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('❌ Error fetching user document:', error);
    
    // Handle offline errors gracefully
    if (err?.code === 'unavailable' || err?.message?.includes('offline')) {
      console.warn('⚠️ Cannot fetch user document while offline.');
      return null;
    }
    return null;
  }
}

/**
 * Update user document in Firestore
 */
async function updateUserDocumentInFirestore(
  uid: string,
  data: Partial<Omit<UserDocument, 'uid' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    console.log('📝 Updating user document:', uid);
    const userRef: DocumentReference = doc(db, 'users', uid);
    const updateData: typeof data & { updatedAt: ReturnType<typeof serverTimestamp> } = {
      ...data,
      updatedAt: serverTimestamp()
    };
    await updateDoc(userRef, updateData);
    console.log('✅ User document updated in Firestore:', uid);
  } catch (error: unknown) {
    console.error('❌ Error updating user document:', error);
    throw error;
  }
}

// ============================================
// AUTH PROVIDER COMPONENT
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthErrorResponse | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = (): void => {
      console.log('🌐 Connection restored');
      setIsOnline(true);
    };
    
    const handleOffline = (): void => {
      console.warn('📡 Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    console.log('🔐 Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser: User | null): Promise<void> => {
        console.log('🔐 Auth state changed:', currentUser?.email || 'No user');
        
        if (currentUser) {
          console.log('👤 Current user UID:', currentUser.uid);
          console.log('👤 Current user email:', currentUser.email);
          
          try {
            // Wait a bit to ensure auth is fully settled
            await new Promise(resolve => setTimeout(resolve, 500));
            await createOrUpdateUserDocument(currentUser);
          } catch (err: unknown) {
            console.error('❌ Failed to sync user document:', err);
          }
        }
        
        setUser(currentUser);
        setLoading(false);
      },
      (error: Error): void => {
        console.error('❌ Auth state change error:', error);
        
        if ('code' in error && typeof (error as AuthError).code === 'string') {
          setError(getAuthErrorMessage(error as AuthError));
        } else {
          setError({
            code: 'auth/unknown',
            message: error.message || 'An unknown error occurred'
          });
        }
        setLoading(false);
      }
    );

    return () => {
      console.log('🔐 Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  /**
   * Sign up with email and password
   * Enhanced with better Firestore document creation
   */
  const signUp = async (
    credentials: SignUpCredentials
  ): Promise<UserCredential> => {
    const { email, password, displayName } = credentials;
    
    try {
      setError(null);
      console.log('📝 Starting sign up process...');
      console.log('📝 Email:', email);
      console.log('📝 Display name:', displayName);
      
      if (!email || !password) {
        const validationError: AuthErrorResponse = {
          code: 'auth/invalid-input',
          message: 'Email and password are required'
        };
        setError(validationError);
        throw new Error(validationError.message);
      }

      if (!isValidEmail(email)) {
        const validationError: AuthErrorResponse = {
          code: 'auth/invalid-email',
          message: 'Invalid email address format'
        };
        setError(validationError);
        throw new Error(validationError.message);
      }

      const passwordValidation: { valid: boolean; message?: string } = isValidPassword(password);
      if (!passwordValidation.valid) {
        const validationError: AuthErrorResponse = {
          code: 'auth/weak-password',
          message: passwordValidation.message || 'Invalid password'
        };
        setError(validationError);
        throw new Error(validationError.message);
      }

      setLoading(true);
      
      console.log('🔑 Creating Firebase Auth user...');
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth, 
        email.trim(), 
        password
      );
      
      console.log('✅ Firebase Auth user created:', userCredential.user.uid);
      
      // Update profile with display name BEFORE creating Firestore document
      if (displayName && userCredential.user) {
        console.log('📝 Updating auth profile with display name...');
        await updateProfile(userCredential.user, {
          displayName: displayName.trim()
        });
        console.log('✅ Auth profile updated');
        
        // Refresh the user to get updated profile
        await userCredential.user.reload();
      }
      
      // CRITICAL: Create Firestore document AFTER profile update
      console.log('📄 Creating Firestore user document...');
      try {
        await createOrUpdateUserDocument(userCredential.user, {
          displayName: displayName?.trim() || undefined
        });
        console.log('✅ Firestore document creation completed');
      } catch (firestoreError) {
        console.error('❌ CRITICAL: Failed to create Firestore document:', firestoreError);
        // Don't throw here - the auth account is already created
        // Instead, the onAuthStateChanged listener will retry
      }
      
      console.log('✅ Sign up process completed successfully');
      return userCredential;
      
    } catch (err: unknown) {
      const authError = err as AuthError;
      const errorResponse: AuthErrorResponse = getAuthErrorMessage(authError);
      
      console.error('❌ Sign up error:', errorResponse);
      
      if (authError.code === 'auth/email-already-in-use') {
        errorResponse.message = 'An account with this email already exists. Please sign in instead.';
      }
      
      setError(errorResponse);
      throw new Error(errorResponse.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (
    credentials: SignInCredentials
  ): Promise<UserCredential> => {
    const { email, password } = credentials;
    
    try {
      setError(null);
      console.log('🔑 Starting sign in process...');
      console.log('🔑 Email:', email);
      
      if (!email || !password) {
        const validationError: AuthErrorResponse = {
          code: 'auth/invalid-input',
          message: 'Email and password are required'
        };
        setError(validationError);
        throw new Error(validationError.message);
      }

      if (!isValidEmail(email)) {
        const validationError: AuthErrorResponse = {
          code: 'auth/invalid-email',
          message: 'Invalid email address format'
        };
        setError(validationError);
        throw new Error(validationError.message);
      }

      setLoading(true);
      
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth, 
        email.trim(), 
        password
      );
      
      console.log('✅ Sign in successful:', userCredential.user.email);
      
      // The onAuthStateChanged listener will handle Firestore document creation
      // But we can also try it here for immediate consistency
      try {
        await createOrUpdateUserDocument(userCredential.user);
      } catch (firestoreError) {
        console.warn('⚠️ Could not update Firestore on sign in, will retry:', firestoreError);
      }
      
      return userCredential;
      
    } catch (err: unknown) {
      const authError = err as AuthError;
      const errorResponse: AuthErrorResponse = getAuthErrorMessage(authError);
      
      console.error('❌ Sign in error:', errorResponse);
      
      if (authError.code === 'auth/user-not-found') {
        errorResponse.message = 'No account found with this email address. Please sign up first.';
      } else if (authError.code === 'auth/wrong-password') {
        errorResponse.message = 'Incorrect password. Please try again.';
      } else if (authError.code === 'auth/invalid-credential') {
        errorResponse.message = 'Invalid email or password. Please check your credentials.';
      }
      
      setError(errorResponse);
      throw new Error(errorResponse.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user profile (displayName, userImg)
   */
  const updateUserProfile = async (data: UpdateProfileData): Promise<void> => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('You must be logged in to update your profile');
      }

      setLoading(true);

      const updateData: { displayName?: string; photoURL?: string } = {};
      if (data.displayName !== undefined) {
        updateData.displayName = data.displayName;
      }
      if (data.userImg !== undefined) {
        updateData.photoURL = data.userImg;
      }

      if (Object.keys(updateData).length > 0) {
        await updateProfile(user, updateData);
      }

      const firestoreData: Partial<Omit<UserDocument, 'uid' | 'createdAt' | 'updatedAt'>> = {};
      if (data.displayName !== undefined) {
        firestoreData.displayName = data.displayName;
      }
      if (data.userImg !== undefined) {
        firestoreData.userImg = data.userImg;
      }

      if (Object.keys(firestoreData).length > 0) {
        await updateUserDocumentInFirestore(user.uid, firestoreData);
      }

      console.log('✅ Profile updated successfully');
    } catch (err: unknown) {
      const error = err as Error;
      const errorResponse: AuthErrorResponse = {
        code: 'profile/update-failed',
        message: error.message || 'Failed to update profile'
      };
      setError(errorResponse);
      console.error('❌ Profile update error:', errorResponse);
      throw new Error(errorResponse.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user password with current password verification
   */
  const updateUserPassword = async (data: UpdatePasswordData): Promise<void> => {
    try {
      setError(null);
      
      if (!user || !user.email) {
        throw new Error('You must be logged in to update your password');
      }

      if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
        throw new Error('All password fields are required');
      }

      if (data.newPassword !== data.confirmPassword) {
        throw new Error('New password and confirm password do not match');
      }

      if (data.currentPassword === data.newPassword) {
        throw new Error('New password must be different from current password');
      }

      const passwordValidation: { valid: boolean; message?: string } = isValidPassword(data.newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message || 'Invalid new password');
      }

      setLoading(true);

      const credential = EmailAuthProvider.credential(
        user.email,
        data.currentPassword
      );

      try {
        await reauthenticateWithCredential(user, credential);
      } catch (reauthError: unknown) {
        const authError = reauthError as AuthError;
        if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
          throw new Error('Current password is incorrect');
        }
        throw new Error('Failed to verify current password');
      }

      await updatePassword(user, data.newPassword);
      await updateUserDocumentInFirestore(user.uid, {});

      console.log('✅ Password updated successfully');
    } catch (err: unknown) {
      const error = err as Error;
      const errorResponse: AuthErrorResponse = {
        code: 'password/update-failed',
        message: error.message || 'Failed to update password'
      };
      setError(errorResponse);
      console.error('❌ Password update error:', errorResponse);
      throw new Error(errorResponse.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout current user
   */
  const logout = async (): Promise<void> => {
    try {
      setError(null);
      await signOut(auth);
      console.log('✅ Logout successful');
    } catch (err: unknown) {
      const authError = err as AuthError;
      const errorResponse: AuthErrorResponse = getAuthErrorMessage(authError);
      setError(errorResponse);
      console.error('❌ Logout error:', errorResponse);
      throw new Error(errorResponse.message);
    }
  };

  /**
   * Clear error state
   */
  const clearError = (): void => {
    setError(null);
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated: boolean = !!user;

  /**
   * Get current user ID
   */
  const getUserId = (): string | null => {
    return user?.uid || null;
  };

  /**
   * Get current user email
   */
  const getUserEmail = (): string | null => {
    return user?.email || null;
  };

  /**
   * Get current user display name
   */
  const getUserDisplayName = (): string | null => {
    return user?.displayName || null;
  };

  /**
   * Get user document from Firestore
   */
  const getUserDoc = async (): Promise<UserDocument | null> => {
    if (!user) return null;
    return await getUserDocument(user.uid);
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    isOnline,
    signIn,
    signUp,
    logout,
    clearError,
    updateUserProfile,
    updateUserPassword,
    isAuthenticated,
    getUserId,
    getUserEmail,
    getUserDisplayName,
    getUserDoc,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// CUSTOM HOOK
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Wrap your component tree with <AuthProvider>.'
    );
  }
  
  return context;
}
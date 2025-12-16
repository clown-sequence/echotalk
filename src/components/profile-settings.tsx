import React, { useState, type ChangeEvent, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, User, Mail, Lock, Image as ImageIcon, Check, X, Eye, EyeOff,
  Upload, Trash2, Shield, Calendar, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/auth-contexts';

interface PasswordStrength {
  strength: number;
  label: string;
  color: string;
}

interface ProfileSettingsProps {
  onBack: () => void;
}

type ActiveSection = 'profile' | 'security' | 'account';

interface Tab {
  id: ActiveSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function ProfileSettings({ onBack }: ProfileSettingsProps) {
  const { 
    getUserDisplayName, 
    getUserEmail, 
    getUserId, 
    loading: authLoading, 
    updateUserPassword, 
    updateUserProfile, 
    user 
  } = useAuth();
  
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('profile');
  
  // Profile state
  const [displayName, setDisplayName] = useState<string>(getUserDisplayName() || '');
  const [userImg, setUserImg] = useState<string>(user?.photoURL || '');
  const [displayNameError, setDisplayNameError] = useState<string>('');
  const [profileSuccess, setProfileSuccess] = useState<string>('');
  const [profileError, setProfileError] = useState<string>('');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  
  const loading = authLoading || localLoading;

  const validateDisplayName = (name: string): boolean => {
    if (!name.trim()) {
      setDisplayNameError('Display name cannot be empty');
      return false;
    }
    if (name.length < 2) {
      setDisplayNameError('Display name must be at least 2 characters');
      return false;
    }
    if (name.length > 50) {
      setDisplayNameError('Display name must be less than 50 characters');
      return false;
    }
    setDisplayNameError('');
    return true;
  };

  const getPasswordStrength = (password: string): PasswordStrength => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 8) return { strength: 25, label: 'Weak', color: 'bg-red-500' };
    
    let strength = 25;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 12.5;
    if (/\d/.test(password)) strength += 12.5;
    
    if (strength <= 50) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 75) return { strength, label: 'Medium', color: 'bg-yellow-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleProfileUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    
    if (!validateDisplayName(displayName)) return;
    
    const currentDisplayName = getUserDisplayName() || '';
    const currentPhotoURL = user?.photoURL || '';
    
    if (displayName === currentDisplayName && userImg === currentPhotoURL) {
      setProfileError('No changes detected');
      return;
    }
    
    setLocalLoading(true);
    try {
      await updateUserProfile({ displayName, userImg });
      setProfileSuccess('Profile updated successfully! ✅');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      const error = err as Error;
      setProfileError(error.message || 'Failed to update profile');
    } finally {
      setLocalLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    setLocalLoading(true);
    try {
      await updateUserPassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully! ✅');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      const error = err as Error;
      setPasswordError(error.message || 'Failed to update password');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image size must be less than 5MB');
      return;
    }

    try {
      const imageUrl = URL.createObjectURL(file);
      setUserImg(imageUrl);
      setProfileError('');
    } catch (err) {
      setProfileError('Failed to process image');
      console.error('Image upload error:', err);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const tabs: Tab[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'account', label: 'Account', icon: Lock }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 sm:p-6"
      >
        <div className="flex items-center gap-3 sm:gap-4 max-w-7xl mx-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Account Settings
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
              Manage your profile and security
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 bg-white dark:bg-gray-900 rounded-2xl p-2 border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base ${
                  activeSection === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {activeSection === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6"
              >
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Profile Information</h2>
                </div>
                
                <form onSubmit={handleProfileUpdate} className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">Profile Picture</label>
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                      <div className="relative group">
                        {userImg ? (
                          <img src={userImg} alt="Profile" className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white dark:border-gray-800 shadow-lg" />
                        ) : (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-lg">
                            <span className="text-2xl sm:text-3xl font-bold text-white">{displayName.charAt(0).toUpperCase() || 'U'}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 w-full sm:w-auto">
                        <label htmlFor="profile-image" className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer text-sm font-medium shadow-lg">
                          <Upload className="w-4 h-4" />Upload Photo
                        </label>
                        <input type="file" id="profile-image" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        {userImg && (
                          <button type="button" onClick={() => setUserImg('')} className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-red-500 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm font-medium">
                            <Trash2 className="w-4 h-4" />Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="email" 
                        value={getUserEmail() || ''} 
                        disabled 
                        className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 cursor-not-allowed text-sm sm:text-base" 
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />Email cannot be changed
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        value={displayName} 
                        onChange={(e) => { 
                          setDisplayName(e.target.value); 
                          validateDisplayName(e.target.value); 
                        }} 
                        onBlur={(e) => validateDisplayName(e.target.value)} 
                        placeholder="Enter your display name" 
                        maxLength={50} 
                        className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base ${
                          displayNameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                        }`} 
                      />
                    </div>
                    {displayNameError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />{displayNameError}
                      </motion.p>
                    )}
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{displayName.length}/50 characters</p>
                  </div>

                  <AnimatePresence>
                    {profileSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }} 
                        className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <p className="text-sm text-green-700 dark:text-green-400 font-medium">{profileSuccess}</p>
                        </div>
                      </motion.div>
                    )}
                    {profileError && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }} 
                        className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <p className="text-sm text-red-700 dark:text-red-400 font-medium">{profileError}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }} 
                    type="submit" 
                    disabled={loading || !!displayNameError} 
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg text-sm sm:text-base"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div 
                          animate={{ rotate: 360 }} 
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" 
                        />
                        Saving...
                      </span>
                    ) : (
                      'Save Profile'
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {activeSection === 'security' && (
              <motion.div 
                key="security" 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }} 
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6"
              >
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Change Password</h2>
                </div>
                
                <form onSubmit={handlePasswordUpdate} className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type={showCurrentPassword ? 'text' : 'password'} 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        placeholder="Enter current password" 
                        autoComplete="current-password" 
                        className="w-full pl-11 pr-12 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type={showNewPassword ? 'text' : 'password'} 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="Enter new password" 
                        autoComplete="new-password" 
                        className="w-full pl-11 pr-12 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Must be at least 8 characters</p>

                    {newPassword && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        className="mt-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Strength:</span>
                          <span className={`text-sm font-medium ${
                            passwordStrength.label === 'Weak' ? 'text-red-600' : 
                            passwordStrength.label === 'Medium' ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${passwordStrength.strength}%` }} 
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`} 
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="Confirm new password" 
                        autoComplete="new-password" 
                        className="w-full pl-11 pr-12 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {passwordSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }} 
                        className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <p className="text-sm text-green-700 dark:text-green-400 font-medium">{passwordSuccess}</p>
                        </div>
                      </motion.div>
                    )}
                    {passwordError && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }} 
                        className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <p className="text-sm text-red-700 dark:text-red-400 font-medium">{passwordError}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }} 
                    type="submit" 
                    disabled={loading} 
                    className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg text-sm sm:text-base"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div 
                          animate={{ rotate: 360 }} 
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" 
                        />
                        Updating...
                      </span>
                    ) : (
                      'Update Password'
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {activeSection === 'account' && (
              <motion.div 
                key="account" 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }} 
                className="space-y-4 sm:space-y-6"
              >
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Account Information</h2>
                  </div>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Account Details</h3>
                    
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 gap-2 sm:gap-0">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">User ID</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Unique account identifier</p>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg break-all">
                          {getUserId() || 'N/A'}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 gap-2 sm:gap-0">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                            <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Created</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Date of registration</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 hidden sm:block" />
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.metadata?.creationTime ? formatDate(user.metadata.creationTime) : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 gap-2 sm:gap-0">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                            <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Sign In</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Most recent login</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400 hidden sm:block" />
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.metadata?.lastSignInTime ? formatDate(user.metadata.lastSignInTime) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-red-200 dark:border-red-900/30 p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20">
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Danger Zone</h2>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 sm:p-4 border border-red-200 dark:border-red-800">
                    <h3 className="text-base sm:text-lg font-semibold text-red-700 dark:text-red-400 mb-3 sm:mb-4">Delete Account</h3>
                    <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                      Once you delete your account, there is no going back. This will permanently remove all your data, preferences, and settings.
                    </p>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                          alert('Account deletion initiated. In a real app, this would delete your account.');
                        }
                      }}
                      className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all font-medium shadow-lg text-sm sm:text-base flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      Delete Account Permanently
                    </motion.button>
                    
                    <p className="mt-3 text-xs text-red-500 dark:text-red-400 text-center">
                      ⚠️ This action cannot be undone
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              🔐 Your data is securely encrypted
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
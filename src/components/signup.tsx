import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useAuth } from '../contexts/auth-contexts';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, User, Mail, Lock, Eye, EyeOff, CheckCircle, MessageCircle } from 'lucide-react';

interface SignupFormState {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function Signup() {
  const [formData, setFormData] = useState<SignupFormState>({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  
  const { signUp, error, clearError } = useAuth();


  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
    } else if (formData.displayName.length < 2) {
      errors.displayName = 'Name must be at least 2 characters';
    }
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else {
      // Check password criteria
      const criteria = {
        length: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
        special: /[^A-Za-z0-9]/.test(formData.password)
      };
      setPasswordCriteria(criteria);
      
      if (!criteria.length) {
        errors.password = 'Password must be at least 8 characters';
      }
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user types
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
    
    if (error) clearError();
    
    // Check password criteria as user types
    if (name === 'password') {
      const criteria = {
        length: value.length >= 8,
        uppercase: /[A-Z]/.test(value),
        lowercase: /[a-z]/.test(value),
        number: /[0-9]/.test(value),
        special: /[^A-Za-z0-9]/.test(value)
      };
      setPasswordCriteria(criteria);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName
      });
      console.log('Signup successful!');
    
    } catch (err) {
      console.error('Signup failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      {/* App Logo/Header */}
      <div className="text-center mb-8">
        <motion.div
          className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mb-4"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageCircle className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Join Echo<span className="text-emerald-600 dark:text-emerald-400">Talk</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Create your account and start chatting
        </p>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
          >
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Lock className="w-4 h-4" />
              <span className="font-medium">{error.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signup Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Display Name Field */}
        <div className="space-y-2">
          <label 
            htmlFor="displayName" 
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <User className="w-4 h-4" />
            Display Name
          </label>
          <div className="relative">
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={formData.displayName}
              onChange={handleInputChange}
              placeholder="Your chat name"
              disabled={isSubmitting}
              required
              aria-invalid={!!formErrors.displayName}
              className={`w-full px-4 py-3 pl-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border
                focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400
                transition-all duration-200 ${formErrors.displayName 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          {formErrors.displayName && (
            <motion.span 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="block text-sm text-red-500 dark:text-red-400"
            >
              {formErrors.displayName}
            </motion.span>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <label 
            htmlFor="email" 
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <Mail className="w-4 h-4" />
            Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
              disabled={isSubmitting}
              required
              aria-invalid={!!formErrors.email}
              className={`w-full px-4 py-3 pl-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border
                focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400
                transition-all duration-200 ${formErrors.email 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          {formErrors.email && (
            <motion.span 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="block text-sm text-red-500 dark:text-red-400"
            >
              {formErrors.email}
            </motion.span>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label 
            htmlFor="password" 
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <Lock className="w-4 h-4" />
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Create a strong password"
              disabled={isSubmitting}
              required
              aria-invalid={!!formErrors.password}
              className={`w-full px-4 py-3 pl-10 pr-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border
                focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400
                transition-all duration-200 ${formErrors.password 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          
          {/* Password Criteria */}
          <div className="mt-3 space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Password must contain:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'length', text: 'At least 8 characters', met: passwordCriteria.length },
                { key: 'uppercase', text: 'One uppercase letter', met: passwordCriteria.uppercase },
                { key: 'lowercase', text: 'One lowercase letter', met: passwordCriteria.lowercase },
                { key: 'number', text: 'One number', met: passwordCriteria.number },
                { key: 'special', text: 'One special character', met: passwordCriteria.special, colSpan: 'col-span-2' }
              ].map(({ key, text, met, colSpan }) => (
                <motion.div
                  key={key}
                  initial={false}
                  animate={{ opacity: met ? 1 : 0.6 }}
                  className={`flex items-center gap-2 text-xs ${colSpan || ''}`}
                >
                  <div className={`w-4 h-4 flex items-center justify-center rounded-full ${met 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}
                  >
                    {met ? <CheckCircle className="w-3 h-3" /> : '○'}
                  </div>
                  <span className={met 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-gray-500 dark:text-gray-400'}>
                    {text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
          
          {formErrors.password && (
            <motion.span 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="block text-sm text-red-500 dark:text-red-400"
            >
              {formErrors.password}
            </motion.span>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <label 
            htmlFor="confirmPassword" 
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <Lock className="w-4 h-4" />
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter your password"
              disabled={isSubmitting}
              required
              aria-invalid={!!formErrors.confirmPassword}
              className={`w-full px-4 py-3 pl-10 pr-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border
                focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400
                transition-all duration-200 ${formErrors.confirmPassword 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {formErrors.confirmPassword && (
            <motion.span 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="block text-sm text-red-500 dark:text-red-400"
            >
              {formErrors.confirmPassword}
            </motion.span>
          )}
        </div>

        {/* Terms & Conditions */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              className="w-4 h-4 mt-1 text-emerald-600 bg-gray-100 border-gray-300 rounded 
                focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 
                focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>
                I agree to the{' '}
                <button type="button" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                  Privacy Policy
                </button>
              </p>
              <p className="mt-1 text-xs opacity-75">
                By creating an account, you agree to our terms and acknowledge that you have read our privacy policy.
              </p>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold 
            rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2
            ${isSubmitting 
              ? 'opacity-70 cursor-not-allowed' 
              : 'hover:from-emerald-700 hover:to-green-700'
            }`}
        >
          {isSubmitting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              Creating account...
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              Create EchoTalk Account
            </>
          )}
        </motion.button>
      </form>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <button className="font-medium text-emerald-600 dark:text-emerald-400 
            hover:text-emerald-700 dark:hover:text-emerald-300">
            Sign in instead
          </button>
        </p>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Get ready to connect with friends and colleagues instantly!
        </p>
      </div>

      {/* Decorative Elements */}
      <motion.div
        className="absolute bottom-4 right-4 opacity-5 pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <MessageCircle size={200} className="text-emerald-500" />
      </motion.div>
    </motion.div>
  );
}
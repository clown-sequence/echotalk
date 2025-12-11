import React, { useState, type FormEvent, type  ChangeEvent } from 'react';
import { useAuth } from '../contexts/auth-contexts';
import { Navigate } from 'react-router-dom';

interface AdminLoginProps {
  onLoginSuccess?: () => void;
  redirectUrl?: string;
}

interface LoginFormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export function Signin({ 
  onLoginSuccess, 
  redirectUrl 
}: AdminLoginProps = {}): React.JSX.Element {
  // Form state with proper typing
  const [formData, setFormData] = useState<LoginFormState>({
    email: '',
    password: ''
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Auth context with full type safety
  const { signIn, user, loading, error, clearError } = useAuth();

  // If user is already logged in, show welcome message
  if (user) {
    return <Navigate to={'/secure-admin'} />
  }

  // Validate form before submission
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input changes with proper typing
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user types
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
    
    // Clear auth error when user types
    if (error) {
      clearError();
    }
  };

  // Handle form submission with proper typing
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const userCredential = await signIn({
        email: formData.email, 
        password: formData.password
      });
      console.log('Login successful!', userCredential);
      
      // Call success callback if provided
      onLoginSuccess?.();
      
      // Redirect if URL provided
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (err) {
      // Error is already handled in context
      console.error('Login failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '50px auto', 
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Admin Login
      </h2>
      
      {/* Auth Error Display */}
      {error && (
        <div style={{ 
          color: '#dc3545', 
          padding: '12px', 
          marginBottom: '15px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>Error:</strong> {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Email Field */}
        <div style={{ marginBottom: '15px' }}>
          <label 
            htmlFor="email" 
            style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="admin@example.com"
            disabled={loading || isSubmitting}
            required
            aria-invalid={!!formErrors.email}
            aria-describedby={formErrors.email ? 'email-error' : undefined}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              borderRadius: '4px',
              border: `1px solid ${formErrors.email ? '#dc3545' : '#ced4da'}`,
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          {formErrors.email && (
            <span 
              id="email-error" 
              style={{ 
                color: '#dc3545', 
                fontSize: '12px',
                marginTop: '5px',
                display: 'block'
              }}
            >
              {formErrors.email}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="password" 
            style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            Password *
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            disabled={loading || isSubmitting}
            required
            aria-invalid={!!formErrors.password}
            aria-describedby={formErrors.password ? 'password-error' : undefined}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              borderRadius: '4px',
              border: `1px solid ${formErrors.password ? '#dc3545' : '#ced4da'}`,
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          {formErrors.password && (
            <span 
              id="password-error" 
              style={{ 
                color: '#dc3545', 
                fontSize: '12px',
                marginTop: '5px',
                display: 'block'
              }}
            >
              {formErrors.password}
            </span>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: (loading || isSubmitting) ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (loading || isSubmitting) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div style={{ 
        marginTop: '15px', 
        textAlign: 'center',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <p>* Required fields</p>
      </div>
    </div>
  );
}

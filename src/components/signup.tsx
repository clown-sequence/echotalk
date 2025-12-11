import React, { useState, type FormEvent, type ChangeEvent } from 'react';
import { useAuth } from '../contexts/auth-contexts';
import { Navigate } from 'react-router-dom';

interface SignupFormState {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function Signup() {
  const [formData, setFormData] = useState<SignupFormState>({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp, user, error, clearError } = useAuth();

  if (user) {
    return <Navigate to="/chat-hub" />;
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName // Include display name
      });
      console.log('Signup successful!');
    } catch (err) {
      console.error('Signup failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h2>Create Account</h2>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '15px' }}>
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Display Name *</label>
          <input
            name="displayName"
            type="text"
            value={formData.displayName}
            onChange={handleInputChange}
            placeholder="John Doe"
            required
            style={{ width: '100%', padding: '10px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Email *</label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="you@example.com"
            required
            style={{ width: '100%', padding: '10px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Password *</label>
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            style={{ width: '100%', padding: '10px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Confirm Password *</label>
          <input
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            style={{ width: '100%', padding: '10px' }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isSubmitting ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}
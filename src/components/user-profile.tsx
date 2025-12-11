import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth-contexts';
import type { UserDocument } from '../types';
import type { Timestamp } from 'firebase/firestore';

export function UserProfile() {
  const { user, getUserDoc } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const doc = await getUserDoc();
        setUserDoc(doc);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user) {
      loadUser();
    }
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userDoc) {
    return <div>No user data found</div>;
  }

  // Properly convert Firestore Timestamps to JavaScript Dates
  const formatDate = (timestamp: Timestamp): string => {
    if (!timestamp) return 'N/A';
    
    // Check if it's a Firestore Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Check if it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return 'N/A';
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px' }}>
      <h2>User Profile</h2>
      
      {userDoc.userImg && (
        <img 
          src={userDoc.userImg} 
          alt="Profile" 
          style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            objectFit: 'cover',
            marginBottom: '20px' 
          }}
        />
      )}
      
      <div style={{ lineHeight: '2' }}>
        <p><strong>Display Name:</strong> {userDoc.displayName || 'Not set'}</p>
        <p><strong>Email:</strong> {userDoc.email}</p>
        <p><strong>User ID:</strong> {userDoc.uid}</p>
        <p><strong>Role:</strong> <span style={{ 
          padding: '4px 8px', 
          backgroundColor: userDoc.role === 'admin' ? '#ffc107' : '#007bff',
          color: 'white',
          borderRadius: '4px',
          fontSize: '12px'
        }}>{userDoc.role.toUpperCase()}</span></p>
        <p><strong>Account Created:</strong> {formatDate(userDoc.createdAt)}</p>
        <p><strong>Last Updated:</strong> {formatDate(userDoc.updatedAt)}</p>
      </div>
    </div>
  );
}
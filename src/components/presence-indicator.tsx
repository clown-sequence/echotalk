import React from 'react';
import { useUserPresence } from '../hooks/use-user-presence';
import { formatExactTimestamp, getShortStatusText, getStatusText } from '../lib/utils';

// ============================================
// TYPES
// ============================================


interface PresenceIndicatorProps {
  userId: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  shortText?: boolean;
  showTooltip?: boolean;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  userId,
  showText = true,
  size = 'md',
  className = '',
  shortText = false,
  showTooltip = false,
}) => {
  const { presence, loading } = useUserPresence({ userId, enabled: !!userId });

  // Size classes for the dot
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  // Text size classes
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Loading state
  if (loading && showText) {
    return (
      <span className={`${textSizeClasses[size]} text-gray-400 dark:text-gray-600 ${className}`}>
        ...
      </span>
    );
  }

  // Get status text and colors
  const statusText = shortText 
    ? getShortStatusText(presence) 
    : getStatusText(presence);
  
  const dotColor = presence?.isOnline 
    ? 'bg-green-500' 
    : 'bg-gray-400 dark:bg-gray-600';
  
  const textColor = presence?.isOnline 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-gray-600 dark:text-gray-400';
  
  const tooltipText = showTooltip 
    ? formatExactTimestamp(presence?.lastSeen) 
    : undefined;

  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      title={tooltipText}
    >
      {/* Status dot with optional pulse animation */}
      <div className="relative flex items-center justify-center">
        {/* Main dot */}
        <div
          className={`
            ${sizeClasses[size]} 
            rounded-full 
            ${dotColor}
            transition-colors duration-300
          `}
        />
        
        {/* Pulse animation ring (only when online) */}
        {presence?.isOnline && (
          <div
            className={`
              absolute 
              ${sizeClasses[size]} 
              rounded-full 
              bg-green-500 
              animate-ping 
              opacity-75
            `}
          />
        )}
      </div>

      {/* Status text */}
      {showText && (
        <span 
          className={`
            ${textSizeClasses[size]} 
            ${textColor}
            font-medium
            transition-colors duration-300
          `}
        >
          {statusText}
        </span>
      )}
    </div>
  );
};

// ============================================
// DEMO: Example Usage
// ============================================

export default function PresenceIndicatorDemo() {
  return (
    <div className="min-h-screen bg-white dark:bg-black p-8">
      <style>{`
        @keyframes ping {
          75%, 100% { 
            transform: scale(2); 
            opacity: 0; 
          }
        }
        .animate-ping { 
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; 
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-8">
          Presence Indicator Examples
        </h1>

        {/* Example 1: With text */}
        <div className="p-6 border-2 border-black dark:border-white rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            With Text (Full)
          </h2>
          <PresenceIndicator 
            userId="example-user-id"
            showText={true}
            size="md"
          />
        </div>

        {/* Example 2: Dot only */}
        <div className="p-6 border-2 border-black dark:border-white rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            Dot Only (for Avatars)
          </h2>
          <div className="relative inline-block">
            <img 
              src="https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100&h=100&fit=crop"
              className="w-12 h-12 rounded-full"
              alt="User"
            />
            <div className="absolute -bottom-0.5 -right-0.5">
              <PresenceIndicator 
                userId="example-user-id"
                showText={false}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Example 3: Short text */}
        <div className="p-6 border-2 border-black dark:border-white rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            Short Text Format
          </h2>
          <PresenceIndicator 
            userId="example-user-id"
            showText={true}
            shortText={true}
            size="sm"
          />
        </div>

        {/* Example 4: Different sizes */}
        <div className="p-6 border-2 border-black dark:border-white rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            Different Sizes
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Small:</p>
              <PresenceIndicator userId="example-user-id" size="sm" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Medium:</p>
              <PresenceIndicator userId="example-user-id" size="md" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Large:</p>
              <PresenceIndicator userId="example-user-id" size="lg" />
            </div>
          </div>
        </div>

        {/* Example 5: With tooltip */}
        <div className="p-6 border-2 border-black dark:border-white rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            With Tooltip (Hover to see exact time)
          </h2>
          <PresenceIndicator 
            userId="example-user-id"
            showText={true}
            showTooltip={true}
            size="md"
          />
        </div>
      </div>
    </div>
  );
}
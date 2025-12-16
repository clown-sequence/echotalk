
import React from 'react';
import { Share2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { UserDocument, LocationData, FriendData } from '../types';

interface LocationSharingPanelProps {
  sharing: boolean;
  location: LocationData | null;
  error: string | null;
  users: UserDocument[];
  watchedUsers: string[];
  onStartSharing: () => Promise<void>;
  onStopSharing: () => Promise<void>;
  onWatchUser: (userId: string, userData: FriendData) => void;
  onUnwatchUser: (userId: string) => void;
}

export const LocationSharingPanel: React.FC<LocationSharingPanelProps> = ({
  sharing,
  location,
  error,
  users,
  watchedUsers,
  onStartSharing,
  onStopSharing,
  onWatchUser,
  onUnwatchUser,
}) => {
  return (
    <div className="space-y-4">
      {/* Your Location Status */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Location</h3>
          {sharing ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStopSharing}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <EyeOff className="w-4 h-4" />
              Stop Sharing
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartSharing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
            >
              <Share2 className="w-4 h-4" />
              Start Sharing
            </motion.button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {location && (
          <div className="space-y-2 text-sm">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Latitude:</strong> {location.latitude.toFixed(6)}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Longitude:</strong> {location.longitude.toFixed(6)}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Accuracy:</strong> ±{location.accuracy.toFixed(0)}m
            </p>
            {sharing && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Sharing your location</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Friends List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Watch Friends</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {users.map((user: UserDocument) => {
            const isWatching: boolean = watchedUsers.includes(user.uid);
            return (
              <div
                key={user.uid}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100&fit=crop'}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {user.displayName}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => 
                    isWatching 
                      ? onUnwatchUser(user.uid)
                      : onWatchUser(user.uid, { name: user.displayName, img: user.userImg ?? undefined })
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                    isWatching
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  {isWatching ? 'Watching' : 'Watch'}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
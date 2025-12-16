
import React, { useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import type { UserLocation, LocationData } from '../types';

interface LocationMapProps {
  currentLocation: LocationData | null;
  friendLocations: UserLocation[];
  onBack: () => void;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  currentLocation,
  friendLocations,
  onBack,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R: number = 6371; // Earth's radius in km
    const dLat: number = (lat2 - lat1) * Math.PI / 180;
    const dLon: number = (lon2 - lon1) * Math.PI / 180;
    const a: number = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance: number = R * c;
    
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Location Sharing</h2>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Back to Chat
          </button>
        </div>
      </div>

      {/* Map Area (Placeholder - you can integrate actual map library) */}
      <div className="flex-1 relative bg-gray-100 dark:bg-gray-800" ref={mapRef}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8">
            <MapPin className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Map visualization coming soon
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Integrate with Google Maps, Mapbox, or Leaflet
            </p>
          </div>
        </div>
      </div>

      {/* Location List */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 max-h-64 overflow-y-auto">
        {/* Current Location */}
        {currentLocation && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-gray-900 dark:text-white">Your Location</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>Lat: {currentLocation.latitude.toFixed(6)}</p>
              <p>Lng: {currentLocation.longitude.toFixed(6)}</p>
              <p>Accuracy: ±{currentLocation.accuracy.toFixed(0)}m</p>
            </div>
          </div>
        )}

        {/* Friend Locations */}
        {friendLocations.length > 0 ? (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Friends Nearby</h3>
            {friendLocations.map((friend: UserLocation) => (
              <div
                key={friend.userId}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={friend.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100&fit=crop'}
                      alt={friend.userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {friend.userName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(friend.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  {currentLocation && (
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {calculateDistance(
                        currentLocation.latitude,
                        currentLocation.longitude,
                        friend.latitude,
                        friend.longitude
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No friends sharing their location
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
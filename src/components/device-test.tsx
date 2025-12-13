// ============================================
// components/DeviceTest.tsx - Test Camera & Microphone
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, X, Check, AlertCircle } from 'lucide-react';

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: string;
}

interface TestResult {
  hasCamera: boolean;
  hasMicrophone: boolean;
  cameraCount: number;
  microphoneCount: number;
  permissionGranted: boolean;
  devices: DeviceInfo[];
  error: string | null;
}

export const DeviceTest: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [useMock, setUseMock] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const createMockStream = () => {
    console.log('Creating mock stream...');
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    
    let frame = 0;
    const animate = () => {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 50 + Math.sin(frame * 0.05) * 20;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Mock Video', centerX, centerY - 80);
      
      ctx.font = '20px Arial';
      ctx.fillText('Testing Mode', centerX, centerY + 80);
      
      frame++;
      requestAnimationFrame(animate);
    };
    
    animate();
    
    const videoStream = canvas.captureStream(30);
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.01;
    oscillator.connect(gainNode);
    const dest = audioContext.createMediaStreamDestination();
    gainNode.connect(dest);
    oscillator.start();
    
    return new MediaStream([
      ...videoStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);
  };

  const testDevices = async (mockMode = false) => {
    setTesting(true);
    setResult(null);
    setUseMock(mockMode);

    if (mockMode) {
      // Use mock stream
      const mockStream = createMockStream();
      
      setResult({
        hasCamera: true,
        hasMicrophone: true,
        cameraCount: 1,
        microphoneCount: 1,
        permissionGranted: true,
        devices: [
          { deviceId: 'mock-video', label: 'Mock Camera (Testing)', kind: 'videoinput' },
          { deviceId: 'mock-audio', label: 'Mock Microphone (Testing)', kind: 'audioinput' }
        ],
        error: null,
      });

      setStream(mockStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mockStream;
      }
      
      setTesting(false);
      return;
    }

    try {
      // Check devices first
      const initialDevices = await navigator.mediaDevices.enumerateDevices();
      const hasAnyDevices = initialDevices.some(d => 
        d.kind === 'videoinput' || d.kind === 'audioinput'
      );

      if (!hasAnyDevices) {
        throw new Error('NO_DEVICES');
      }
      
      // Request permissions
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const audioDevices = devices.filter(d => d.kind === 'audioinput');

      setResult({
        hasCamera: videoDevices.length > 0,
        hasMicrophone: audioDevices.length > 0,
        cameraCount: videoDevices.length,
        microphoneCount: audioDevices.length,
        permissionGranted: true,
        devices: devices.map(d => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind} (no label)`,
          kind: d.kind,
        })),
        error: null,
      });

      setStream(testStream);
      if (videoRef.current) {
        videoRef.current.srcObject = testStream;
      }

    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        if (error.message === 'NO_DEVICES') {
          errorMessage = 'No camera or microphone found. You can use Mock Mode for testing.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera or microphone found. Please connect a device or use Mock Mode.';
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Permission denied. Please allow access in your browser settings.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Device is already in use by another application.';
        } else {
          errorMessage = error.message;
        }
      }

      setResult({
        hasCamera: false,
        hasMicrophone: false,
        cameraCount: 0,
        microphoneCount: 0,
        permissionGranted: false,
        devices: [],
        error: errorMessage,
      });
    } finally {
      setTesting(false);
    }
  };

  const stopTest = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopTest();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black dark:text-white">
            Test Camera & Microphone
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview */}
        {stream && (
          <div className="mb-6 border-2 border-black dark:border-white rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover bg-black"
            />
          </div>
        )}

        {/* Test Buttons */}
        {!stream && (
          <div className="space-y-3 mb-6">
            <button
              onClick={() => testDevices(false)}
              disabled={testing}
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white rounded-lg font-medium hover:opacity-80 transition-all disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Real Devices'}
            </button>
            
            <button
              onClick={() => testDevices(true)}
              disabled={testing}
              className="w-full py-3 bg-purple-600 text-white border-2 border-purple-700 rounded-lg font-medium hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              {testing ? 'Testing...' : '🎭 Test with Mock Stream'}
            </button>
            
            <p className="text-sm text-black/60 dark:text-white/60 text-center">
              {useMock ? 'Using mock stream for testing' : 'Click "Mock Stream" if you don\'t have a camera'}
            </p>
          </div>
        )}

        {/* Stop Button */}
        {stream && (
          <button
            onClick={stopTest}
            className="w-full py-3 mb-6 bg-red-500 text-white border-2 border-red-600 rounded-lg font-medium hover:bg-red-600 transition-all"
          >
            Stop Test
          </button>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Error Message */}
            {result.error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400">Error</p>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      {result.error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Summary */}
            {!result.error && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {useMock ? 'Mock Devices Ready' : 'Devices Ready'}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                      {useMock 
                        ? 'Using test stream for demonstration. Video calls will work!'
                        : `Found ${result.cameraCount} camera(s) and ${result.microphoneCount} microphone(s)`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Device List */}
            <div className="border-2 border-black dark:border-white rounded-lg overflow-hidden">
              <div className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 font-semibold">
                Available Devices
              </div>
              <div className="divide-y-2 divide-black dark:divide-white">
                {result.devices.length === 0 ? (
                  <div className="p-4 text-center text-black/50 dark:text-white/50">
                    No devices found
                  </div>
                ) : (
                  result.devices.map((device, index) => (
                    <div key={device.deviceId} className="p-4 flex items-center gap-3">
                      {device.kind === 'videoinput' ? (
                        <Video className="w-5 h-5 text-black dark:text-white" />
                      ) : device.kind === 'audioinput' ? (
                        <Mic className="w-5 h-5 text-black dark:text-white" />
                      ) : (
                        <div className="w-5 h-5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-black dark:text-white">
                          {device.label}
                        </p>
                        <p className="text-sm text-black/50 dark:text-white/50">
                          {device.kind}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Permission Status */}
            <div className="flex items-center justify-between p-4 border-2 border-black dark:border-white rounded-lg">
              <span className="font-medium text-black dark:text-white">
                Permissions Granted
              </span>
              <div className="flex items-center gap-2">
                {result.permissionGranted ? (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-red-600 dark:text-red-400 font-medium">No</span>
                  </>
                )}
              </div>
            </div>

            {/* Browser Info */}
            <div className="p-4 bg-black/5 dark:bg-white/5 border-2 border-black dark:border-white rounded-lg">
              <p className="text-sm text-black dark:text-white mb-2">
                <span className="font-semibold">Browser:</span> {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}
              </p>
              <p className="text-sm text-black dark:text-white mb-2">
                <span className="font-semibold">Secure Context:</span> {window.isSecureContext ? 'Yes (HTTPS)' : 'No (HTTP)'}
              </p>
              <p className="text-sm text-black dark:text-white">
                <span className="font-semibold">MediaDevices API:</span> {!!navigator.mediaDevices ? 'Available' : 'Not Available'}
              </p>
            </div>

            {/* Troubleshooting Tips */}
            {result.error && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 rounded-lg">
                <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                  Troubleshooting Tips:
                </p>
                <ul className="text-sm text-yellow-600 dark:text-yellow-300 space-y-1 list-disc list-inside mb-3">
                  <li>Check if camera/microphone is connected</li>
                  <li>Close other apps using the camera/microphone</li>
                  <li>Grant permissions in browser settings</li>
                  <li>Try a different browser</li>
                  <li>Ensure you're on HTTPS (not HTTP)</li>
                </ul>
                <div className="pt-3 border-t border-yellow-400">
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                    💡 No Devices? Use Mock Mode!
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-300">
                    Click "Test with Mock Stream" above to test video calls without real devices. 
                    The system will use animated graphics and test audio instead.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
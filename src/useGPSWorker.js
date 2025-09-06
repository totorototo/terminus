// Custom React hook for managing GPS Web Worker
import { useRef, useEffect, useCallback, useState } from 'react';

export function useGPSWorker() {
  const workerRef = useRef(null);
  const requestsRef = useRef(new Map());
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  // Initialize worker
  useEffect(() => {
    // Create worker using Vite's worker syntax
    workerRef.current = new Worker(
      new URL('./gpsWorker.js', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    workerRef.current.onmessage = (e) => {
      const { type, id, results, error, progress: progressValue, message } = e.data;
      const request = requestsRef.current.get(id);

      if (!request) return;

      switch (type) {
        case 'PROGRESS':
          setProgress(progressValue);
          setProgressMessage(message);
          if (request.onProgress) {
            request.onProgress(progressValue, message);
          }
          break;

        case 'GPS_DATA_PROCESSED':
        case 'ROUTE_STATS_CALCULATED':
        case 'POINTS_FOUND':
        case 'ROUTE_SECTION_READY':
          requestsRef.current.delete(id);
          setProcessing(false);
          setProgress(100);
          request.resolve(results || e.data);
          break;

        case 'ERROR':
          requestsRef.current.delete(id);
          setProcessing(false);
          setProgress(0);
          request.reject(new Error(error));
          break;
      }
    };

    // Handle worker errors
    workerRef.current.onerror = (error) => {
      console.error('GPS Worker error:', error);
      setIsWorkerReady(false);
    };

    setIsWorkerReady(true);

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Send message to worker and return promise
  const sendMessage = useCallback((type, data, onProgress) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isWorkerReady) {
        reject(new Error('GPS Worker not ready'));
        return;
      }

      const id = Date.now() + Math.random();
      requestsRef.current.set(id, { resolve, reject, onProgress });

      setProcessing(true);
      setProgress(0);
      setProgressMessage('Starting...');

      workerRef.current.postMessage({ type, data, id });
    });
  }, [isWorkerReady]);

  // API methods
  const processGPSData = useCallback(async (coordinates, onProgress) => {
    return sendMessage('PROCESS_GPS_DATA', { coordinates }, onProgress);
  }, [sendMessage]);

  const calculateRouteStats = useCallback(async (coordinates, segments) => {
    return sendMessage('CALCULATE_ROUTE_STATS', { coordinates, segments });
  }, [sendMessage]);

  const findPointsAtDistances = useCallback(async (coordinates, distances) => {
    return sendMessage('FIND_POINTS_AT_DISTANCES', { coordinates, distances });
  }, [sendMessage]);

  const getRouteSection = useCallback(async (coordinates, start, end) => {
    return sendMessage('GET_ROUTE_SECTION', { coordinates, start, end });
  }, [sendMessage]);

  return {
    // State
    isWorkerReady,
    processing,
    progress,
    progressMessage,
    
    // Methods
    processGPSData,
    calculateRouteStats,
    findPointsAtDistances,
    getRouteSection
  };
}

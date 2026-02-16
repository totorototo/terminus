import { MESSAGE_TYPES, SUCCESS_RESPONSE_TYPES } from "./workerTypes.js";

const WORKER_TIMEOUT = 60000; // 60 seconds

export function createWorkerMessenger(worker, callbacks) {
  const requests = new Map();

  // Clean up a single pending request and cancel its timeout
  function cleanupRequest(id) {
    const request = requests.get(id);
    if (request) {
      clearTimeout(request.timeoutHandle);
    }
    requests.delete(id);
  }

  // Clean up all pending requests (e.g., on worker termination)
  function cleanupAllRequests(error) {
    for (const [id, request] of requests.entries()) {
      clearTimeout(request.timeoutHandle);
      request.reject(error);
    }
    requests.clear();
  }

  // Handle incoming messages from the worker
  function handleMessage(e) {
    const {
      type,
      id,
      results,
      error,
      progress: progressValue,
      message,
    } = e.data;

    const request = requests.get(id);
    if (!request) return;

    if (type === MESSAGE_TYPES.RESPONSE.PROGRESS) {
      callbacks.onProgress?.(progressValue, message);
      request.onProgress?.(progressValue, message);
    } else if (SUCCESS_RESPONSE_TYPES.has(type)) {
      cleanupRequest(id);
      callbacks.onComplete?.();
      request.resolve(results ?? e.data);
    } else if (type === MESSAGE_TYPES.RESPONSE.ERROR) {
      cleanupRequest(id);
      const errorMessage = error ?? "Unknown worker error";
      callbacks.onError?.(errorMessage);
      request.reject(new Error(errorMessage));
    }
  }

  // Send a message to the worker and track the request
  async function send(type, data, onProgress) {
    return new Promise((resolve, reject) => {
      if (!worker) {
        reject(new Error("Worker not ready"));
        return;
      }

      const id = Date.now() + Math.random();
      let timeoutHandle;

      // Wrap resolve/reject to clear timeout before completing
      const wrappedResolve = (result) => {
        clearTimeout(timeoutHandle);
        resolve(result);
      };

      const wrappedReject = (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      };

      // Set up timeout to cleanup if worker doesn't respond
      timeoutHandle = setTimeout(() => {
        cleanupRequest(id);
        const errorMsg = `Worker request ${type} timed out after ${WORKER_TIMEOUT}ms`;
        callbacks.onTimeout?.(errorMsg);
        wrappedReject(new Error(errorMsg));
      }, WORKER_TIMEOUT);

      requests.set(id, {
        resolve: wrappedResolve,
        reject: wrappedReject,
        onProgress,
        timeoutHandle,
      });

      callbacks.onProcessingStart?.();

      worker.postMessage({ type, data, id });
    });
  }

  // Public API
  return {
    send,
    handleMessage,
    cleanup: cleanupAllRequests,
  };
}

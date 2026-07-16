/**
 * Represents a report stored locally while the client is offline.
 */
export interface PendingReport {
  /** Unique identifier for the local record (UUID). */
  id: string;
  /** The report payload (JSON object containing claim notes, place ID, device ID, etc.). */
  payload: any;
  /** ISO timestamp recording when the report was created locally. */
  created_at: string;
  /** Synchronization flag indicating whether this record has been synced to Supabase. */
  synced: boolean;
}

const DB_NAME = 'pet-friendly-ph-outbox';
const DB_VERSION = 1;
const STORE_NAME = 'pending-reports';

/**
 * Helper function to open or upgrade the connection to the IndexedDB database.
 * Resolves with the IDBDatabase connection on success.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      // Initialize object store if it does not already exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Saves a new pending report in the local IndexedDB outbox.
 * Useful for caching submissions while offline.
 * 
 * @param {any} payload - The report data to be submitted once online.
 * @returns {Promise<PendingReport>} Resolves with the full locally-saved report object.
 */
export async function addPendingReport(payload: any): Promise<PendingReport> {
  const db = await openDB();
  const report: PendingReport = {
    id: crypto.randomUUID(),
    payload,
    created_at: new Date().toISOString(),
    synced: false,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(report);

    request.onsuccess = () => resolve(report);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all pending reports currently stored in the local outbox.
 * 
 * @returns {Promise<PendingReport[]>} Array of all cached pending reports.
 */
export async function getPendingReports(): Promise<PendingReport[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Marks a specific local pending report as successfully synchronized.
 * 
 * @param {string} id - The UUID of the pending report.
 */
export async function markReportSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const report = getRequest.result as PendingReport | undefined;
      if (report) {
        report.synced = true;
        const putRequest = store.put(report);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Deletes a synchronized or obsolete report from the local outbox.
 * 
 * @param {string} id - The UUID of the pending report.
 */
export async function deletePendingReport(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

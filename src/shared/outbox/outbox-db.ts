import { uuidv4 } from '../utils/uuid';

/**
 * Represents an offline contribution queued in IndexedDB for remote synchronization.
 * Supports multiple payload schemas distinguished by the 'type' field.
 */
export interface PendingReport {
  /** Unique ID key for this outbox database entry. */
  id: string;
  /** Discriminator categorizing the target table/endpoint:
   * - 'report': policy updates on existing places
   * - 'place': new places with their initial policy report
   * - 'flag': flag moderation reports
   */
  type: 'report' | 'place' | 'flag';
  /** Raw query parameters matching their respective API call structure. */
  payload: any;
  /** ISO timestamp recording when the record was cached locally. */
  created_at: string;
  /** Synchronization flag. Defaults to false. */
  synced: boolean;
}

const DB_NAME = 'compaws-outbox';
const DB_VERSION = 1;
const STORE_NAME = 'pending-reports';

/**
 * Opens a connection to the IndexedDB outbox database, creating the store on first run.
 * Resolves with the connection instance.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Queues a contribution payload into the local outbox IndexedDB.
 * 
 * WHY:
 * This acts as our persistent write-buffer. If a user submits data while in a dead-zone,
 * this function captures it so the user doesn't lose their inputs when closing the browser tab.
 * 
 * @param {'report' | 'place' | 'flag'} type - Payload schema discriminator.
 * @param {any} payload - The contribution parameters.
 * @returns {Promise<PendingReport>} The locally cached outbox record.
 */
export async function addPendingReport(type: 'report' | 'place' | 'flag', payload: any): Promise<PendingReport> {
  const db = await openDB();
  const report: PendingReport = {
    id: uuidv4(),
    type,
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
 * Retrieves all pending outbox entries in IndexedDB.
 * 
 * @returns {Promise<PendingReport[]>} Array of cached reports.
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
 * Marks a queued outbox item as synced (useful if preserving log details locally).
 * 
 * @param {string} id - The UUID of the outbox record.
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
 * Deletes a synchronized or discarded contribution from the local outbox.
 * 
 * WHY DELETE IMMEDIATELY:
 * To avoid unbounded storage footprint on the user's browser, we clean up
 * and purge entries immediately once they are verified on the remote Supabase database.
 * 
 * @param {string} id - The UUID of the outbox record.
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

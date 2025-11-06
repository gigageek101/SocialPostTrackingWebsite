import { AppState } from '../types';

const STORAGE_KEY = 'social-post-tracker-data';
const STORAGE_VERSION = '1.0.0';

interface StorageData {
  version: string;
  data: AppState;
}

/**
 * Load app state from localStorage
 */
export function loadFromStorage(): AppState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed: StorageData = JSON.parse(stored);
    
    // Version check - can add migration logic here if needed
    if (parsed.version !== STORAGE_VERSION) {
      console.warn('Storage version mismatch, using stored data anyway');
    }
    
    return parsed.data;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return null;
  }
}

/**
 * Save app state to localStorage
 */
export function saveToStorage(state: AppState): void {
  try {
    const storageData: StorageData = {
      version: STORAGE_VERSION,
      data: {
        ...state,
        lastSync: new Date().toISOString(),
      },
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
  } catch (error) {
    console.error('Failed to save to storage:', error);
  }
}

/**
 * Export app state as JSON file
 */
export function exportData(state: AppState): void {
  try {
    const storageData: StorageData = {
      version: STORAGE_VERSION,
      data: state,
    };
    
    const json = JSON.stringify(storageData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `social-post-tracker-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export data:', error);
    throw error;
  }
}

/**
 * Import app state from JSON file
 */
export function importData(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed: StorageData = JSON.parse(content);
        
        // Basic validation
        if (!parsed.data || !parsed.version) {
          throw new Error('Invalid backup file format');
        }
        
        resolve(parsed.data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Clear all storage data
 */
export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}


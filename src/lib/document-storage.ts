import type {
  DocumentUploads,
  StoredDocument,
  DocumentFile,
} from "@/types/epf-forms";
import imageCompression from "browser-image-compression";

const STORAGE_KEY_DOCS = "epf_documents";
const DB_NAME = "epf_documents_db";
const DB_STORE = "documents";
const DB_VERSION = 2; // bumped for blob storage

// Blob-based storage format for IndexedDB
interface BlobDocument {
  name: string;
  type: string;
  blob: Blob;
}

interface BlobDocumentUploads {
  aadhaar?: BlobDocument;
  pan?: BlobDocument;
  passbook?: BlobDocument;
}

// Open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
  });
};

export async function maybeCompress(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.8,
  });
}

// Create an object URL preview for a File
export const createPreview = (file: File): string => URL.createObjectURL(file);

// Revoke an object URL preview
export const revokePreview = (preview: string | null) => {
  if (preview && preview.startsWith("blob:")) {
    URL.revokeObjectURL(preview);
  }
};

// Convert base64 data URL to File (for loading StoredDocument from server/dummy data)
const base64ToFile = (base64: string, name: string, type: string): File => {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || type;
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], name, { type: mime });
};

// Convert StoredDocument (base64, from server/dummy) to DocumentFile with object URL preview
export const storedToDocumentFile = (stored: StoredDocument): DocumentFile => {
  const file = base64ToFile(stored.base64, stored.name, stored.type);
  return {
    file,
    preview: createPreview(file),
  };
};

// Save to IndexedDB as blobs
const saveToIndexedDB = async (docs: BlobDocumentUploads): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    const request = store.put(docs, STORAGE_KEY_DOCS);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
};

// Load from IndexedDB
const loadFromIndexedDB = async (): Promise<BlobDocumentUploads | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const store = tx.objectStore(DB_STORE);
      const request = store.get(STORAGE_KEY_DOCS);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
      tx.oncomplete = () => db.close();
    });
  } catch (e) {
    console.error("Error loading from IndexedDB:", e);
    return null;
  }
};

// Clear from IndexedDB
const clearFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const request = store.delete(STORAGE_KEY_DOCS);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch (e) {
    console.error("Error clearing IndexedDB:", e);
  }
};

// Save documents to IndexedDB as blobs (no base64 conversion)
export const saveDocumentsToStorage = async (
  docs: DocumentUploads,
): Promise<void> => {
  try {
    const stored: BlobDocumentUploads = {};
    if (docs.aadhaar) {
      stored.aadhaar = { name: docs.aadhaar.file.name, type: docs.aadhaar.file.type, blob: docs.aadhaar.file };
    }
    if (docs.pan) {
      stored.pan = { name: docs.pan.file.name, type: docs.pan.file.type, blob: docs.pan.file };
    }
    if (docs.passbook) {
      stored.passbook = { name: docs.passbook.file.name, type: docs.passbook.file.type, blob: docs.passbook.file };
    }
    await saveToIndexedDB(stored);
    localStorage.removeItem(STORAGE_KEY_DOCS);
    console.log("Documents saved as blobs to IndexedDB");
  } catch (e) {
    console.error("Error saving documents:", e);
  }
};

// Load documents from IndexedDB (blobs → File + object URL preview)
export const loadDocumentsFromStorage = async (): Promise<DocumentUploads> => {
  try {
    const stored = await loadFromIndexedDB();
    if (!stored) return {};

    const docs: DocumentUploads = {};
    for (const key of ["aadhaar", "pan", "passbook"] as const) {
      const entry = stored[key];
      if (entry) {
        // Handle both new blob format and legacy base64 format
        if (entry.blob instanceof Blob) {
          const file = new File([entry.blob], entry.name, { type: entry.type });
          docs[key] = { file, preview: createPreview(file) };
        } else if ((entry as any).base64) {
          // Legacy base64 format — migrate
          const legacy = entry as any as StoredDocument;
          const file = base64ToFile(legacy.base64, legacy.name, legacy.type);
          docs[key] = { file, preview: createPreview(file) };
        }
      }
    }

    // Migrate legacy data if needed
    if (stored.aadhaar && !(stored.aadhaar.blob instanceof Blob)) {
      await saveDocumentsToStorage(docs);
      console.log("Migrated legacy base64 documents to blob storage");
    }

    return docs;
  } catch (e) {
    console.error("Error loading documents:", e);
  }
  return {};
};

// Clear documents from storage
export const clearDocumentsFromStorage = async (): Promise<void> => {
  localStorage.removeItem(STORAGE_KEY_DOCS);
  await clearFromIndexedDB();
};

import type {
  DocumentUploads,
  StoredDocumentUploads,
  StoredDocument,
  DocumentFile,
} from "@/types/epf-forms";

const STORAGE_KEY_DOCS = "epf_documents";
const DB_NAME = "epf_documents_db";
const DB_STORE = "documents";
const DB_VERSION = 1;

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

// Convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Convert base64 to File
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

// Convert DocumentFile to StoredDocument
const documentFileToStored = async (
  doc: DocumentFile,
): Promise<StoredDocument> => {
  const base64 = await fileToBase64(doc.file);
  return {
    name: doc.file.name,
    type: doc.file.type,
    base64,
    preview: doc.preview?? base64,
  };
};

// Convert StoredDocument to DocumentFile
export const storedToDocumentFile = (stored: StoredDocument): DocumentFile => {
  const file = base64ToFile(stored.base64, stored.name, stored.type);
  return {
    file,
    preview: stored.base64,
  };
};

// Save to IndexedDB
const saveToIndexedDB = async (docs: StoredDocumentUploads): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    const store = transaction.objectStore(DB_STORE);

    const request = store.put(docs, STORAGE_KEY_DOCS);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
};

// Load from IndexedDB
const loadFromIndexedDB = async (): Promise<StoredDocumentUploads | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, "readonly");
      const store = transaction.objectStore(DB_STORE);

      const request = store.get(STORAGE_KEY_DOCS);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);

      transaction.oncomplete = () => db.close();
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
      const transaction = db.transaction(DB_STORE, "readwrite");
      const store = transaction.objectStore(DB_STORE);

      const request = store.delete(STORAGE_KEY_DOCS);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      transaction.oncomplete = () => db.close();
    });
  } catch (e) {
    console.error("Error clearing IndexedDB:", e);
  }
};

// Save documents to storage (IndexedDB with localStorage fallback for small data)
export const saveDocumentsToStorage = async (
  docs: DocumentUploads,
): Promise<void> => {
  try {
    const storedDocs: StoredDocumentUploads = {};

    if (docs.aadhaar) {
      storedDocs.aadhaar = await documentFileToStored(docs.aadhaar);
    }
    if (docs.pan) {
      storedDocs.pan = await documentFileToStored(docs.pan);
    }
    if (docs.passbook) {
      storedDocs.passbook = await documentFileToStored(docs.passbook);
    }

    // Use IndexedDB for large storage capacity
    await saveToIndexedDB(storedDocs);

    // Clear any old localStorage data
    localStorage.removeItem(STORAGE_KEY_DOCS);

    console.log("Documents saved successfully to IndexedDB");
  } catch (e) {
    console.error("Error saving documents:", e);
  }
};

// Load documents from storage (try IndexedDB first, then localStorage fallback)
export const loadDocumentsFromStorage = async (): Promise<DocumentUploads> => {
  try {
    // Try IndexedDB first
    const storedDocs = await loadFromIndexedDB();

    if (storedDocs) {
      const docs: DocumentUploads = {};

      if (storedDocs.aadhaar) {
        docs.aadhaar = storedToDocumentFile(storedDocs.aadhaar);
      }
      if (storedDocs.pan) {
        docs.pan = storedToDocumentFile(storedDocs.pan);
      }
      if (storedDocs.passbook) {
        docs.passbook = storedToDocumentFile(storedDocs.passbook);
      }

      console.log("Documents loaded from IndexedDB:", Object.keys(docs));
      return docs;
    }

    // Fallback to localStorage for migration
    const stored = localStorage.getItem(STORAGE_KEY_DOCS);
    if (stored) {
      const storedDocsLocal: StoredDocumentUploads = JSON.parse(stored);
      const docs: DocumentUploads = {};

      if (storedDocsLocal.aadhaar) {
        docs.aadhaar = storedToDocumentFile(storedDocsLocal.aadhaar);
      }
      if (storedDocsLocal.pan) {
        docs.pan = storedToDocumentFile(storedDocsLocal.pan);
      }
      if (storedDocsLocal.passbook) {
        docs.passbook = storedToDocumentFile(storedDocsLocal.passbook);
      }

      // Migrate to IndexedDB
      await saveDocumentsToStorage(docs);

      console.log("Documents migrated from localStorage to IndexedDB");
      return docs;
    }
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

// Get storable document data for payload
export const getStoredDocuments = async (
  docs: DocumentUploads,
): Promise<StoredDocumentUploads> => {
  const storedDocs: StoredDocumentUploads = {};

  if (docs.aadhaar) {
    storedDocs.aadhaar = await documentFileToStored(docs.aadhaar);
  }
  if (docs.pan) {
    storedDocs.pan = await documentFileToStored(docs.pan);
  }
  if (docs.passbook) {
    storedDocs.passbook = await documentFileToStored(docs.passbook);
  }

  return storedDocs;
};

import { 
  collection as firestoreCollection, 
  addDoc as firestoreAddDoc, 
  onSnapshot as firestoreOnSnapshot, 
  doc as firestoreDoc, 
  getDocs as firestoreGetDocs, 
  getDoc as firestoreGetDoc, 
  setDoc as firestoreSetDoc, 
  updateDoc as firestoreUpdateDoc, 
  deleteDoc as firestoreDeleteDoc,
  query as firestoreQuery,
  orderBy as firestoreOrderBy,
  where as firestoreWhere,
  limit as firestoreLimit,
  arrayUnion as firestoreArrayUnion
} from 'firebase/firestore';
import { BACKUP_PROJECTS, BACKUP_SKILLS, BACKUP_TESTIMONIALS } from './data/backup';
import { BACKUP_SERVICES } from './data/servicesBackup';


const IS_LOCAL_MODE = localStorage.getItem('DEV_LOCAL_MODE') === 'true' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const localStore = {
  get: (key: string): any[] => {
    const val = localStorage.getItem(`local_db_${key}`);
    if (!val) return null as any;
    try {
      return JSON.parse(val);
    } catch (e) {
      return null as any;
    }
  },

  set: (key: string, data: any) => localStorage.setItem(`local_db_${key}`, JSON.stringify(data))
};

// --- PASSTHROUGH OR MOCK ---

export const query = (ref: any, ...constraints: any[]) => {
  if (!IS_LOCAL_MODE) return firestoreQuery(ref, ...constraints);
  return ref; // Simple local query mock (returns all)
};

export const orderBy = (field: string, direction: string = 'asc') => {
  if (!IS_LOCAL_MODE) return firestoreOrderBy(field, direction as any);
  return { type: 'orderBy', field, direction };
};

export const where = (field: string, op: string, value: any) => {
  if (!IS_LOCAL_MODE) return firestoreWhere(field, op as any, value);
  return { type: 'where', field, op, value };
};

export const limit = (n: number) => {
  if (!IS_LOCAL_MODE) return firestoreLimit(n);
  return { type: 'limit', n };
};

export const arrayUnion = (...elements: any[]) => {
  if (!IS_LOCAL_MODE) return firestoreArrayUnion(...elements);
  return (currentArray: any[] = []) => [...currentArray, ...elements];
};

export const collection = (dbRef: any, path: string) => {
  if (!IS_LOCAL_MODE) return firestoreCollection(dbRef, path);
  return { path, isLocal: true } as any;
};

export const doc = (dbRef: any, path: string, id: string) => {
  if (!IS_LOCAL_MODE) return firestoreDoc(dbRef, path, id);
  return { path, id, isLocal: true } as any;
};

export const addDoc = async (coll: any, data: any) => {
  if (!coll.isLocal) return firestoreAddDoc(coll, data);
  let docs = localStore.get(coll.path);
  if (!Array.isArray(docs)) docs = [];
  // Evitar duplicados por título al crear
  if (coll.path === 'projects' && data.title) {
    const existing = docs.find((p: any) => p.title === data.title);
    if (existing) return { id: existing.id };
  }

  const newDoc = { ...data, id: Math.random().toString(36).substr(2, 9) };
  const newDocs = [...docs, newDoc];
  localStore.set(coll.path, newDocs);
  window.dispatchEvent(new Event(`local_db_change_${coll.path}`));
  triggerSync().catch(() => {});
  return newDoc;
};

export const updateDoc = async (docRef: any, data: any) => {
  if (!docRef.isLocal) return firestoreUpdateDoc(docRef, data);
  let docs = localStore.get(docRef.path);
  if (!Array.isArray(docs)) return;
  const idx = docs.findIndex((d: any) => String(d.id) === String(docRef.id));
  if (idx > -1) {
    const updatedDocs = [...docs];
    updatedDocs[idx] = { ...updatedDocs[idx], ...data };
    const collPath = docRef.path.split('/')[0];
    localStore.set(collPath, updatedDocs);
    window.dispatchEvent(new Event(`local_db_change_${collPath}`));
    triggerSync().catch(() => {});
  }
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  if (!docRef.isLocal) return firestoreSetDoc(docRef, data, options);
  const collPath = docRef.path;
  let docs = localStore.get(collPath);
  if (!Array.isArray(docs)) docs = [];
  const idx = docs.findIndex((d: any) => String(d.id) === String(docRef.id));
  let newDocs = [...docs];
  if (idx > -1) {
    if (options?.merge) newDocs[idx] = { ...newDocs[idx], ...data };
    else newDocs[idx] = { ...data, id: docRef.id };
  } else {
    if (collPath === 'projects' && data.title) {
      const dupIdx = newDocs.findIndex((p: any) => p.title === data.title);
      if (dupIdx > -1) newDocs[dupIdx] = { ...newDocs[dupIdx], ...data, id: docRef.id };
      else newDocs.push({ ...data, id: docRef.id });
    } else {
      newDocs.push({ ...data, id: docRef.id });
    }
  }
  localStore.set(collPath, newDocs);
  window.dispatchEvent(new Event(`local_db_change_${collPath}`));
  triggerSync().catch(() => {});
};

export const getDoc = async (docRef: any) => {
  if (!docRef.isLocal) return firestoreGetDoc(docRef);
  let docs = localStore.get(docRef.path);
  if (!docs) {
    if (docRef.path === 'projects') docs = BACKUP_PROJECTS;
    else if (docRef.path === 'skills') docs = BACKUP_SKILLS;
    else if (docRef.path === 'services') docs = BACKUP_SERVICES;
    else if (docRef.path === 'testimonials') docs = BACKUP_TESTIMONIALS;
    else docs = [];
  }
  const d = docs.find((x: any) => String(x.id) === String(docRef.id));
  return { exists: () => !!d, data: () => d } as any;
};

export const getDocs = async (coll: any) => {
  if (!coll.isLocal) return firestoreGetDocs(coll);
  let docs = localStore.get(coll.path);
  const isEmpty = !docs || docs.length === 0;
  if (!docs) {
    if (coll.path === 'projects') docs = BACKUP_PROJECTS;
    else if (coll.path === 'skills') docs = BACKUP_SKILLS;
    else if (coll.path === 'services') docs = BACKUP_SERVICES;
    else if (coll.path === 'testimonials') docs = BACKUP_TESTIMONIALS;
    else docs = [];
  }
  return { 
    empty: isEmpty, 
    docs: (docs || []).map((d: any) => ({ id: d.id, data: () => d })) 
  } as any;
};

export const deleteDoc = async (docRef: any) => {
  if (!docRef.isLocal) return firestoreDeleteDoc(docRef);
  let docs = localStore.get(docRef.path);
  if (!Array.isArray(docs)) return;
  const filtered = docs.filter((d: any) => String(d.id) !== String(docRef.id));
  const collPath = docRef.path.split('/')[0];
  localStore.set(collPath, filtered);
  window.dispatchEvent(new Event(`local_db_change_${collPath}`));
  triggerSync().catch(() => {});
};

export const onSnapshot = (ref: any, callback: (snap: any) => void) => {
  if (!ref.isLocal) return firestoreOnSnapshot(ref, callback);
  
  const handler = () => {
    let docs = localStore.get(ref.path || ref.collection?.path);
    const isEmpty = !docs || docs.length === 0;
    if (!docs) {
      const p = ref.path || ref.collection?.path;
      if (p === 'projects') docs = BACKUP_PROJECTS;
      else if (p === 'skills') docs = BACKUP_SKILLS;
      else if (p === 'services') docs = BACKUP_SERVICES;
      else if (p === 'testimonials') docs = BACKUP_TESTIMONIALS;
      else docs = [];
    }

    if (ref.id) {
      const d = docs.find((x: any) => String(x.id) === String(ref.id));
      callback({ exists: () => !!d, data: () => d } as any);
    } else {
      callback({ 
        empty: isEmpty,
        docs: (docs || []).map((d: any) => ({ id: d.id, data: () => d })) 
      } as any);
    }
  };

  window.addEventListener(`local_db_change_${ref.path || ref.collection?.path}`, handler);
  const storageHandler = (e: StorageEvent) => {
    if (e.key === `local_db_${ref.path || ref.collection?.path}`) handler();
  };
  window.addEventListener('storage', storageHandler);
  handler(); 
  return () => {
    window.removeEventListener(`local_db_change_${ref.path || ref.collection?.path}`, handler);
    window.removeEventListener('storage', storageHandler);
  };
};

export const triggerSync = async () => {
  const allData: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('local_db_')) {
      try {
        allData[key] = JSON.parse(localStorage.getItem(key) || '[]');
      } catch (e) {}
    }
  }

  try {
    const response = await fetch('http://localhost:3005/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allData)
    });
    return await response.json();
  } catch (err) {
    console.warn('El servidor de sincronización (puerto 3005) está apagado. Datos guardados en LocalStorage.');
    return { status: 'local_only', message: 'Guardado local exitoso. (Git sync apagado)' };
  }
};

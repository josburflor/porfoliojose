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

const IS_LOCAL_MODE = localStorage.getItem('DEV_LOCAL_MODE') === 'true';

const localStore = {
  get: (key: string) => JSON.parse(localStorage.getItem(`local_db_${key}`) || '[]'),
  set: (key: string, data: any) => localStorage.setItem(`local_db_${key}`, JSON.stringify(data))
};

// --- PASSTHROUGH OR MOCK ---

export const query = (ref: any, ...constraints: any[]) => {
  if (!IS_LOCAL_MODE) return firestoreQuery(ref, ...constraints);
  return ref; // Simple local query mock (returns all)
};

export const orderBy = (field: string, direction: string = 'asc') => {
  if (!IS_LOCAL_MODE) return firestoreOrderBy(field, direction);
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
  const docs = localStore.get(coll.path);
  const newDoc = { ...data, id: Math.random().toString(36).substr(2, 9) };
  docs.push(newDoc);
  localStore.set(coll.path, docs);
  window.dispatchEvent(new Event(`local_db_change_${coll.path}`));
  return newDoc;
};

export const updateDoc = async (docRef: any, data: any) => {
  if (!docRef.isLocal) return firestoreUpdateDoc(docRef, data);
  const docs = localStore.get(docRef.path);
  const idx = docs.findIndex((d: any) => d.id === docRef.id);
  if (idx > -1) {
    docs[idx] = { ...docs[idx], ...data };
    localStore.set(docRef.path, docs);
    window.dispatchEvent(new Event(`local_db_change_${docRef.path}`));
  }
};

export const setDoc = async (docRef: any, data: any) => {
  if (!docRef.isLocal) return firestoreSetDoc(docRef, data);
  const docs = localStore.get(docRef.path);
  const idx = docs.findIndex((d: any) => d.id === docRef.id);
  if (idx > -1) docs[idx] = data;
  else docs.push({ ...data, id: docRef.id });
  localStore.set(docRef.path, docs);
  window.dispatchEvent(new Event(`local_db_change_${docRef.path}`));
};

export const getDoc = async (docRef: any) => {
  if (!docRef.isLocal) return firestoreGetDoc(docRef);
  const docs = localStore.get(docRef.path);
  const data = docs.find((d: any) => d.id === docRef.id);
  return { exists: () => !!data, data: () => data } as any;
};

export const getDocs = async (coll: any) => {
  if (!coll.isLocal) return firestoreGetDocs(coll);
  const docs = localStore.get(coll.path);
  return { 
    empty: docs.length === 0, 
    docs: docs.map((d: any) => ({ id: d.id, data: () => d })) 
  } as any;
};

export const deleteDoc = async (docRef: any) => {
  if (!docRef.isLocal) return firestoreDeleteDoc(docRef);
  const docs = localStore.get(docRef.path);
  const filtered = docs.filter((d: any) => d.id !== docRef.id);
  localStore.set(docRef.path, filtered);
  window.dispatchEvent(new Event(`local_db_change_${docRef.path}`));
};

export const onSnapshot = (ref: any, callback: (snap: any) => void) => {
  if (!ref.isLocal) return firestoreOnSnapshot(ref, callback);
  
  const handler = () => {
    const docs = localStore.get(ref.path || ref.collection?.path);
    if (ref.id) {
      const d = docs.find((x: any) => x.id === ref.id);
      callback({ exists: () => !!d, data: () => d } as any);
    } else {
      callback({ docs: docs.map((d: any) => ({ id: d.id, data: () => d })) } as any);
    }
  };

  window.addEventListener(`local_db_change_${ref.path || ref.collection?.path}`, handler);
  handler(); 
  return () => window.removeEventListener(`local_db_change_${ref.path || ref.collection?.path}`, handler);
};

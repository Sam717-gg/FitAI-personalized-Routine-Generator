import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = authInstance;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(db: Firestore) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}

async function getFirebaseConfig() {
  try {
    const response = await fetch('/firebase-applet-config.json');
    if (!response.ok) return null;
    const config = await response.json();
    return config;
  } catch (e) {
    return null;
  }
}

export async function initFirebase() {
  if (app) return { app, auth: authInstance!, db: dbInstance! };

  const config = await getFirebaseConfig();
  if (!config || !config.apiKey || config.apiKey.includes('TODO')) {
    throw new Error("Firebase not configured. Please accept terms in the setup UI.");
  }

  app = initializeApp(config);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app, config.firestoreDatabaseId);
  
  await testConnection(dbInstance);
  
  return { app, auth: authInstance, db: dbInstance };
}

// Helper for Auth
export const getFirebaseAuth = async () => {
  const { auth } = await initFirebase();
  return auth;
};

// Helper for DB
export const getFirebaseDB = async () => {
  const { db } = await initFirebase();
  return db;
};

export const googleProvider = new GoogleAuthProvider();

export const signIn = async () => {
  const auth = await getFirebaseAuth();
  return signInWithPopup(auth, googleProvider);
};

export const logOut = async () => {
  const auth = await getFirebaseAuth();
  return signOut(auth);
};

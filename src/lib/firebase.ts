
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const firebaseConfigValues: Partial<FirebaseConfig> = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingEnvVarKeys: string[] = (Object.keys(firebaseConfigValues) as Array<keyof FirebaseConfig>)
  .filter(key => !firebaseConfigValues[key]);

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

if (missingEnvVarKeys.length > 0) {
  const errorMessage = `Firebase Fatal Error: Essential Firebase configuration is missing for the following keys: ${missingEnvVarKeys.join(", ")}.
Please ensure these environment variables are set.
- If running locally, check your .env.local file.
- If deployed, check your hosting provider's environment variable settings.
Application cannot start without these Firebase credentials.`;

  console.error("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! FATAL ERROR: FIREBASE ENVIRONMENT VARIABLES ARE MISSING !!!");
  console.error(`!!! Details: ${errorMessage}`);
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");
  throw new Error(errorMessage);
} else {
  // All environment variables are present, proceed with initialization
  const completeConfig = firebaseConfigValues as FirebaseConfig;

  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.log("Firebase Init: Attempting to initialize with projectId:", completeConfig.projectId);
  }
  
  if (typeof window !== 'undefined' && completeConfig.projectId !== "gold-maq-control" && process.env.NODE_ENV !== 'production') {
     console.warn("Firebase Init: WARNING - Project ID does NOT match 'gold-maq-control'. Expected: 'gold-maq-control', Got:", completeConfig.projectId);
  }

  if (!getApps().length) {
    app = initializeApp(completeConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
  storage = getStorage(app);
}

export { db, storage };

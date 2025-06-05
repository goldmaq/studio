
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage"; // Adicionado

// Define the expected shape of the config for type safety after checks
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

const missingEnvVarDetails: string[] = [];
if (!firebaseConfigValues.apiKey) missingEnvVarDetails.push("NEXT_PUBLIC_FIREBASE_API_KEY");
if (!firebaseConfigValues.authDomain) missingEnvVarDetails.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
if (!firebaseConfigValues.projectId) missingEnvVarDetails.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
if (!firebaseConfigValues.storageBucket) missingEnvVarDetails.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
if (!firebaseConfigValues.messagingSenderId) missingEnvVarDetails.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
if (!firebaseConfigValues.appId) missingEnvVarDetails.push("NEXT_PUBLIC_FIREBASE_APP_ID");

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

if (missingEnvVarDetails.length > 0) {
  const errorMessage = `Firebase Fatal Error: Essential Firebase configuration is missing: ${missingEnvVarDetails.join(", ")}.
Please ensure these environment variables are set in your .env.local (for local development)
or in your hosting provider's settings (for deployment).
Firebase functionalities will not work. Application cannot start.`;

  console.error(errorMessage); // Log the error regardless of environment

  if (typeof window !== 'undefined') {
    // Client-side: Show error in UI and throw to stop execution
    document.body.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word; padding: 20px; background-color: #fff0f0; border: 1px solid red; color: red; font-family: monospace;">${errorMessage}</pre>`;
    throw new Error(errorMessage);
  } else {
    // Server-side: Log an extremely prominent error, but DO NOT THROW.
    // This is a diagnostic step. If the ISE disappears, missing env vars were the cause.
    // `db` and `storage` will be uninitialized if this path is taken.
    console.error("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! SERVER-SIDE FATAL ERROR: FIREBASE ENVIRONMENT VARIABLES ARE MISSING !!!");
    console.error(`!!! DETAILS: ${errorMessage}`);
    console.error("!!! Firebase (db, storage) will NOT be initialized on the server.       !!!");
    console.error("!!! This will likely lead to further errors if db/storage are accessed.     !!!");
    console.error("!!! CHECK YOUR SERVER/HOSTING ENVIRONMENT VARIABLES.                     !!!");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");
    // Assign to satisfy TypeScript that they are assigned, though they are unusable.
    // This is part of the diagnostic to see if the original 'throw' was the ISE source.
    db = undefined as any;
    storage = undefined as any;
  }
} else {
  // All environment variables are present, proceed with initialization
  const completeConfig = firebaseConfigValues as FirebaseConfig;

  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.log("Firebase Init: Attempting to initialize with projectId:", completeConfig.projectId);
  }

  if (typeof window !== 'undefined' && completeConfig.projectId !== "gold-maq-control") {
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

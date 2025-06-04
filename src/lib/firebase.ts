
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

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

if (missingEnvVarDetails.length > 0) {
  const errorMessage = `Firebase Fatal Error: Essential Firebase configuration is missing: ${missingEnvVarDetails.join(", ")}. 
Please ensure these environment variables are set in your .env.local (for local development) 
or in your hosting provider's settings (for deployment). 
Firebase functionalities will not work. Application cannot start.`;
  
  // This error will be thrown when this module is imported, making the issue very clear.
  // It will stop the JavaScript execution.
  throw new Error(errorMessage);
} else {
  // All values are present, so the cast to FirebaseConfig is safe.
  const completeConfig = firebaseConfigValues as FirebaseConfig;
  if (!getApps().length) {
    app = initializeApp(completeConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
}

export { db };

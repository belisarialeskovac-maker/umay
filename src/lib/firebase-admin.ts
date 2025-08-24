
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// This is a simplified check. For production, you'd use environment variables
// and more robust credential management.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

let app: App;

export function initFirebase() {
  if (getApps().length === 0) {
    if (serviceAccount) {
      // Running in a Node.js environment with service account
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      // Running in a client-side or emulated environment
      app = initializeApp();
    }
  } else {
    app = getApps()[0];
  }
  return app;
}

    
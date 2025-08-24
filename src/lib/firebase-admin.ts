
import { initializeApp, getApps, App } from 'firebase-admin/app';

let app: App;

/**
 * Initializes Firebase Admin SDK.
 * It uses default credentials when running in a Firebase environment.
 */
export function initFirebase() {
  if (getApps().length === 0) {
    app = initializeApp();
  } else {
    app = getApps()[0];
  }
  return app;
}

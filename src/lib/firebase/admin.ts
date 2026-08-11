import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID no está configurado.");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (Boolean(clientEmail) !== Boolean(privateKey)) {
    throw new Error(
      "FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY deben configurarse juntas.",
    );
  }

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  return initializeApp({
    credential:
      clientEmail && privateKey
        ? cert({ projectId, clientEmail, privateKey })
        : applicationDefault(),
    projectId,
    storageBucket,
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

export function getAdminStorageBucket() {
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error("FIREBASE_STORAGE_BUCKET no está configurado.");
  }
  return getStorage(getAdminApp()).bucket(bucketName);
}

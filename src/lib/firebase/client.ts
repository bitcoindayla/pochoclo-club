"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";

function resolveAuthDomain() {
  const fallback = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  if (typeof window === "undefined") return fallback;
  const host = window.location.hostname;
  if (host === "pochoclo.club" || host === "www.pochoclo.club") return host;
  return fallback;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export async function getClientAuth() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  return auth;
}

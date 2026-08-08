import { createHash, randomUUID } from "node:crypto";

import {
  cert,
  deleteApp,
  initializeApp,
  type App as FirebaseAdminApp,
} from "firebase-admin/app";
import { getAuth as getAuthForApp } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { cancelOwnReservation } from "@/lib/screenings";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const uid = `e2e-member-${randomUUID()}`;
const email = `${uid}@example.com`;
const memberName = "Miembro Temporal Codex";
const guestName = "Invitado Temporal Codex";
const ownPlaceCode = "P1";
const guestPlaceCode = "P2";
const guestReservationId = `external-${createHash("sha256").update(uid).digest("hex")}`;

let browser: Browser | null = null;
let page: Page | null = null;
let tokenSignerApp: FirebaseAdminApp | null = null;
let screeningId: string | null = null;
let authUserCreated = false;
let memberCreated = false;

function cookieValue(headers: Headers, name: string) {
  const values = headers.getSetCookie();
  for (const value of values) {
    const match = new RegExp(`^${name}=([^;]+)`).exec(value);
    if (match) return match[1];
  }
  throw new Error(`La respuesta no incluyó la cookie ${name}.`);
}

async function createSessionCookie() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY no está configurada.");
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!credentialPath || !projectId) {
    throw new Error("La credencial local de Firebase Admin no está configurada.");
  }

  tokenSignerApp = initializeApp(
    { credential: cert(credentialPath), projectId },
    `member-flow-token-signer-${uid}`,
  );
  const customToken = await getAuthForApp(tokenSignerApp).createCustomToken(uid);
  const tokenResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const tokenBody = (await tokenResponse.json()) as { idToken?: string; error?: unknown };
  if (!tokenResponse.ok || !tokenBody.idToken) {
    throw new Error(`Firebase no creó el ID token temporal: ${JSON.stringify(tokenBody.error)}`);
  }

  const csrfResponse = await fetch(`${BASE_URL}/api/session/csrf`);
  const csrfBody = (await csrfResponse.json()) as { token?: string };
  if (!csrfResponse.ok || !csrfBody.token) {
    throw new Error("La aplicación no creó el token CSRF.");
  }
  const csrfCookie = cookieValue(csrfResponse.headers, "pochoclo.csrf");

  const sessionResponse = await fetch(`${BASE_URL}/api/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `pochoclo.csrf=${csrfCookie}`,
      Origin: BASE_URL,
    },
    body: JSON.stringify({ idToken: tokenBody.idToken, csrfToken: csrfBody.token }),
  });
  if (!sessionResponse.ok) {
    throw new Error(`La aplicación rechazó la sesión temporal: ${await sessionResponse.text()}`);
  }
  return cookieValue(sessionResponse.headers, "pochoclo.session");
}

async function clickButtonByText(currentPage: Page, text: string) {
  await currentPage.evaluate((expectedText) => {
    const button = [...document.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes(expectedText),
    );
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`No se encontró el botón: ${expectedText}`);
    }
    if (button.disabled) throw new Error(`El botón está deshabilitado: ${expectedText}`);
    button.click();
  }, text);
}

async function clickPlace(currentPage: Page, placeCode: string) {
  await currentPage.evaluate((expectedCode) => {
    const button = [...document.querySelectorAll("button.seat, button.floorPlace")].find(
      (candidate) => candidate.querySelector("strong")?.textContent === expectedCode,
    );
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`No se encontró el lugar ${expectedCode}.`);
    }
    if (button.disabled) throw new Error(`El lugar ${expectedCode} no está disponible.`);
    button.click();
  }, placeCode);
  await currentPage.waitForFunction(
    (expectedCode) =>
      [...document.querySelectorAll<HTMLInputElement>('input[name="placeCode"]')].some(
        (input) => input.value === expectedCode,
      ),
    {},
    placeCode,
  );
}

beforeAll(async () => {
  const firestore = getAdminFirestore();
  const pointerSnapshot = await firestore.collection("system").doc("openScreening").get();
  const currentId = pointerSnapshot.exists
    ? (pointerSnapshot.data() as { screeningId?: unknown }).screeningId
    : null;
  if (typeof currentId !== "string") throw new Error("No hay una función visible.");
  screeningId = currentId;

  const screeningReference = firestore.collection("screenings").doc(screeningId);
  const [screeningSnapshot, ownPlace, guestPlace, ownBlock, guestBlock, waitlist] =
    await Promise.all([
      screeningReference.get(),
      screeningReference.collection("places").doc(ownPlaceCode).get(),
      screeningReference.collection("places").doc(guestPlaceCode).get(),
      screeningReference.collection("blocks").doc(ownPlaceCode).get(),
      screeningReference.collection("blocks").doc(guestPlaceCode).get(),
      screeningReference.collection("waitlist").get(),
    ]);
  if ((screeningSnapshot.data() as { status?: unknown }).status !== "open") {
    throw new Error("La función actual no tiene las reservas abiertas.");
  }
  if (ownPlace.exists || guestPlace.exists || ownBlock.exists || guestBlock.exists) {
    throw new Error("P1 y P2 deben estar libres para ejecutar el flujo sin afectar reservas reales.");
  }
  if (!waitlist.empty) {
    throw new Error("La lista de espera debe estar vacía para no promover personas reales.");
  }

  await getAdminAuth().createUser({
    uid,
    email,
    emailVerified: true,
    displayName: memberName,
  });
  authUserCreated = true;
  const now = Timestamp.now();
  await firestore.collection("members").doc(uid).create({
    email,
    name: memberName,
    imageUrl: null,
    role: "member",
    active: true,
    createdAt: now,
    updatedAt: now,
    lastSignedInAt: now,
  });
  memberCreated = true;

  const sessionCookie = await createSessionCookie();
  browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1 },
  });
  page = await browser.newPage();
  await page.setCookie({
    name: "pochoclo.session",
    value: sessionCookie,
    url: BASE_URL,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });
}, 60_000);

afterAll(async () => {
  if (browser) await browser.close();

  const firestore = getAdminFirestore();
  if (screeningId) {
    const screeningReference = firestore.collection("screenings").doc(screeningId);
    const ownerReservation = await screeningReference.collection("reservations").doc(uid).get();
    if (ownerReservation.exists) {
      try {
        await cancelOwnReservation(screeningId, { id: uid });
      } catch {
        // La limpieza defensiva de abajo solo elimina documentos que pertenecen al fixture.
      }
    }

    const [remainingOwner, remainingGuest, plusOne, ownPlace, guestPlace] = await Promise.all([
      screeningReference.collection("reservations").doc(uid).get(),
      screeningReference.collection("reservations").doc(guestReservationId).get(),
      screeningReference.collection("plusOnes").doc(uid).get(),
      screeningReference.collection("places").doc(ownPlaceCode).get(),
      screeningReference.collection("places").doc(guestPlaceCode).get(),
    ]);
    const batch = firestore.batch();
    if (remainingOwner.exists) batch.delete(remainingOwner.ref);
    if (remainingGuest.exists) batch.delete(remainingGuest.ref);
    if (plusOne.exists) batch.delete(plusOne.ref);
    if (ownPlace.exists && (ownPlace.data() as { memberId?: unknown }).memberId === uid) {
      batch.delete(ownPlace.ref);
    }
    if (
      guestPlace.exists &&
      (guestPlace.data() as { memberId?: unknown }).memberId === guestReservationId
    ) {
      batch.delete(guestPlace.ref);
    }
    await batch.commit();
  }

  if (memberCreated) await firestore.collection("members").doc(uid).delete();
  if (authUserCreated) await getAdminAuth().deleteUser(uid);
  if (tokenSignerApp) await deleteApp(tokenSignerApp);
}, 60_000);

describe("normal member browser flow", () => {
  it("reserves a place, adds an external +1 and cancels both", async () => {
    if (!page || !screeningId) throw new Error("El navegador temporal no se inició.");
    const firestore = getAdminFirestore();
    const screeningReference = firestore.collection("screenings").doc(screeningId);

    await page.goto(`${BASE_URL}/club`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".roomMap");
    expect(await page.evaluate(() => document.body.innerText)).toContain("Hola, Miembro.");

    await clickPlace(page, ownPlaceCode);
    await clickButtonByText(page, "Confirmar mi lugar");
    await page.waitForFunction(
      (placeCode) =>
        [...document.querySelectorAll("button")].some(
          (button) => button.textContent?.includes(`Mi lugar · ${placeCode}`),
        ),
      {},
      ownPlaceCode,
    );
    expect((await screeningReference.collection("reservations").doc(uid).get()).exists).toBe(true);

    await clickButtonByText(page, "Agregar un +1");
    await page.waitForSelector("#guest-search");
    await clickPlace(page, guestPlaceCode);
    await page.type("#guest-search", guestName);
    await clickButtonByText(page, "Confirmar reserva del +1");
    await page.waitForFunction(
      (placeCode) =>
        [...document.querySelectorAll("button")].some(
          (button) => button.textContent?.includes(`Mi +1 · ${placeCode}`),
        ),
      {},
      guestPlaceCode,
    );

    const [plusOne, guestReservation] = await Promise.all([
      screeningReference.collection("plusOnes").doc(uid).get(),
      screeningReference.collection("reservations").doc(guestReservationId).get(),
    ]);
    expect(plusOne.exists).toBe(true);
    expect(plusOne.data()).toMatchObject({ memberName: guestName, placeCode: guestPlaceCode });
    expect(guestReservation.exists).toBe(true);

    await clickButtonByText(page, `Mi lugar · ${ownPlaceCode}`);
    await clickButtonByText(page, "Cancelar mi reserva");
    await page.waitForFunction(
      () => document.body.innerText.includes("Tu reserva fue cancelada."),
    );

    const [ownerAfter, guestAfter, plusOneAfter, ownPlaceAfter, guestPlaceAfter] =
      await Promise.all([
        screeningReference.collection("reservations").doc(uid).get(),
        screeningReference.collection("reservations").doc(guestReservationId).get(),
        screeningReference.collection("plusOnes").doc(uid).get(),
        screeningReference.collection("places").doc(ownPlaceCode).get(),
        screeningReference.collection("places").doc(guestPlaceCode).get(),
      ]);
    expect(ownerAfter.exists).toBe(false);
    expect(guestAfter.exists).toBe(false);
    expect(plusOneAfter.exists).toBe(false);
    expect(ownPlaceAfter.exists).toBe(false);
    expect(guestPlaceAfter.exists).toBe(false);

    await page.reload({ waitUntil: "networkidle0" });
    expect(await page.evaluate(() => document.body.innerText)).toContain(
      "Tocá un lugar disponible",
    );
  }, 90_000);
});

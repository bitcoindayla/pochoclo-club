import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function firestore() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Falta FIREBASE_PROJECT_ID.");
  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  return getFirestore(app);
}

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titlesMatch(requested: string, stored: string) {
  const left = normalizeTitle(requested);
  const right = normalizeTitle(stored);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const aliases: Record<string, string> = {
    "everyone everywhere all at once": "everything everywhere all at once",
    doogtooth: "dogtooth",
  };
  return (aliases[left] ?? left) === right;
}

export async function markMemberPresent(memberQuery: string, titles: string[]) {
  const db = firestore();
  const members = await db.collection("members").get();
  const needle = normalizeTitle(memberQuery);
  const matches = members.docs.filter((doc) => {
    const data = doc.data() as { name?: string; email?: string };
    return (
      normalizeTitle(data.name ?? "") === needle ||
      normalizeTitle(data.email ?? "") === needle ||
      normalizeTitle(data.name ?? "").includes(needle) ||
      doc.id === memberQuery
    );
  });
  if (matches.length !== 1) {
    throw new Error(
      `No pude ubicar un único miembro para "${memberQuery}". Encontré ${matches.length}.`,
    );
  }
  const memberDoc = matches[0]!;
  const member = memberDoc.data() as { name: string; email: string; archiveNights?: number };
  const films = await db.collection("filmHistory").get();
  const unused = titles.filter((title) => {
    return !films.docs.some((doc) => titlesMatch(title, String((doc.data() as { title?: string }).title ?? "")));
  });
  if (unused.length > 0) {
    throw new Error(`No encontré estas películas: ${unused.join(" · ")}`);
  }

  const personId = memberDoc.id;
  let added = 0;
  let already = 0;
  const marked: string[] = [];

  for (const film of films.docs) {
    const data = film.data() as {
      title?: string;
      attendees?: Array<Record<string, unknown>>;
      presentCount?: number;
      absentCount?: number;
    };
    const title = String(data.title ?? "");
    if (!titles.some((requested) => titlesMatch(requested, title))) continue;

    const attendees = Array.isArray(data.attendees) ? [...data.attendees] : [];
    const index = attendees.findIndex((row) => row.personId === personId || row.memberId === personId);
    if (index >= 0) {
      const current = attendees[index]!;
      if (current.status === "presente") {
        already += 1;
        marked.push(title);
        continue;
      }
      attendees[index] = { ...current, status: "presente" };
    } else {
      attendees.push({
        personId,
        name: member.name,
        kind: "self",
        memberId: personId,
        hostMemberId: null,
        hostName: null,
        placeCode: "",
        status: "presente",
        scores: null,
        average: null,
      });
      added += 1;
    }
    const present = attendees.filter((row) => row.status === "presente").length;
    const absent = attendees.filter((row) => row.status === "ausente").length;
    await film.ref.update({
      attendees,
      presentCount: present,
      absentCount: absent,
    });
    marked.push(title);
  }

  const nights = Math.max(typeof member.archiveNights === "number" ? member.archiveNights : 0, marked.length);
  await memberDoc.ref.update({ archiveNights: nights });

  return {
    memberId: personId,
    name: member.name,
    email: member.email,
    added,
    already,
    nights,
    films: marked,
  };
}

const argv = process.argv.slice(2);
if (argv[0] && argv[0] !== "--") {
  const [memberQuery, ...titles] = argv;
  const result = await markMemberPresent(memberQuery!, titles);
  console.log(JSON.stringify(result, null, 2));
}

export class SalaListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalaListError";
  }
}

export type SalaListFilm = {
  id: string;
  title: string;
  year: number;
  director: string;
  bio: string;
};

export const SALA_LIST: readonly SalaListFilm[] = [
  { id: "spirited-away", title: "El viaje de Chihiro", year: 2001, director: "Hayao Miyazaki", bio: "Una niña cruza el umbral. Los espíritus le cobran el nombre." },
  { id: "parasite", title: "Parasite", year: 2019, director: "Bong Joon-ho", bio: "Se cuelan por el sótano. La casa de arriba también muerde." },
  { id: "whiplash", title: "Whiplash", year: 2014, director: "Damien Chazelle", bio: "El talento no alcanza. El maestro pide sangre." },
  { id: "lives-of-others", title: "La vida de los otros", year: 2006, director: "Florian Henckel von Donnersmarck", bio: "Un espía escucha un departamento. Empieza a oírse a sí mismo." },
  { id: "princess-mononoke", title: "La princesa Mononoke", year: 1997, director: "Hayao Miyazaki", bio: "Dioses, hierro y un príncipe lobo. El bosque no perdona." },
  { id: "oldboy", title: "Oldboy", year: 2003, director: "Park Chan-wook", bio: "Quince años sin saber por qué. La venganza abre otra puerta." },
  { id: "eternal-sunshine", title: "Eternal Sunshine", year: 2004, director: "Michel Gondry", bio: "Borrar a quien amás. El recuerdo se niega." },
  { id: "incendies", title: "Incendies", year: 2010, director: "Denis Villeneuve", bio: "Dos hermanos leen un testamento. El origen arde." },
  { id: "a-separation", title: "Una separación", year: 2011, director: "Asghar Farhadi", bio: "Un divorcio en Teherán. La verdad se parte en dos." },
  { id: "the-hunt", title: "La caza", year: 2012, director: "Thomas Vinterberg", bio: "Una mentira de jardín de infantes. El pueblo ya eligió culpable." },
  { id: "amelie", title: "Amélie", year: 2001, director: "Jean-Pierre Jeunet", bio: "París en verde. Una camarera arregla vidas ajenas." },
  { id: "pans-labyrinth", title: "El laberinto del fauno", year: 2006, director: "Guillermo del Toro", bio: "Una niña y un fauno. El fascismo espera abajo de la cuna." },
  { id: "there-will-be-blood", title: "There Will Be Blood", year: 2007, director: "Paul Thomas Anderson", bio: "Petróleo, un predicador y un hombre que no comparte nada." },
  { id: "secreto-de-sus-ojos", title: "El secreto de sus ojos", year: 2009, director: "Juan José Campanella", bio: "Un crimen que no cierra. El amor tampoco." },
  { id: "the-father", title: "The Father", year: 2020, director: "Florian Zeller", bio: "El departamento cambia de forma. La memoria se va con él." },
  { id: "fanny-and-alexander", title: "Fanny y Alexander", year: 1982, director: "Ingmar Bergman", bio: "Navidad, teatro y un padrastro. Bergman abre la casa entera." },
  { id: "paris-texas", title: "Paris, Texas", year: 1984, director: "Wim Wenders", bio: "Un hombre sale del desierto. Quiere devolver lo que rompió." },
  { id: "memories-of-murder", title: "Memories of Murder", year: 2003, director: "Bong Joon-ho", bio: "Un pueblo, un asesino, detectives que improvisan. Corea suda." },
  { id: "relatos-salvajes", title: "Relatos salvajes", year: 2014, director: "Damián Szifron", bio: "La bronca argentina en seis estallidos. Nadie sale ileso." },
  { id: "grand-budapest", title: "The Grand Budapest Hotel", year: 2014, director: "Wes Anderson", bio: "Un concierge, un pastel y una Europa que se esfuma." },
  { id: "im-still-here", title: "Aún estoy aquí", year: 2024, director: "Walter Salles", bio: "Una familia espera. La dictadura no devuelve el cuerpo." },
  { id: "persona", title: "Persona", year: 1966, director: "Ingmar Bergman", bio: "Dos mujeres, una isla. Los rostros se prestan." },
  { id: "perfect-blue", title: "Perfect Blue", year: 1997, director: "Satoshi Kon", bio: "Una idol se retira. El espejo no la deja." },
  { id: "festen", title: "Festen", year: 1998, director: "Thomas Vinterberg", bio: "Un brindis de cumpleaños. La familia se sienta sobre el secreto." },
  { id: "magnolia", title: "Magnolia", year: 1999, director: "Paul Thomas Anderson", bio: "Llueven ranas. Los padres y los hijos no terminan de hablarse." },
  { id: "in-the-mood-for-love", title: "In the Mood for Love", year: 2000, director: "Wong Kar-wai", bio: "Pasillos, fideos, un amor que no se toca." },
  { id: "amores-perros", title: "Amores perros", year: 2000, director: "Alejandro González Iñárritu", bio: "Tres choques en el DF. Los perros saben antes." },
  { id: "nobody-knows", title: "Nobody Knows", year: 2004, director: "Hirokazu Kore-eda", bio: "Chicos solos en un depto. Tokio sigue de largo." },
  { id: "dogville", title: "Dogville", year: 2003, director: "Lars von Trier", bio: "Un pueblo dibujado con tiza. La hospitalidad tiene precio." },
  { id: "boogie-nights", title: "Boogie Nights", year: 1997, director: "Paul Thomas Anderson", bio: "El porno de los 70. Una familia que se desarma en el set." },
  { id: "chungking-express", title: "Chungking Express", year: 1994, director: "Wong Kar-wai", bio: "Dos policías, latas de ananá y una ciudad que no duerme." },
  { id: "mulholland-drive", title: "Mulholland Drive", year: 2001, director: "David Lynch", bio: "Hollywood de noche. El sueño cambia de nombre." },
  { id: "still-walking", title: "Still Walking", year: 2008, director: "Hirokazu Kore-eda", bio: "Un aniversario familiar. Kore-eda cocina lo que no se dice." },
  { id: "about-elly", title: "About Elly", year: 2009, director: "Asghar Farhadi", bio: "Un fin de semana junto al mar. Ella deja de estar." },
  { id: "fantastic-mr-fox", title: "Fantastic Mr. Fox", year: 2009, director: "Wes Anderson", bio: "Un zorro que no puede dejar de cazar. Stop motion con corbata." },
  { id: "amour", title: "Amour", year: 2012, director: "Michael Haneke", bio: "Dos pianistas viejos. El amor se queda a cuidar." },
  { id: "arrival", title: "Arrival", year: 2016, director: "Denis Villeneuve", bio: "Naves sobre el mundo. El lenguaje cambia el tiempo." },
  { id: "marriage-story", title: "Marriage Story", year: 2019, director: "Noah Baumbach", bio: "Separarse con abogados. El amor sigue gritando en la pieza." },
  { id: "perfect-days", title: "Perfect Days", year: 2023, director: "Wim Wenders", bio: "Un hombre limpia baños en Tokio. El sol entra igual." },
  { id: "breaking-the-waves", title: "Breaking the Waves", year: 1996, director: "Lars von Trier", bio: "Fe, sexo y un pueblo que mira. Von Trier no afloja." },
  { id: "little-miss-sunshine", title: "Little Miss Sunshine", year: 2006, director: "Jonathan Dayton y Valerie Faris", bio: "Una combi amarilla. La familia llega tarde a ser feliz." },
  { id: "a-prophet", title: "Un profeta", year: 2009, director: "Jacques Audiard", bio: "Un pibe entra a la cárcel. Sale sabiendo el idioma del poder." },
  { id: "white-ribbon", title: "La cinta blanca", year: 2009, director: "Michael Haneke", bio: "Un pueblo protestante. Los chicos ya aprendieron el rigor." },
  { id: "poetry", title: "Poetry", year: 2010, director: "Lee Chang-dong", bio: "Una abuela estudia versos. El río guarda un crimen." },
  { id: "like-father-like-son", title: "Like Father, Like Son", year: 2013, director: "Hirokazu Kore-eda", bio: "Dos bebés cambiados. ¿La sangre o la crianza?" },
  { id: "nightcrawler", title: "Nightcrawler", year: 2014, director: "Dan Gilroy", bio: "Los noticieros de madrugada. Él llega primero al horror." },
  { id: "get-out", title: "Get Out", year: 2017, director: "Jordan Peele", bio: "Una visita a los padres. La taza de té hunde el piso." },
  { id: "call-me-by-your-name", title: "Call Me by Your Name", year: 2017, director: "Luca Guadagnino", bio: "Un verano en Italia. El durazno, el piano, el nombre." },
  { id: "close", title: "Close", year: 2022, director: "Lukas Dhont", bio: "Dos amigos en el colegio. Un gesto alcanza para romperlos." },
  { id: "monster", title: "Monster", year: 2023, director: "Hirokazu Kore-eda", bio: "Una madre, un maestro, un chico. La verdad da tres vueltas." },
];

const FILM_IDS = new Set(SALA_LIST.map((film) => film.id));
const VOTER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSalaListFilmId(value: string) {
  return FILM_IDS.has(value);
}

export function parseSalaListFilmId(value: unknown) {
  if (typeof value !== "string" || !FILM_IDS.has(value)) {
    throw new SalaListError("Esa peli no está en la lista.");
  }
  return value;
}

export function parseSalaListVoterId(value: unknown) {
  if (typeof value !== "string") return null;
  const id = value.trim().toLowerCase();
  return VOTER_ID.test(id) ? id : null;
}

export function createSalaListVoterId() {
  return crypto.randomUUID();
}

export function parseSalaListCounts(value: unknown) {
  if (!value || typeof value !== "object") return {} as Record<string, number>;
  const source = value as Record<string, unknown>;
  const counts: Record<string, number> = {};
  for (const film of SALA_LIST) {
    const n = source[film.id];
    if (typeof n === "number" && Number.isFinite(n) && n >= 0) {
      counts[film.id] = Math.floor(n);
    }
  }
  return counts;
}

export function parseSalaListVotedIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && FILM_IDS.has(id)))];
}

export function planSalaListToggle(filmId: unknown, votedIds: unknown) {
  const id = parseSalaListFilmId(filmId);
  const voted = new Set(parseSalaListVotedIds(votedIds));
  if (voted.has(id)) {
    voted.delete(id);
    return { filmId: id, voted: false, nextIds: [...voted] };
  }
  voted.add(id);
  return { filmId: id, voted: true, nextIds: [...voted] };
}

export function nextSalaListCount(current: number, voted: boolean) {
  const n = Number.isFinite(current) ? Math.max(0, Math.floor(current)) : 0;
  return voted ? n + 1 : Math.max(0, n - 1);
}

export function salaListCopy(votedCount: number) {
  if (votedCount <= 0) return "Tocá las que querés en la sala. Sin cuenta, sin vueltas.";
  if (votedCount === 1) return "Marcaste 1. La sala anota.";
  return `Marcaste ${votedCount}. La sala anota.`;
}

export const SALA_LIST_THANKS = "Gracias por tus votos. Miremos el mundo a través de las ganadoras ;)";

export type DirectorFilm = {
  id: string;
  title: string;
  year: number;
  score: number;
  hasEssay?: boolean;
};
export type DirectorGroup = { id: string; name: string; films: DirectorFilm[]; weight: number; average: number };
export type DirectorRect = { x: number; y: number; width: number; height: number };

type ArchiveFilm = DirectorFilm & { director: string };

function directorKey(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/\s+/g, " ").trim();
}

export function groupDirectors(films: ArchiveFilm[]): DirectorGroup[] {
  const groups = new Map<string, DirectorGroup>();
  for (const film of films) {
    const name = film.director.trim().replace(/\s+/g, " ");
    if (!name || !Number.isFinite(film.score) || film.score < 0 || film.score > 10) continue;
    const id = directorKey(name);
    const group = groups.get(id) ?? { id, name, films: [], weight: 0, average: 0 };
    // Prefer the accented spelling when the archive contains both forms.
    if (name !== name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")) group.name = name;
    group.films.push({
      id: film.id,
      title: film.title,
      year: film.year,
      score: film.score,
      hasEssay: Boolean(film.hasEssay),
    });
    group.weight += film.score;
    group.average = group.weight / group.films.length;
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, "es"));
}

// Squarify consecutive rows: preserve exact areas while keeping blocks close
// to squares, even when the viewport is very wide or very narrow.
export function layoutDirectors(directors: DirectorGroup[], width: number, height: number): DirectorRect[] {
  if (!directors.length || width <= 0 || height <= 0) return [];
  const weights = directors.map(director => Math.max(director.weight, 0.1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const areas = weights.map(weight => weight / total * width * height);
  const result: DirectorRect[] = [];
  let bounds = { x: 0, y: 0, width, height };
  let cursor = 0;
  function worst(row: number[], side: number) {
    const sum = row.reduce((value, area) => value + area, 0);
    return Math.max(side * side * Math.max(...row) / (sum * sum), sum * sum / (side * side * Math.min(...row)));
  }
  while (cursor < areas.length) {
    const side = Math.min(bounds.width, bounds.height);
    const row = [areas[cursor++]];
    while (cursor < areas.length && worst([...row, areas[cursor]], side) <= worst(row, side)) row.push(areas[cursor++]);
    const sum = row.reduce((value, area) => value + area, 0);
    if (bounds.width >= bounds.height) {
      const thickness = sum / bounds.height;
      let y = bounds.y;
      for (const area of row) {
        const cellHeight = area / thickness;
        result.push({ x: bounds.x, y, width: thickness, height: cellHeight });
        y += cellHeight;
      }
      bounds = { ...bounds, x: bounds.x + thickness, width: Math.max(0, bounds.width - thickness) };
    } else {
      const thickness = sum / bounds.width;
      let x = bounds.x;
      for (const area of row) {
        const cellWidth = area / thickness;
        result.push({ x, y: bounds.y, width: cellWidth, height: thickness });
        x += cellWidth;
      }
      bounds = { ...bounds, y: bounds.y + thickness, height: Math.max(0, bounds.height - thickness) };
    }
  }
  return result;
}

export function isLandingBallotLive(ballot: { status: string; closesAt: number } | null, now = Date.now()) {
  return ballot?.status === "open" && ballot.closesAt > now;
}

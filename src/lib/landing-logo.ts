type RGB = [number, number, number];

export function relativeLuminance(color: RGB) {
  const channels = color.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(first: RGB, second: RGB) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Group by hue so light and shaded parts of the same object count together.
// Favor colors in the subject over colors repeated around the image's edges.
export function landingPhotoAccent(pixels: Uint8ClampedArray, width?: number): string | null {
  const buckets = new Map<number, { total: RGB; count: number; weight: number; edgeWeight: number }>();
  const height = width ? pixels.length / 4 / width : 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const color: RGB = [pixels[index], pixels[index + 1], pixels[index + 2]];
    const high = Math.max(...color);
    const low = Math.min(...color);
    const saturation = high ? (high - low) / high : 0;
    if (pixels[index + 3] < 128 || high < 85 || saturation < 0.2) continue;
    const delta = high - low;
    const hue = (60 * (high === color[0]
      ? (color[1] - color[2]) / delta
      : high === color[1]
        ? (color[2] - color[0]) / delta + 2
        : (color[0] - color[1]) / delta + 4) + 360) % 360;
    const key = Math.floor(hue / 20);
    const bucket = buckets.get(key) ?? { total: [0, 0, 0] as RGB, count: 0, weight: 0, edgeWeight: 0 };
    color.forEach((channel, channelIndex) => { bucket.total[channelIndex] += channel; });
    bucket.count += 1;
    const weight = saturation * (high / 255) ** 2;
    const x = width ? (index / 4 % width) / width : 0.5;
    const y = height ? Math.floor(index / 4 / width!) / height : 0.5;
    const edge = x < 0.2 || x > 0.8 || y < 0.15 || y > 0.85;
    bucket.weight += weight;
    if (edge) bucket.edgeWeight += weight;
    buckets.set(key, bucket);
  }
  const score = (bucket: { weight: number; edgeWeight: number }) => bucket.weight / (1 + bucket.edgeWeight) ** 0.85;
  const dominant = [...buckets.values()].sort((a, b) => score(b) - score(a))[0];
  if (!dominant) return null;
  return `rgb(${dominant.total.map((channel) => Math.round(channel / dominant.count)).join(" ")})`;
}

// Keep the selected hue recognizable: only modest lightness adjustments, with
// no outline and no near-black/near-white replacements on busy backgrounds.
export function landingLogoColors(accent: string | null, backgrounds: RGB[] = [[5, 5, 5]]) {
  const match = accent?.match(/^rgb\((\d{1,3}) (\d{1,3}) (\d{1,3})\)$/);
  const base: RGB = match
    ? [Number(match[1]), Number(match[2]), Number(match[3])].map((v) => Math.min(255, v)) as RGB
    : [220, 195, 148];
  const samples = backgrounds.length ? backgrounds : [[5, 5, 5] as RGB];
  const candidates = [base];
  for (const amount of [0.12, 0.24]) {
    for (const target of [255, 0]) {
      candidates.push(base.map((value) => Math.round(value + (target - value) * amount)) as RGB);
    }
  }
  let chosen = base;
  let bestScore = 0;
  for (const candidate of candidates) {
    const contrasts = samples.map((sample) => contrastRatio(candidate, sample)).sort((a, b) => a - b);
    // Favor the number of readable pixels. Maximizing minimum contrast alone
    // would choose muddy midtones when the background has both sky and shadows.
    const readable = contrasts.filter((contrast) => contrast >= 4.5).length / contrasts.length;
    const score = readable * 100 + contrasts[Math.floor((contrasts.length - 1) * 0.1)];
    if (score > bestScore) {
      chosen = candidate;
      bestScore = score;
    }
    if (readable >= 0.9) break;
  }
  const css = (value: RGB) => `rgb(${value.join(" ")})`;
  return { color: css(chosen) };
}

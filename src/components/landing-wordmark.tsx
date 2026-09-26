"use client";

import { useEffect, useRef, useState } from "react";

import { landingLogoColors, landingPhotoAccent } from "@/lib/landing-logo";

// Art direction for this still: sampled from the yellow MIASMA lettering.
// Tying it to the image version preserves automatic colors for future uploads.
const PHOTO_COLORS: Record<string, string> = {
  "/api/landing-image/landscape?v=aa049cce-ba1e-4efa-b8b6-cc3348e4ad65": "#d0ad4c",
};

export function LandingWordmark({ accent, imageUrl }: { accent: string | null; imageUrl?: string }) {
  const element = useRef<HTMLSpanElement>(null);
  const [palette, setPalette] = useState(() => landingLogoColors(accent));
  const photoColor = imageUrl ? PHOTO_COLORS[imageUrl] : undefined;

  useEffect(() => {
    const wordmark = element.current;
    const photo = document.querySelector<HTMLImageElement>(".landingStill img");
    if (!wordmark || !photo || !imageUrl || photoColor) return;
    let frame = 0;
    let photoAccent: string | null = null;

    const measure = () => {
      if (!photo.complete || !photo.naturalWidth) return;
      const bounds = wordmark.getBoundingClientRect();
      const imageBounds = photo.getBoundingClientRect();
      if (!bounds.width || !bounds.height || !imageBounds.width || !imageBounds.height) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 16;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        if (!photoAccent) {
          canvas.width = 96;
          canvas.height = 54;
          context.drawImage(photo, 0, 0, canvas.width, canvas.height);
          photoAccent = landingPhotoAccent(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width) ?? accent;
          canvas.width = 64;
          canvas.height = 16;
        }
        const scale = Math.max(imageBounds.width / photo.naturalWidth, imageBounds.height / photo.naturalHeight);
        const [positionX, positionY] = getComputedStyle(photo).objectPosition.split(" ").map(parseFloat);
        const width = photo.naturalWidth * scale;
        const height = photo.naturalHeight * scale;
        context.scale(canvas.width / bounds.width, canvas.height / bounds.height);
        context.fillStyle = "#050505";
        context.fillRect(0, 0, bounds.width, bounds.height);
        context.save();
        context.beginPath();
        context.rect(imageBounds.left - bounds.left, imageBounds.top - bounds.top, imageBounds.width, imageBounds.height);
        context.clip();
        context.drawImage(
          photo,
          imageBounds.left - bounds.left + (imageBounds.width - width) * positionX / 100,
          imageBounds.top - bounds.top + (imageBounds.height - height) * positionY / 100,
          width,
          height,
        );
        context.restore();
        // The mobile copy panel darkens the photo behind the header.
        if (window.matchMedia("(max-width: 800px)").matches) {
          context.fillStyle = "rgba(5, 5, 5, 0.42)";
          context.fillRect(0, 0, bounds.width, bounds.height);
        }
        // Include the header's soft backdrop when choosing future photo colors.
        const header = wordmark.closest(".landingChrome");
        const shade = header ? Number(getComputedStyle(header).getPropertyValue("--landing-header-shade")) : 0;
        if (shade > 0) {
          context.fillStyle = `rgba(5, 5, 5, ${shade})`;
          context.fillRect(0, 0, bounds.width, bounds.height);
        }
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const backgrounds: [number, number, number][] = [];
        for (let index = 0; index < pixels.length; index += 4) {
          backgrounds.push([pixels[index], pixels[index + 1], pixels[index + 2]]);
        }
        setPalette(landingLogoColors(photoAccent, backgrounds));
      } catch {
        // Keep the photo-derived fallback if canvas is unavailable.
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(photo);
    observer.observe(wordmark);
    photo.addEventListener("load", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      photo.removeEventListener("load", schedule);
    };
  }, [accent, imageUrl, photoColor]);

  return (
    <span
      ref={element}
      className="landingWordmark"
      style={imageUrl ? {
        color: photoColor ?? palette.color,
      } : undefined}
    >
      Pochoclo <i>Club</i>
    </span>
  );
}

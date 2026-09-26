import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(), set: vi.fn(), upload: vi.fn(), remove: vi.fn(),
}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({
    doc: () => ({ get: mocks.get }),
    runTransaction: (callback: (transaction: unknown) => Promise<unknown>) => callback({ get: mocks.get, set: mocks.set }),
  }),
}));
vi.mock("@/lib/landing-images", () => ({ uploadLandingImage: mocks.upload, deleteLandingImages: mocks.remove }));

import { getLandingVisual, saveLandingImage } from "./landing";

const oldImage = {
  version: "old-image", landscapePath: "landing/old-image-landscape.webp",
  portraitPath: "landing/old-image-portrait.webp", accent: "rgb(190 155 60)", sourceWidth: 1920, sourceHeight: 1080,
};
const newImage = { ...oldImage, version: "new-image", landscapePath: "landing/new-image-landscape.webp", portraitPath: "landing/new-image-portrait.webp" };
const movie = { title: "La película", year: 2025, director: "Su directora" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue({ exists: true, data: () => oldImage });
  mocks.upload.mockResolvedValue(newImage);
});

describe("landing persistence", () => {
  it("continues to show legacy images with no film metadata", async () => {
    expect(await getLandingVisual()).toMatchObject({ version: oldImage.version, movie: null });
  });

  it("edits credits without uploading or deleting the current image", async () => {
    expect(await saveLandingImage("admin", null, movie, oldImage.version)).toMatchObject({ version: oldImage.version, movie });
    expect(mocks.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ ...oldImage, movie, updatedBy: "admin" }));
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("saves the new image with its credits before removing the previous image", async () => {
    const file = new File(["image"], "still.jpg", { type: "image/jpeg" });
    expect(await saveLandingImage("admin", file, movie, oldImage.version)).toMatchObject({ version: newImage.version, movie });
    expect(mocks.remove).toHaveBeenCalledWith([oldImage.landscapePath, oldImage.portraitPath]);
    expect(mocks.set.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
  });

  it("rejects stale edits so credits cannot be applied to somebody else's new image", async () => {
    await expect(saveLandingImage("admin", null, movie, "stale-image")).rejects.toThrow("La portada cambió");
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("cleans up a new upload if saving its metadata fails", async () => {
    mocks.set.mockImplementation(() => { throw new Error("write failed"); });
    await expect(saveLandingImage("admin", new File(["image"], "still.jpg"), movie, oldImage.version)).rejects.toThrow("write failed");
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([newImage.landscapePath, newImage.portraitPath]);
  });

  it("requires a photo when there is no existing cover", async () => {
    mocks.get.mockResolvedValue({ exists: false });
    await expect(saveLandingImage("admin", null, movie, "")).rejects.toThrow("Elegí una foto");
    expect(mocks.set).not.toHaveBeenCalled();
  });
});

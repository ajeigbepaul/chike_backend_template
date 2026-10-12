import cloudinary from "./cloudinary.js";

/**
 * Derive a Cloudinary public id from a stored secure_url.
 *
 * Needed because most models persist only the URL, so assets uploaded before
 * public ids were stored can still be cleaned up.
 *
 *   https://res.cloudinary.com/x/image/upload/v123/chike/abc.jpg
 *     -> chike/abc
 */
export const publicIdFromUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  if (!/res\.cloudinary\.com/.test(url)) return null;

  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;

  // Strip the file extension; the public id has none.
  return match[1].replace(/\.[^/.]+$/, "");
};

/** Prefer an id we stored at upload time, else work it out from the URL. */
export const resolvePublicId = (storedId, url) =>
  storedId || publicIdFromUrl(url);

/**
 * Best-effort removal of Cloudinary assets.
 *
 * The database write is the source of truth, so a failure here is logged and
 * swallowed - an orphaned remote file must never fail the user's request.
 * Accepts public ids, URLs, nulls, or a mix.
 */
export const destroyAssets = async (ids = []) => {
  const publicIds = (Array.isArray(ids) ? ids : [ids])
    .map((id) => (id && id.startsWith("http") ? publicIdFromUrl(id) : id))
    .filter(Boolean);

  if (publicIds.length === 0) return;

  await Promise.all(
    publicIds.map(async (publicId) => {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(
          `Failed to delete Cloudinary asset ${publicId}:`,
          err.message
        );
      }
    })
  );
};

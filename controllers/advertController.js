import Advert from "../models/advert.model.js";
import multer from "multer";
import cloudinary from "../utils/cloudinary.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

// Multer config for advert image
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

export const uploadAdvertImage = upload.single("image");

export const processAdvertImage = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  const result = await cloudinary.uploader.upload(
    `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
    {
      folder: "chike-adverts",
      transformation: [
        { width: 1200, height: 600, crop: "fill" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    }
  );
  req.body.image = result.secure_url;
  req.body.imagePublicId = result.public_id;
  next();
});

// Resolve the Cloudinary public id for an advert. Prefers the stored field, but
// falls back to parsing the secure_url so adverts created before imagePublicId
// existed can still have their remote asset cleaned up.
// e.g. https://res.cloudinary.com/x/image/upload/v123/chike-adverts/abc.jpg
//   -> chike-adverts/abc
const resolvePublicId = (advert) => {
  if (!advert) return null;
  if (advert.imagePublicId) return advert.imagePublicId;
  if (!advert.image) return null;

  const match = advert.image.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  return match[1].replace(/\.[^/.]+$/, "");
};

// Best-effort removal of a Cloudinary asset. The database write is the source of
// truth, so a failure here is logged but never fails the request.
const destroyAdvertImage = async (advert) => {
  const publicId = resolvePublicId(advert);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Failed to delete Cloudinary asset ${publicId}:`, err.message);
  }
};

// Create a new advert
export const createAdvert = async (req, res) => {
  try {
    const { title, subTitle, description, cta, image, imagePublicId } =
      req.body;
    if (!image) {
      return res
        .status(400)
        .json({ success: false, message: "Image is required." });
    }
    if (!subTitle) {
      return res
        .status(400)
        .json({ success: false, message: "SubTitle is required." });
    }
    const advert = await Advert.create({
      title,
      subTitle,
      description,
      cta,
      image,
      imagePublicId,
    });
    res.status(201).json({ success: true, data: advert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all adverts
export const getAdverts = async (req, res) => {
  try {
    const adverts = await Advert.find().sort({ createdAt: -1 });
    res.json({ success: true, data: adverts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get a single advert by ID
export const getAdvertById = async (req, res) => {
  try {
    const advert = await Advert.findById(req.params.id);
    if (!advert)
      return res
        .status(404)
        .json({ success: false, message: "Advert not found" });
    res.json({ success: true, data: advert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update an advert
export const updateAdvert = async (req, res) => {
  try {
    // Only update the fields actually submitted. An edit without a new file
    // leaves the existing image untouched.
    const updates = {};
    ["title", "subTitle", "description", "cta"].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const hasNewImage = Boolean(req.body.image);
    if (hasNewImage) {
      updates.image = req.body.image;
      updates.imagePublicId = req.body.imagePublicId || "";
    }

    const previous = hasNewImage ? await Advert.findById(req.params.id) : null;

    const advert = await Advert.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!advert)
      return res
        .status(404)
        .json({ success: false, message: "Advert not found" });

    // The replaced asset is only orphaned once the new one is safely saved.
    if (previous) await destroyAdvertImage(previous);

    res.json({ success: true, data: advert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete an advert
export const deleteAdvert = async (req, res) => {
  try {
    const advert = await Advert.findByIdAndDelete(req.params.id);
    if (!advert)
      return res
        .status(404)
        .json({ success: false, message: "Advert not found" });

    await destroyAdvertImage(advert);

    res.json({ success: true, message: "Advert deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

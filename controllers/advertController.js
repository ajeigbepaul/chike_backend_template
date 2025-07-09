import Advert from "../models/advert.model.js";
import multer from "multer";
import cloudinary from "../utils/cloudinary.js";
import AppError from "../utils/AppError.js";

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

export const processAdvertImage = async (req, res, next) => {
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
  next();
};

// Create a new advert
export const createAdvert = async (req, res) => {
  try {
    const { title, subTitle, description, cta, image } = req.body;
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
    const { title, subTitle, description, cta, image } = req.body;
    const advert = await Advert.findByIdAndUpdate(
      req.params.id,
      { title, subTitle, description, cta, image },
      { new: true, runValidators: true }
    );
    if (!advert)
      return res
        .status(404)
        .json({ success: false, message: "Advert not found" });
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
    res.json({ success: true, message: "Advert deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

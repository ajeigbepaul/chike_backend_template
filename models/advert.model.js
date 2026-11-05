import mongoose from "mongoose";

const advertSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
    imagePublicId: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      required: true,
    },
    subTitle: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    cta: {
      type: String,
      default: "",
    },
    ctaRoute: {
      type: String,
      enum: ["/category/indoor", "/category/outdoor", "/category/construction"],
      default: "/category/indoor",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Advert", advertSchema);

import mongoose from "mongoose";

const advertSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

export default mongoose.model("Advert", advertSchema);

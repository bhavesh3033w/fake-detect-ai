const cloudinary = require('cloudinary').v2;

// 🔥 Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔥 Upload base64 image (UNSIGNED - no signature error)
const uploadBase64 = async (base64Data) => {
  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      upload_preset: "fakedetect_unsigned", // ⚠️ IMPORTANT
    });

    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

// 🔥 Delete image
const deleteImage = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};

module.exports = {
  cloudinary,
  uploadBase64,
  deleteImage,
};
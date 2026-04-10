const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'fakedetect/uploads',
   
    transformation: [{ quality: 'auto' }],
    resource_type: 'image',
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, GIF, BMP allowed.'), false);
    }
  },
});

// Upload base64 image to Cloudinary
const uploadBase64 = async (base64Data, folder = 'fakedetect/heatmaps') => {
  const result = await cloudinary.uploader.upload(base64Data, {
    folder,
    resource_type: 'image',
  });
  return result;
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = { cloudinary, upload, uploadBase64, deleteImage };

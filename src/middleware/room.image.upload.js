const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cloudinary = require('../configs/cloudinary.config');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'hotel-rooms',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }]
  }
});

const roomImageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (_req, files, cb) => {
    if (files.fieldname === 'room_images') {
      if (files.mimetype === 'image/png' || files.mimetype === 'image/jpg' || files.mimetype === 'image/jpeg') {
        cb(null, true);
      } else {
        cb(new Error('Only .jpg, .png or .jpeg format allowed!'));
      }
    } else {
      cb(new Error('There was an unknown error!'));
    }
  }
});

module.exports = roomImageUpload;

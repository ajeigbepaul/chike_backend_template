import multer from 'multer';
import AppError from './AppError.js';

const storage = multer.memoryStorage();

// Gate on the extension rather than the mimetype: browsers report .csv
// inconsistently (text/csv, application/csv, text/plain, even
// application/octet-stream), so mimetype alone rejects legitimate files.
const fileFilter = (req, file, cb) => {
  const name = (file.originalname || '').toLowerCase();

  if (/\.(csv|xlsx|xls)$/.test(name)) {
    cb(null, true);
  } else {
    cb(new AppError('Please upload only CSV or Excel files', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export default upload;

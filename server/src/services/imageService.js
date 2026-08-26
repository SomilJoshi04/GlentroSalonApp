const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads dir exists (Uses environment variable or defaults to local dir)
const uploadsDir = process.env.UPLOAD_PATH 
  ? path.resolve(process.env.UPLOAD_PATH)
  : path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Process and store an image buffer securely.
 * Validates, compresses to WebP, and generates a safe unique filename.
 * 
 * @param {Buffer} buffer - The image buffer from Multer
 * @param {string} prefix - The resource prefix (e.g., 'user', 'banner')
 * @returns {Promise<string>} The generated safe filename
 */
const processAndStoreImage = async (buffer, prefix = 'image') => {
  if (!buffer) {
    throw new Error('Image buffer is missing');
  }

  // Generate unique safe filename
  const uuid = crypto.randomBytes(4).toString('hex');
  const timestamp = Date.now();
  const filename = `${prefix}-${timestamp}-${uuid}.webp`;
  const filePath = path.join(uploadsDir, filename);

  try {
    // Sharp automatically throws if the buffer is a corrupt/fake image
    await sharp(buffer)
      .webp({ quality: 80 }) // Compress and convert
      .toFile(filePath);
    
    return filename;
  } catch (error) {
    throw new Error(`Failed to process image: ${error.message}`);
  }
};

/**
 * Safely delete an image from the uploads directory.
 * Prevents path traversal vulnerabilities.
 * 
 * @param {string} filename - The filename to delete (e.g. 'user-123.webp')
 * @returns {boolean} True if deleted, false if not found
 */
const deleteImageSafe = (filename) => {
  if (!filename) return false;

  try {
    // Resolve absolute path
    const targetPath = path.resolve(uploadsDir, filename);

    // Security check: Ensure the target path is strictly inside the uploads directory
    // This prevents directory traversal attacks like '../../etc/passwd'
    if (!targetPath.startsWith(path.resolve(uploadsDir))) {
      console.warn(`[Security Warning] Attempted path traversal deletion: ${filename}`);
      return false;
    }

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Failed to delete image ${filename}:`, error);
    return false; // Don't crash the server on cleanup failure
  }
};

module.exports = {
  processAndStoreImage,
  deleteImageSafe,
  uploadsDir,
};

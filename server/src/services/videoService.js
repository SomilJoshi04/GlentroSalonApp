const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads/promotional-videos directory exists
const baseUploadsDir = path.resolve(__dirname, '../../uploads');
const videoUploadsDir = path.join(baseUploadsDir, 'promotional-videos');

if (!fs.existsSync(videoUploadsDir)) {
  fs.mkdirSync(videoUploadsDir, { recursive: true });
}

/**
 * Store a video buffer securely on disk.
 * Generates a safe unique filename and resolves relative paths inside the uploads dir.
 * 
 * @param {Buffer} buffer - The video file buffer from Multer
 * @param {string} mimeType - The file's MIME type (e.g., 'video/mp4')
 * @param {string} prefix - The resource prefix
 * @returns {Promise<string>} The generated relative path from the uploads root
 */
const processAndStoreVideo = async (buffer, mimeType = 'video/mp4', prefix = 'banner-video') => {
  if (!buffer) {
    throw new Error('Video buffer is missing');
  }

  // Detect file extension based on mimeType
  let extension = 'mp4';
  if (mimeType.includes('webm')) {
    extension = 'webm';
  } else if (mimeType.includes('quicktime') || mimeType.includes('mov')) {
    extension = 'mov';
  }

  // Generate unique safe filename
  const uuid = crypto.randomBytes(4).toString('hex');
  const timestamp = Date.now();
  const filename = `${prefix}-${timestamp}-${uuid}.${extension}`;
  const filePath = path.join(videoUploadsDir, filename);

  // Write video file to disk synchronously
  fs.writeFileSync(filePath, buffer);

  // Return the relative path stored in the DB (e.g. 'promotional-videos/banner-video-178...mp4')
  return `promotional-videos/${filename}`;
};

/**
 * Safely delete a video file from the uploads directory.
 * Prevents path traversal vulnerabilities.
 * 
 * @param {string} relativePath - The relative path of the file (e.g. 'promotional-videos/banner-video-xxx.mp4')
 * @returns {boolean} True if deleted, false if not found
 */
const deleteVideoSafe = (relativePath) => {
  if (!relativePath) return false;

  try {
    // Resolve absolute path
    const targetPath = path.resolve(baseUploadsDir, relativePath);

    // Security check: Ensure the target path is strictly inside the uploads directory
    if (!targetPath.startsWith(path.resolve(baseUploadsDir))) {
      console.warn(`[Security Warning] Attempted path traversal deletion: ${relativePath}`);
      return false;
    }

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Failed to delete video ${relativePath}:`, error);
    return false;
  }
};

module.exports = {
  processAndStoreVideo,
  deleteVideoSafe,
  videoUploadsDir,
};

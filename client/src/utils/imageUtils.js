export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    return imagePath;
  }
  // Use dedicated upload path, fallback to empty string
  const uploadUrl = import.meta.env.VITE_UPLOAD_PATH || '';
  
  // Handle paths that already start with a slash
  const cleanImagePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  
  return `${uploadUrl}/uploads/${cleanImagePath}`;
};

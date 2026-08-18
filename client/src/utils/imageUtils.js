export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    return imagePath;
  }
  const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
  return `${baseUrl}/uploads/${imagePath}`;
};

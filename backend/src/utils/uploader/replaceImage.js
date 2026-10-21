import deleteImage from "./deleteImage.js";
import uploadImage from "./upload.js";

// Upload the new image first and only then remove the old one, so a failed upload keeps the old picture.
const replaceImage = async (oldPublicId, newBuffer) => {
  try {
    const newUpload = await uploadImage(newBuffer);
    // a failed cleanup must not fail the request (the new image is already saved), but should not be silent
    if (oldPublicId) await deleteImage(oldPublicId).catch((e) => console.warn('[images] could not remove', oldPublicId, '-', e.message));
    return newUpload;
  } catch (err) {
    throw new Error("Image replacement failed: " + err.message);
  }
};

export default replaceImage;

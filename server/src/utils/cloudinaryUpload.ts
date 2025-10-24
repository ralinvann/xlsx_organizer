import cloudinary from "../config/cloudinary";

/**
 * Upload a file buffer directly to Cloudinary
 */
export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  folder = "users"
): Promise<{ url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

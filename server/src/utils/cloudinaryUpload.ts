import cloudinary from "../config/cloudinary";

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder = "uploads"
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve({ url: result.secure_url });
      }
    );
    stream.end(buffer);
  });
}

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export { cloudinary };

// ─── توليد signature للرفع المباشر من المتصفح ────────────────────────────
// المتصفح يرفع مباشرةً لـ Cloudinary بدون ما يعدي على السيرفر
// نستخدم الـ SDK مباشرةً بدل ما نحسب الـ signature يدوياً
export function generateUploadSignature(folder: string, resourceType: "video" | "image" | "raw") {
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };

  // api_sign_request بتتولى الـ algorithm والترتيب والـ hashing تلقائياً
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    api_key: process.env.CLOUDINARY_API_KEY!,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    folder,
    resource_type: resourceType,
  };
}

// ─── حذف ملف من Cloudinary (من السيرفر فقط) ─────────────────────────────
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "video" | "image" | "raw" = "image"
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch {
    console.warn(`[Cloudinary] Failed to delete ${resourceType}: ${publicId}`);
  }
}

// ─── استخراج public_id من رابط Cloudinary ────────────────────────────────
export function extractPublicId(cloudinaryUrl: string): string | null {
  try {
    const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

// للتوافق مع payments.ts اللي بيرفع صور صغيرة (إيصالات)
import type { UploadApiResponse } from "cloudinary";
export async function uploadToCloudinary(
  buffer: Buffer,
  options: { folder: string; resource_type?: "image" | "raw" | "auto" }
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: options.folder, resource_type: options.resource_type ?? "auto" },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Upload failed"));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}
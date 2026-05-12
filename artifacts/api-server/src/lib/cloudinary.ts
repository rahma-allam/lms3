import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export { cloudinary };

// ─── توليد signature للرفع المباشر من المتصفح ────────────────────────────
// المتصفح يرفع مباشرةً لـ Cloudinary بدون ما يعدي على السيرفر
export function generateUploadSignature(folder: string, resourceType: "video" | "image" | "raw") {
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = {
    folder,
    timestamp,
  };

  // رتب الـ params أبجدياً وادمجهم
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const signature = crypto
    .createHash("sha256")
    .update(toSign + process.env.CLOUDINARY_API_SECRET!)
    .digest("hex");

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
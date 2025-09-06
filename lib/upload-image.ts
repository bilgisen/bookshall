// lib/upload-image.ts
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_UPLOAD_IMAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_UPLOAD_IMAGE_SECRET_ACCESS_KEY!,
  },
});

export const uploadImageAssets = async (buffer: Buffer, key: string) => {
  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_UPLOAD_IMAGE_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: "image/*",
        // ACL: "public-read", // R2'de ACL desteklenmeyebilir, bucket public olmalı
      })
    );

    // Public URL'i düzelt
    const publicUrl = `https://${process.env.R2_PUBLIC_BUCKET_DOMAIN}/${key}`;
    return publicUrl;
  } catch (error) {
    console.error('R2 Upload Error:', error);
    throw new Error('Failed to upload to R2');
  }
};
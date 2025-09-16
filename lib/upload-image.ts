// lib/upload-image.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
};

const client = new S3Client({
  region: "auto",
  endpoint: `https://${getEnvVar("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: getEnvVar("R2_UPLOAD_IMAGE_ACCESS_KEY_ID"),
    secretAccessKey: getEnvVar("R2_UPLOAD_IMAGE_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: true,
});

export async function uploadImageAssets(
  body: Uint8Array | Buffer,
  key: string,
  contentType: string = "image/*"
): Promise<string> {
  // Use the body as is since it's already Uint8Array or Buffer
  const awsBody = body;

  const bucketName = getEnvVar("R2_UPLOAD_IMAGE_BUCKET_NAME");
  const r2PublicDomain = `https://pub-3cfc29e59e5243f4917194e2466f5fa0.r2.dev`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: awsBody,
      ContentType: contentType,
    });

    await client.send(command);

    return `${r2PublicDomain}/${key}`;
  } catch (error) {
    console.error("[R2 Upload Error]", error);
    throw error;
  }
}

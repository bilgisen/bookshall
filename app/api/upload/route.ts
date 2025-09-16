import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadImageAssets } from "@/lib/upload-image";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin":
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const generateFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = originalName.split(".").pop();
  return `uploads/${timestamp}-${randomString}.${fileExtension}`;
};

export async function POST(request: Request) {
  try {
    // ✅ Session al
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ✅ FormData’dan file al
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new NextResponse(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return new NextResponse(
        JSON.stringify({
          error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse(
        JSON.stringify({ error: "File size exceeds the maximum limit of 5MB" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ✅ File -> Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    const key = `editor-uploads/${session.user.id}/${generateFileName(file.name)}`;

    // ✅ Upload
    const url = await uploadImageAssets(buffer, key, file.type);

    return new NextResponse(
      JSON.stringify({
        success: 1,
        file: {
          url,
          name: file.name,
          size: file.size,
          type: file.type,
          src: url,
          title: file.name,
          alt: file.name,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[UPLOAD_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

// ✅ OPTIONS handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

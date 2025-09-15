// /app/api/auth/[...all]/route.ts
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
import { auth } from "@/lib/auth"; // Import the *clean* auth instance
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth); // ← Apply nextCookies() ONLY HERE
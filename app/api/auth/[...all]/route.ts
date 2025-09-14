// /app/api/auth/[...all]/route.ts

import { auth } from "@/lib/auth"; // Import the *clean* auth instance
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth); // ← Apply nextCookies() ONLY HERE
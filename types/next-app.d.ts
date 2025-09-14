import 'next';

declare module 'next/server' {
  interface NextRequest {
    params: Record<string, string> | Promise<Record<string, string>>;
  }
}

declare module 'next' {
  interface NextApiRequest {
    params: Record<string, string> | Promise<Record<string, string>>;
  }
}

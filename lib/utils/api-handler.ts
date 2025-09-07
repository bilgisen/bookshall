import { z } from 'zod';
import { NextResponse } from 'next/server';

type HandlerContext<TParams, TBody> = {
  params: TParams extends z.ZodTypeAny ? z.infer<TParams> : undefined;
  body: TBody extends z.ZodTypeAny ? z.infer<TBody> : undefined;
  request: Request;
};

type HandlerOptions<TParams extends z.ZodTypeAny | undefined, TBody extends z.ZodTypeAny | undefined> = {
  paramsSchema?: TParams;
  bodySchema?: TBody;
  handler: (context: HandlerContext<TParams, TBody>) => Promise<unknown> | unknown;
};

export function createApiHandler<
  TParams extends z.ZodTypeAny | undefined = undefined,
  TBody extends z.ZodTypeAny | undefined = undefined
>({
  paramsSchema,
  bodySchema,
  handler,
}: HandlerOptions<TParams, TBody>) {
  const wrappedHandler = async (request: Request, { params: rawParams }: { params: unknown }) => {
    try {
      // Parse and validate params if schema is provided
      const params = paramsSchema ? await paramsSchema.parseAsync(rawParams) : undefined;
      
      // Parse and validate body if schema is provided
      let body: TBody extends z.ZodTypeAny ? z.infer<TBody> : undefined;
      if (bodySchema) {
        try {
          const rawBody = await request.json().catch(() => ({}));
          const parsedBody = await bodySchema.parseAsync(rawBody);
          body = parsedBody as TBody extends z.ZodTypeAny ? z.infer<TBody> : undefined;
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { 
                success: false,
                error: 'Invalid request body',
                issues: error.issues,
              },
              { status: 400 }
            );
          }
          throw error;
        }
      } else {
        body = undefined as TBody extends z.ZodTypeAny ? z.infer<TBody> : undefined;
      }

      // Create the context object with proper typing
      const context: HandlerContext<TParams, TBody> = {
        params: params as TParams extends z.ZodTypeAny ? z.infer<TParams> : undefined,
        body,
        request,
      };

      // Call the handler with the context
      const result = await handler(context);

      // If the handler returns a Response, return it directly
      if (result instanceof Response) {
        return result;
      }

      // Otherwise, wrap the result in a success response
      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Validation failed',
            issues: error.issues,
          },
          { status: 400 }
        );
      }
      
      // Handle other errors
      const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      
      return NextResponse.json(
        { 
          success: false,
          error: message,
        },
        { status }
      );
    }
  };

  // Return handler with HTTP methods attached
  return {
    GET: wrappedHandler as unknown as (req: Request, ctx: { params: unknown }) => Promise<Response>,
    POST: wrappedHandler as unknown as (req: Request, ctx: { params: unknown }) => Promise<Response>,
    PUT: wrappedHandler as unknown as (req: Request, ctx: { params: unknown }) => Promise<Response>,
    PATCH: wrappedHandler as unknown as (req: Request, ctx: { params: unknown }) => Promise<Response>,
    DELETE: wrappedHandler as unknown as (req: Request, ctx: { params: unknown }) => Promise<Response>,
  };
}

// Helper function to standardize API responses
export const apiResponse = <T = unknown>(
  data: T,
  status = 200,
  headers: Record<string, string> = {}
) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};
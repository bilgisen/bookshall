import { NextResponse } from 'next/server';

export function apiResponse<T = any>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function successResponse<T = any>(data: T, status: number = 200) {
  return apiResponse({ success: true, data }, status);
}

export function errorResponse(message: string, status: number = 400, errors?: any) {
  return apiResponse({ 
    success: false, 
    error: message,
    ...(errors && { errors }) 
  }, status);
}

export function notFoundResponse(message: string = 'Resource not found') {
  return errorResponse(message, 404);
}

export function unauthorizedResponse(message: string = 'Unauthorized') {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message: string = 'Forbidden') {
  return errorResponse(message, 403);
}

export function serverErrorResponse(message: string = 'Internal server error') {
  return errorResponse(message, 500);
}

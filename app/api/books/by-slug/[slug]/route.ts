import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { books } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { CreditService } from "@/lib/services/credit";

// -----------------
// GET /api/books/by-slug/[slug]
// Get a book by slug
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Await the params promise
  const { slug } = await params;
  console.log('GET /api/books/by-slug/[slug] called');
  console.log('Request URL:', request.url);
  
  try {
    console.log('Looking for book with slug:', slug);
    
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      console.log('Unauthorized: No user in session');
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    console.log('User ID from session:', response.user.id);
    
    const [book] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.slug, slug),
          eq(books.userId, response.user.id)
        )
      )
      .limit(1);

    console.log('Database query result:', book ? 'Book found' : 'Book not found');
    
    if (!book) {
      return NextResponse.json(
        { error: "Book not found" }, 
        { status: 404 }
      );
    }
    
    console.log('Returning book data');

    return NextResponse.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// -----------------
// PUT /api/books/by-slug/[slug]
// Update a book by slug
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Await the params promise
  const { slug } = await params;
  console.log('PUT /api/books/by-slug/[slug] called');
  try {
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, coverImage, isPublished } = body;

    // Get the book to update
    const [existingBook] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.slug, slug),
          eq(books.userId, response.user.id)
        )
      )
      .limit(1);

    if (!existingBook) {
      return NextResponse.json(
        { error: "Book not found" }, 
        { status: 404 }
      );
    }

    // Update the book
    const [updatedBook] = await db
      .update(books)
      .set({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(coverImage !== undefined && { coverImage }),
        ...(isPublished !== undefined && { isPublished }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(books.id, existingBook.id),
          eq(books.userId, response.user.id)
        )
      )
      .returning();

    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error("Error updating book:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// -----------------
// DELETE /api/books/by-slug/[slug]
// Delete a book by slug
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Await the params promise
  const { slug } = await params;
  console.log('DELETE /api/books/by-slug/[slug] called');
  try {
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const userId = response.user.id;

    // Get the book to delete
    const [book] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.slug, slug),
          eq(books.userId, userId)
        )
      )
      .limit(1);

    if (!book) {
      return NextResponse.json(
        { error: "Book not found" }, 
        { status: 404 }
      );
    }

    // Delete the book
    await db
      .delete(books)
      .where(
        and(
          eq(books.id, book.id),
          eq(books.userId, userId)
        )
      );

    // Refund the book creation cost (300 credits)
    try {
      await CreditService.earnCredits(
        userId,
        300,
        'REFUND_BOOK_DELETION',
        { bookId: book.id, slug }
      );
    } catch (refundErr) {
      console.error('Refund on delete by slug failed:', refundErr);
      // Do not fail the delete due to refund issues
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting book:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

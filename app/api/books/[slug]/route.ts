// app/api/books/[slug]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { books } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type Params = {
  params: { slug: string };
};

// -----------------
// GET /api/books/[slug]
// -----------------
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
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

    const [book] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.slug, params.slug),
          eq(books.userId, response.user.id)
        )
      )
      .limit(1);

    if (!book) {
      return NextResponse.json(
        { error: "Book not found" }, 
        { status: 404 }
      );
    }

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
// PUT /api/books/[slug]
// -----------------
export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
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
    const userId = response.user.id;

    // Check if book exists and belongs to user
    const [existingBook] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.slug, params.slug),
          eq(books.userId, userId)
        )
      )
      .limit(1);

    if (!existingBook) {
      return NextResponse.json(
        { error: "Book not found" }, 
        { status: 404 }
      );
    }

    // Check if new slug is already taken
    if (body.slug && body.slug !== params.slug) {
      const [existingSlug] = await db
        .select()
        .from(books)
        .where(eq(books.slug, body.slug))
        .limit(1);

      if (existingSlug) {
        return NextResponse.json(
          { error: "Slug already in use" },
          { status: 400 }
        );
      }
    }

    // Update book
    const [updatedBook] = await db
      .update(books)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(books.slug, params.slug),
          eq(books.userId, userId)
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
// DELETE /api/books/[slug]
// -----------------
export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
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

    // Check if book exists and belongs to user
    const [existingBook] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.slug, params.slug),
          eq(books.userId, userId)
        )
      )
      .limit(1);

    if (!existingBook) {
      return NextResponse.json(
        { error: "Book not found" }, 
        { status: 404 }
      );
    }

    // Delete book
    await db
      .delete(books)
      .where(
        and(
          eq(books.slug, params.slug),
          eq(books.userId, userId)
        )
      );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting book:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

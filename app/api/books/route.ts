import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { books } from "@/db/schema";
import slugify from "slugify";
import { eq } from "drizzle-orm";

// GET /api/books - Get all books for the authenticated user
export async function GET(req: Request) {
  try {
    const response = await auth.api.getSession({
      headers: req.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const userBooks = await db
      .select()
      .from(books)
      .where(eq(books.userId, response.user.id));

    return NextResponse.json(userBooks);
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}

// POST /api/books - Create a new book
export async function POST(req: Request) {
  try {
    const response = await auth.api.getSession({
      headers: req.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }
    const body = await req.json();
    const userId = response.user.id;

    // Generate a clean slug from title if slug is not provided
    const title = body.title || 'untitled';
    let slug = body.slug ? 
      slugify(body.slug, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }) : 
      slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });

    // Ensure slug is not empty
    if (!slug) {
      slug = 'untitled';
    }

    // Add numeric suffix if slug already exists in DB
    let uniqueSlug = slug;
    let counter = 1;
    while (true) {
      const [existingBook] = await db.select()
        .from(books)
        .where(eq(books.slug, uniqueSlug))
        .limit(1);
      
      if (!existingBook) break;
      uniqueSlug = `${slug}-${++counter}`;
    }

    const inserted = await db.insert(books).values({
      ...body,
      slug: uniqueSlug,
      userId: userId, // Ensure the book is associated with the authenticated user
    }).returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error("Error creating book:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

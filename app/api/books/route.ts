import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { books } from "@/db/schema";
import slugify from "slugify";
import { eq } from "drizzle-orm";

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
    let slug = slugify(body.slug || body.title, { lower: true, strict: true });
    const userId = response.user.id;

  // Add -2, -3 suffix if slug already exists in DB
  let uniqueSlug = slug;
  let counter = 1;
  while (true) {
    const [existingBook] = await db.select()
      .from(books)
      .where(eq(books.slug, uniqueSlug))
      .limit(1);
    
    if (!existingBook) break;
    counter++;
    uniqueSlug = `${slug}-${counter}`;
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

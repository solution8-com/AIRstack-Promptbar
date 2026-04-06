import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePromptSlug } from "@/lib/slug";

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
});
const DEFAULT_TAG_COLOR = "#6366f1";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "You must be logged in" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", message: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const name = parsed.data.name.trim();
    const slug = await generatePromptSlug(name);

    const tag = await db.tag.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        color: DEFAULT_TAG_COLOR,
      },
    });

    revalidateTag("tags");

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Create tag error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Something went wrong" },
      { status: 500 }
    );
  }
}

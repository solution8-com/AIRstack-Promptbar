import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminUsernamesFromEnv } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "You must be logged in" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const adminOnly = searchParams.get("adminOnly") === "true";

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    // Build where clause
    const whereClause: any = {
      OR: [
        { username: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    };

    // Filter to admin users only if requested
    if (adminOnly) {
      const adminUsernames = getAdminUsernamesFromEnv();
      whereClause.AND = {
        OR: [
          { username: { in: adminUsernames } },
          { role: "ADMIN" },
        ],
      };
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
      },
      take: 10,
      orderBy: { username: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Something went wrong" },
      { status: 500 }
    );
  }
}

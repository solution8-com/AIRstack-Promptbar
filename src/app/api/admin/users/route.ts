import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Zod schema for query parameter validation
const requestQuerySchema = z.object({
  page: z.string().optional().transform((val) => {
    const num = parseInt(val || "1", 10);
    return !Number.isNaN(num) && num >= 1 ? num : 1;
  }),
  limit: z.union([
    z.literal("all"),
    z.string().transform((val) => {
      const num = parseInt(val, 10);
      return !Number.isNaN(num) && num >= 1 && num <= 100 ? num : 50;
    }),
  ]).optional().transform((val) => val || 50),
  search: z.string().optional().default(""),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  filter: z.string().optional().default("all"),
});

const DEFAULT_LIMIT = 50;
const MAX_LIMIT_ALL = 1000; // Hard cap for "all" to prevent unbounded queries

// GET - List all users for admin with pagination and search
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Validate query parameters with Zod
    const queryParams = requestQuerySchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      filter: searchParams.get("filter"),
    });

    if (!queryParams.success) {
      return NextResponse.json(
        { error: "validation_error", message: "Invalid query parameters", details: queryParams.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, search, sortBy, sortOrder, filter } = queryParams.data;
    const fetchAll = limit === "all";
    const validLimit = typeof limit === "number" ? limit : DEFAULT_LIMIT;

    // Validate pagination
    const validPage = fetchAll ? 1 : page;
    const skip = fetchAll ? 0 : (validPage - 1) * validLimit;

    // Build filter conditions
    type WhereCondition = {
      OR?: Array<{ email?: { contains: string; mode: "insensitive" }; username?: { contains: string; mode: "insensitive" }; name?: { contains: string; mode: "insensitive" } }>;
      role?: "ADMIN" | "USER";
      verified?: boolean;
      flagged?: boolean;
    };

    const filterConditions: WhereCondition = {};
    
    switch (filter) {
      case "admin":
        filterConditions.role = "ADMIN";
        break;
      case "user":
        filterConditions.role = "USER";
        break;
      case "verified":
        filterConditions.verified = true;
        break;
      case "unverified":
        filterConditions.verified = false;
        break;
      case "flagged":
        filterConditions.flagged = true;
        break;
      default:
        // "all" - no filter
        break;
    }

    // Build where clause combining search and filters
    const where: WhereCondition = {
      ...filterConditions,
      ...(search && {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { username: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    // Build orderBy
    const validSortFields = ["createdAt", "email", "username", "name"];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const orderByDirection = sortOrder === "asc" ? "asc" : "desc";

    // Fetch users and total count
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip: fetchAll ? undefined : skip,
        take: fetchAll ? MAX_LIMIT_ALL : validLimit, // Apply hard cap for "all"
        orderBy: { [orderByField]: orderByDirection },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          role: true,
          verified: true,
          flagged: true,
          flaggedAt: true,
          flaggedReason: true,
          dailyGenerationLimit: true,
          generationCreditsRemaining: true,
          createdAt: true,
          _count: {
            select: {
              prompts: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page: validPage,
        limit: fetchAll ? total : validLimit,
        total,
        totalPages: fetchAll ? 1 : Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error("Admin list users error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const page = parseInt(searchParams.get("page") || "1");
    const DEFAULT_LIMIT = 15;
    const MAX_LIMIT_ALL = 1000; // Hard cap for "all" to prevent unbounded queries
    const limitParam = searchParams.get("limit") || DEFAULT_LIMIT.toString();
    const fetchAll = limitParam === "all";
    const parsedLimit = parseInt(limitParam, 10);
    const normalizedLimit = Number.isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit;
    const validLimit = Math.min(Math.max(1, normalizedLimit), 100);
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const filter = searchParams.get("filter") || "all";

    // Validate pagination
    const validPage = fetchAll ? 1 : Math.max(1, page);
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

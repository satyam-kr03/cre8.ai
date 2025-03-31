import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import GalleryItem from "@/models/GalleryItem";

// GET handler to fetch user's gallery items
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  console.log("GET /api/gallery - User ID:", userId);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    console.log("Fetching gallery items for user:", userId);

    const url = new URL(request.url);
    const typeFilter = url.searchParams.get("type");
    const limit = Number(url.searchParams.get("limit")) || 20;
    const page = Number(url.searchParams.get("page")) || 1;
    const skip = (page - 1) * limit;

    const query: any = { userId };
    if (typeFilter) {
      query.type = typeFilter;
    }

    const total = await GalleryItem.countDocuments(query);
    const items = await GalleryItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log("Found items:", items.length);
    return NextResponse.json({
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error retrieving gallery items:", error);
    return NextResponse.json(
      { error: "Failed to retrieve gallery items", details: String(error) },
      { status: 500 }
    );
  }
}

// POST handler to save a new gallery item
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  console.log("POST /api/gallery - User ID:", userId);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Connect to MongoDB first
    try {
      await dbConnect();
      console.log("MongoDB connected successfully");
    } catch (dbError) {
      console.error("MongoDB connection error:", dbError);
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: String(dbError),
        },
        { status: 500 }
      );
    }

    // Parse request body with proper error handling
    let body;
    try {
      body = await request.json();
      console.log("Received data to save with keys:", Object.keys(body));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        {
          error: "Failed to parse request body",
          details: String(parseError),
        },
        { status: 400 }
      );
    }

    const {
      type,
      prompt,
      contentData,
      contentType,
      negativePrompt,
      settings = {},
    } = body;

    // Validate required fields
    if (!type || !prompt || !contentData || !contentType) {
      const missingFields = [];
      if (!type) missingFields.push("type");
      if (!prompt) missingFields.push("prompt");
      if (!contentData) missingFields.push("contentData");
      if (!contentType) missingFields.push("contentType");

      console.error("Missing required fields:", missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Create a new gallery item
    try {
      const galleryItem = new GalleryItem({
        userId,
        type,
        prompt,
        contentData,
        contentType,
        negativePrompt,
        settings: new Map(Object.entries(settings)),
      });

      // Save to database
      const savedItem = await galleryItem.save();
      console.log(`Saved new ${type} to gallery with ID: ${savedItem._id}`);

      // Return success with the saved item ID
      return NextResponse.json({
        success: true,
        message: `${type} successfully added to gallery`,
        itemId: savedItem._id,
      });
    } catch (saveError) {
      console.error("Error saving gallery item:", saveError);
      return NextResponse.json(
        {
          error: "Failed to save gallery item",
          details: String(saveError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in gallery POST endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

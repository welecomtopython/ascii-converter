import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET() {
  const uploadDir = path.join(process.cwd(), "public", "temp-ascii-images")
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://192.168.1.2:3000"

  try {
    // Check if the directory exists
    try {
      await fs.access(uploadDir)
    } catch (error) {
      // Directory does not exist, return empty array
      return NextResponse.json({ images: [] }, { status: 200 })
    }

    const files = await fs.readdir(uploadDir)
    const imageLinks = files
      .filter((file) => file.endsWith(".png")) // Only include PNG files
      .map((file) => `${baseUrl}/temp-ascii-images/${file}`) // Construct full public URL

    return NextResponse.json({ images: imageLinks }, { status: 200 })
  } catch (error) {
    console.error("Error listing images:", error)
    return NextResponse.json({ error: "Failed to list images." }, { status: 500 })
  }
}

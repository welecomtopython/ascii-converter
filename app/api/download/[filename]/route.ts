import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  const { filename } = params
  const filePath = path.join(process.cwd(), "public", "temp-ascii-images", filename)

  try {
    // Check if the file exists
    await fs.access(filePath)

    // Read the file content
    const fileBuffer = await fs.readFile(filePath)

    // Determine content type (assuming PNG for this specific use case)
    const contentType = "image/png"

    // Create a response with the file buffer and appropriate headers
    const response = new NextResponse(fileBuffer as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`, // Forces download
      },
    })

    // --- Delete the file after sending the response ---
    // We can delete it immediately after reading and preparing the response.
    // The response stream will handle sending the data to the client.
    try {
      await fs.unlink(filePath)
      console.log(`Successfully deleted image after download: ${filePath}`)
    } catch (deleteError) {
      console.error(`Error deleting file ${filePath} after download:`, deleteError)
      // Log the error but don't prevent the download from happening
    }
    // --- End delete file ---

    return response
  } catch (error) {
    console.error(`Error serving file ${filename}:`, error)
    // If the file doesn't exist or there's another access error, return 404
    return NextResponse.json({ error: "File not found or inaccessible." }, { status: 404 })
  }
}

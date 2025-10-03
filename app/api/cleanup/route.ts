import { cleanupOldAsciiImages } from "@/actions/cleanup-images"
import { NextResponse } from "next/server"

export async function GET() {
  console.log("Cleanup API route triggered.")
  const result = await cleanupOldAsciiImages()
  if (result.success) {
    return NextResponse.json({ message: result.message, deletedCount: result.deletedCount }, { status: 200 })
  } else {
    return NextResponse.json({ message: result.message }, { status: 500 })
  }
}


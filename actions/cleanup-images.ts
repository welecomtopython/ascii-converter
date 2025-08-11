"use server"

import { promises as fs } from "fs"
import path from "path"

interface CleanupResult {
  success: boolean
  message: string
  deletedCount: number
}

export async function cleanupOldAsciiImages(): Promise<CleanupResult> {
  const uploadDir = path.join(process.cwd(), "public", "temp-ascii-images")
  const fiveHoursAgo = Date.now() - 5 * 60 * 60 * 1000 // 5 hours in milliseconds
  let deletedCount = 0

  try {
    // Check if the directory exists
    try {
      await fs.access(uploadDir)
    } catch (error) {
      console.log(`Cleanup: Directory ${uploadDir} does not exist. No images to clean up.`)
      return { success: true, message: "لا توجد صور لتنظيفها.", deletedCount: 0 } // Arabic: No images to clean up.
    }

    const files = await fs.readdir(uploadDir)

    for (const file of files) {
      const filePath = path.join(uploadDir, file)
      try {
        const stats = await fs.stat(filePath)
        // We're using the timestamp from the filename for deletion logic
        // Assuming filename format: [timestamp_in_ms]_[random_string].png
        const filenameTimestamp = Number.parseInt(file.split("_")[0], 10)

        if (isNaN(filenameTimestamp)) {
          console.warn(`Cleanup: Skipping file ${file} due to invalid timestamp in filename.`)
          continue // Skip files that don't match our naming convention
        }

        if (filenameTimestamp < fiveHoursAgo) {
          await fs.unlink(filePath)
          console.log(`Cleanup: Deleted old image: ${filePath}`)
          deletedCount++
        }
      } catch (err) {
        console.error(`Cleanup: Error processing file ${filePath}:`, err)
      }
    }

    return { success: true, message: `تم تنظيف ${deletedCount} صورة قديمة بنجاح.`, deletedCount } // Arabic: Successfully cleaned up X old images.
  } catch (err) {
    console.error("Cleanup: Unexpected error during image cleanup:", err)
    return { success: false, message: "حدث خطأ غير متوقع أثناء تنظيف الصور.", deletedCount: 0 } // Arabic: An unexpected error occurred during image cleanup.
  }
}

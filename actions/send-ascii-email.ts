"use server"

import nodemailer from "nodemailer"
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto" // For generating random string

interface SendEmailResult {
  success: boolean
  message: string
}

const transporter = nodemailer.createTransport({
  service: "Gmail", // Use your preferred SMTP service
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or App Password
  },
})

export async function sendAsciiArtEmail(
  email: string,
  username: string,
  asciiArtText: string,
  asciiArtPngDataURL: string,
): Promise<SendEmailResult> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("EMAIL_USER or EMAIL_PASS environment variables are not set.")
    return { success: false, message: "خطأ في إعداد الخادم: بيانات اعتماد البريد الإلكتروني مفقودة." } // Arabic: Server setup error: Email credentials missing.
  }

  try {
    const base64Data = asciiArtPngDataURL.split(",")[1]
    if (!base64Data) {
      console.error("Base64 data is empty after splitting. This means the image data URL was invalid or empty.")
      return { success: false, message: "خطأ: بيانات الصورة فارغة أو غير صالحة." } // Arabic: Error: Image data is empty or invalid.
    }

    const pngBuffer = Buffer.from(base64Data, "base64")
    if (pngBuffer.length === 0) {
      console.error("PNG Buffer is empty. This means the base64 data could not be converted to a valid image buffer.")
      return { success: false, message: "خطأ: لم يتم إنشاء مخزن مؤقت للصورة." } // Arabic: Error: Image buffer not created.
    }

    // --- Save image to public folder ---
    const uploadDir = path.join(process.cwd(), "public", "temp-ascii-images")
    await fs.mkdir(uploadDir, { recursive: true }) // Ensure directory exists

    const timestamp = Date.now()
    const randomString = crypto.randomBytes(4).toString("hex") // 8 characters
    const filename = `${timestamp}_${randomString}.png`
    const filePath = path.join(uploadDir, filename)
    // The URL will now point to our new API route
    const downloadApiUrl = `/api/download/${filename}`

    await fs.writeFile(filePath, pngBuffer)
    console.log(`Image saved to: ${filePath}`)
    // --- End save image ---

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `فن ASCII الخاص بك من ${username}`, // Arabic: Your ASCII Art from [username]
      html: `
        <p dir="rtl">مرحباً ${username},</p>
        <p dir="rtl">شكرًا لك على استخدام محول فن ASCII الخاص بنا! إليك فن ASCII الذي طلبته:</p>
        <pre style="font-family: monospace; background-color: #000; color: #fff; padding: 10px; border-radius: 5px; overflow-x: auto;">${asciiArtText}</pre>
        <p dir="rtl">يمكنك تنزيل نسخة PNG من فن ASCII الخاص بك من الرابط التالي:</p>
        <p dir="rtl"><a href="${process.env.NEXT_PUBLIC_VERCEL_URL || "http://192.168.1.2:3000"}${downloadApiUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">تنزيل فن ASCII (PNG)</a></p>
        <p dir="rtl">نأمل أن تستمتع به!</p>
        <p dir="rtl">مع خالص التقدير،<br>فريق محول فن ASCII</p>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent successfully:", info.messageId)
    return { success: true, message: "تم إرسال فن ASCII إلى بريدك الإلكتروني بنجاح! شكرًا لك." } // Arabic success message
  } catch (err) {
    console.error("Error sending email or saving image:", err)
    let errorMessage = "فشل إرسال فن ASCII. يرجى التحقق من بريدك الإلكتروني والمحاولة مرة أخرى." // Arabic: Failed to send ASCII art. Please check your email and try again.
    if (err instanceof Error) {
      if (err.message.includes("Invalid login") || err.message.includes("authentication failed")) {
        errorMessage =
          "فشل المصادقة. يرجى التحقق من اسم المستخدم وكلمة المرور (أو كلمة مرور التطبيق) لبريدك الإلكتروني." // Arabic: Authentication failed. Please check your email username and password (or App Password).
      } else if (err.message.includes("ETIMEDOUT") || err.message.includes("ENOTFOUND")) {
        errorMessage = "خطأ في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت أو إعدادات SMTP." // Arabic: Server connection error. Please check your internet connection or SMTP settings.
      } else if (err.message.includes("Failed to get image data")) {
        errorMessage = "خطأ في معالجة الصورة. يرجى المحاولة بصورة مختلفة." // Arabic: Image processing error. Please try with a different image.
      }
    }
    return { success: false, message: errorMessage }
  }
}

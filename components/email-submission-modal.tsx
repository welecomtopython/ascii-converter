"use client"

import { cn } from "@/lib/utils"
import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendAsciiArtEmail } from "@/actions/send-ascii-email" // Import the server action

interface EmailSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  asciiArtText: string
  asciiArtPngDataURL: string
  // New props for initial values
  initialEmail?: string
  initialUsername?: string
}

const SESSION_EMAIL_KEY = "ascii_art_email"
const SESSION_USERNAME_KEY = "ascii_art_username"

export function EmailSubmissionModal({
  isOpen,
  onClose,
  onSuccess,
  asciiArtText,
  asciiArtPngDataURL,
  initialEmail = "",
  initialUsername = "",
}: EmailSubmissionModalProps) {
  const [email, setEmail] = useState(initialEmail)
  const [username, setUsername] = useState(initialUsername)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)

  // Update state when initial props change (e.g., modal opens with pre-filled data)
  useEffect(() => {
    setEmail(initialEmail)
    setUsername(initialUsername)
  }, [initialEmail, initialUsername])

  useEffect(() => {
    if (!isOpen) {
      // Reset message state when modal closes
      setMessage(null)
      setIsSuccess(null)
    }
  }, [isOpen])

  const validateEmail = (email: string) => {
    // Basic email regex for client-side validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async () => {
    setMessage(null)
    setIsSuccess(null)

    if (!email || !username) {
      setMessage("البريد الإلكتروني واسم المستخدم مطلوبان.") // Arabic: Email and username are required.
      setIsSuccess(false)
      return
    }

    if (!validateEmail(email)) {
      setMessage("الرجاء إدخال بريد إلكتروني صالح.") // Arabic: Please enter a valid email.
      setIsSuccess(false)
      return
    }

    // Check if we have valid data before sending
    if (!asciiArtText || !asciiArtPngDataURL) {
      setMessage("خطأ: لا توجد بيانات ASCII للإرسال.") // Arabic: Error: No ASCII data to send.
      setIsSuccess(false)
      return
    }

    console.log("Starting email submission:", {
      email,
      username,
      asciiTextLength: asciiArtText.length,
      pngDataUrlLength: asciiArtPngDataURL.length,
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    })

    startTransition(async () => {
      try {
        const result = await sendAsciiArtEmail(email, username, asciiArtText, asciiArtPngDataURL)
        console.log("Email submission result:", result)
        setMessage(result.message)
        setIsSuccess(result.success)
        if (result.success) {
          // Save email and username to localStorage on success
          localStorage.setItem(SESSION_EMAIL_KEY, email)
          localStorage.setItem(SESSION_USERNAME_KEY, username)
          onSuccess() // Trigger success callback in parent
        }
      } catch (error) {
        console.error("Email submission error:", error)
        setMessage("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.") // Arabic: An unexpected error occurred. Please try again.
        setIsSuccess(false)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-stone-900 text-stone-300 border-stone-700">
        <DialogHeader>
          <DialogTitle className="text-stone-100">تنزيل فن ASCII</DialogTitle>
          <DialogDescription className="text-stone-400">
            يرجى إدخال بريدك الإلكتروني واسم المستخدم لإرسال فن ASCII الخاص بك. سيتم إرسال الصور إليك عبر البريد
            الإلكتروني.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right text-stone-300">
              البريد الإلكتروني
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3 bg-stone-800 border-stone-700 text-stone-100"
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right text-stone-300">
              اسم المستخدم
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="col-span-3 bg-stone-800 border-stone-700 text-stone-100"
              disabled={isPending}
            />
          </div>
          {message && (
            <p className={cn("text-center text-sm", isSuccess ? "text-green-400" : "text-red-400")}>{message}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600"
          >
            {isPending ? "جاري الإرسال..." : "تم"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

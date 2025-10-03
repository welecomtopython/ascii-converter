"use client"

import type React from "react"

import { useState, useEffect, useRef, type ChangeEvent } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { GripVertical, Upload, Download, Camera } from "lucide-react"
import { cn } from "@/lib/utils" // Import cn utility
import { EmailSubmissionModal } from "@/components/email-submission-modal" // Import the new modal
import { WhatsAppIcon } from "./svg"

// Define a type for colored ASCII characters
type ColoredChar = {
  char: string
  color: string
}

const SESSION_KEY = "ascii_art_download_session"
const SESSION_EMAIL_KEY = "ascii_art_email" // New key for email
const SESSION_USERNAME_KEY = "ascii_art_username" // New key for username
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export default function AsciiConverter() {
  // Add this at the beginning of the component, right after the imports
  useEffect(() => {
    // Set document background to black
    if (typeof document !== "undefined") {
      document.documentElement.style.backgroundColor = "black"
      document.body.style.backgroundColor = "black"
    }

    return () => {
      // Clean up when component unmounts
      if (typeof document !== "undefined") {
        document.documentElement.style.backgroundColor = ""
        document.body.style.backgroundColor = ""
      }
    }
  }, [])
  const [resolution, setResolution] = useState(0.11)
  const [inverted, setInverted] = useState(false)
  const [grayscale, setGrayscale] = useState(true)
  const [charSet, setCharSet] = useState("standard")
  const [loading, setLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [asciiArt, setAsciiArt] = useState<string>("")
  const [coloredAsciiArt, setColoredAsciiArt] = useState<ColoredChar[][]>([])
  const [leftPanelWidth, setLeftPanelWidth] = useState(25) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [sidebarNarrow, setSidebarNarrow] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const fileInputGalleryRef = useRef<HTMLInputElement>(null)
  const fileInputCameraRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)

  // New state for modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false) // State to show thank you message
  const [savedEmail, setSavedEmail] = useState<string>("") // State for pre-filled email
  const [savedUsername, setSavedUsername] = useState<string>("") // State for pre-filled username

  const charSets = {
    standard: " .:-=+*#%@",
    detailed: " .,:;i1tfLCG08@",
    blocks: " ░▒▓█",
    minimal: " .:█",
  }

  // Set hydration state and load saved credentials
  useEffect(() => {
    setIsHydrated(true)
    if (typeof window !== "undefined") {
      setSavedEmail(localStorage.getItem(SESSION_EMAIL_KEY) || "")
      setSavedUsername(localStorage.getItem(SESSION_USERNAME_KEY) || "")
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    // Check if we're on the client side
    setIsDesktop(window.innerWidth >= 768)

    // Add resize listener
    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 768
      setIsDesktop(newIsDesktop)

      // Reset panel width if switching between mobile and desktop
      if (newIsDesktop !== isDesktop) {
        setLeftPanelWidth(25) // Reset to default when switching layouts
      }
    }

    window.addEventListener("resize", handleResize)

    // Load default image
    loadDefaultImage()

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [isDesktop, isHydrated])

  useEffect(() => {
    if (!isHydrated || !isDesktop) return

    // Check if sidebar is narrow (less than 200px)
    const checkSidebarWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const sidebarWidth = (leftPanelWidth / 100) * containerWidth
        setSidebarNarrow(sidebarWidth < 350)
      }
    }

    checkSidebarWidth()

    // Add resize listener to check sidebar width
    window.addEventListener("resize", checkSidebarWidth)

    return () => {
      window.removeEventListener("resize", checkSidebarWidth)
    }
  }, [leftPanelWidth, isHydrated, isDesktop])

  useEffect(() => {
    if (imageLoaded && imageRef.current) {
      convertToAscii()
    }
  }, [resolution, inverted, grayscale, charSet, imageLoaded])

  useEffect(() => {
    if (!outputCanvasRef.current || !asciiArt || coloredAsciiArt.length === 0) return

    const canvas = outputCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set font properties to match the DOM rendering
    const fontSize = 8 // Base font size in pixels
    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = "top"

    // Calculate dimensions
    const lineHeight = fontSize
    const charWidth = fontSize * 0.6 // Approximate width of monospace character

    // Resize canvas to fit the ASCII art
    if (grayscale) {
      const lines = asciiArt.split("\n")
      const maxLineLength = Math.max(...lines.map((line) => line.length))
      canvas.width = maxLineLength * charWidth
      canvas.height = lines.length * lineHeight
    } else {
      canvas.width = coloredAsciiArt[0].length * charWidth
      canvas.height = coloredAsciiArt.length * lineHeight
    }

    // Re-apply font after canvas resize
    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = "top"

    // Render the ASCII art
    if (grayscale) {
      ctx.fillStyle = "white"
      asciiArt.split("\n").forEach((line, lineIndex) => {
        ctx.fillText(line, 0, lineIndex * lineHeight)
      })
    } else {
      coloredAsciiArt.forEach((row, rowIndex) => {
        row.forEach((col, colIndex) => {
          ctx.fillStyle = col.color
          ctx.fillText(col.char, colIndex * charWidth, rowIndex * lineHeight)
        })
      })
    }
  }, [asciiArt, coloredAsciiArt, grayscale, loading, error, imageLoaded])

  const convertToAscii = () => {
    try {
      if (!canvasRef.current || !imageRef.current) {
        throw new Error("Canvas or image not available")
      }

      const img = imageRef.current

      // Validate image dimensions
      if (img.width === 0 || img.height === 0) {
        throw new Error("Invalid image dimensions")
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        throw new Error("Could not get canvas context")
      }

      // Calculate dimensions based on resolution
      const width = Math.floor(img.width * resolution)
      const height = Math.floor((img.height * resolution) / 0.5)

      // Set canvas dimensions to match the image
      canvas.width = img.width
      canvas.height = img.height

      // Clear the canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, img.width, img.height)

      // Get image data - this is where the error was occurring
      let imageData
      try {
        imageData = ctx.getImageData(0, 0, img.width, img.height)
      } catch (e) {
        throw new Error("Failed to get image data. This might be a CORS issue.")
      }

      const data = imageData.data

      // Choose character set
      const chars = charSets[charSet as keyof typeof charSets]

      // Calculate aspect ratio correction for monospace font
      const fontAspect = 0.5 // Width/height ratio of monospace font characters
      const widthStep = Math.ceil(img.width / width)
      const heightStep = Math.ceil(img.height / height / fontAspect)

      let result = ""
      const coloredResult: ColoredChar[][] = []

      // Process the image
      for (let y = 0; y < img.height; y += heightStep) {
        const coloredRow: ColoredChar[] = []

        for (let x = 0; x < img.width; x += widthStep) {
          const pos = (y * img.width + x) * 4

          const r = data[pos]
          const g = data[pos + 1]
          const b = data[pos + 2]

          // Calculate brightness based on grayscale setting
          let brightness
          if (grayscale) {
            // Standard grayscale calculation
            brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255
          } else {
            // Color-aware brightness (perceived luminance)
            brightness = Math.sqrt(
              0.299 * (r / 255) * (r / 255) + 0.587 * (g / 255) * (g / 255) + 0.114 * (b / 255) * (b / 255),
            )
          }

          // Invert if needed
          if (inverted) brightness = 1 - brightness

          // Map brightness to character
          const charIndex = Math.floor(brightness * (chars.length - 1))
          const char = chars[charIndex]

          result += char

          // For colored mode, store the character and its color
          if (!grayscale) {
            // Adjust color brightness based on the character density
            // Characters with more "ink" (later in the charset) should be brighter
            const brightnessFactor = (charIndex / (chars.length - 1)) * 1.5 + 0.5
            const color = adjustColorBrightness(r, g, b, brightnessFactor)
            coloredRow.push({ char, color })
          } else {
            // For grayscale mode, we still need to populate the array
            coloredRow.push({ char, color: "white" })
          }
        }

        result += "\n"
        coloredResult.push(coloredRow)
      }

      setAsciiArt(result)
      setColoredAsciiArt(coloredResult)
      setError(null)
    } catch (err) {
      console.error("Error converting to ASCII:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setAsciiArt("")
      setColoredAsciiArt([])
    }
  }

  const handleEmailSubmissionTrigger = () => {
    if (loading || !imageLoaded || !asciiArt) {
      setError("لا يوجد فن ASCII للإرسال.") // Arabic: No ASCII art to send.
      return
    }

    // Always open the modal. The session logic is now only for pre-filling.
    setIsModalOpen(true)
  }

  const handleModalSuccess = () => {
    setIsModalOpen(false)
    localStorage.setItem(SESSION_KEY, Date.now().toString()) // Save current timestamp for session
    // Update saved email/username from localStorage after successful submission
    setSavedEmail(localStorage.getItem(SESSION_EMAIL_KEY) || "")
    setSavedUsername(localStorage.getItem(SESSION_USERNAME_KEY) || "")
    setShowThankYou(true) // Show thank you message
    setTimeout(() => setShowThankYou(false), 5000) // Hide after 5 seconds
  }

  const loadDefaultImage = () => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    // Create a new image element
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        setError("Invalid image dimensions")
        setLoading(false)
        return
      }

      imageRef.current = img
      setImageLoaded(true)
      setLoading(false)
    }

    img.onerror = () => {
      setError("Failed to load image")
      setLoading(false)
    }

    // Set the source after setting up event handlers
    img.src = "/images/original-image.png" // Use the local path
  }

  const loadImage = (src: string) => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    // Create a new image element
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        setError("Invalid image dimensions")
        setLoading(false)
        return
      }

      imageRef.current = img
      setImageLoaded(true)
      setLoading(false)
    }

    img.onerror = () => {
      setError("Failed to load image")
    }

    // Set the source after setting up event handlers
    img.src = src
  }

  const handleFileUpload = async (file: File) => {
    const isHeicLike =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      /\.(heic|heif)$/i.test(file.name)

    try {
      let fileToRead: Blob = file

      if (isHeicLike) {
        try {
          const heic2any = (await import("heic2any")).default as (
            options: { blob: Blob; toType?: string; quality?: number },
          ) => Promise<Blob | Blob[]>

          const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })
          fileToRead = Array.isArray(converted) ? converted[0] : converted
        } catch (convErr) {
          console.error("HEIC conversion failed:", convErr)
          setError("تعذر تحويل صورة HEIC. يرجى اختيار صورة بصيغة مدعومة.")
          return
        }
      }

      // Basic image type guard after potential conversion
      const resultingType = (fileToRead as any).type || file.type
      if (!resultingType.startsWith("image/")) {
        setError("Please upload an image file")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          loadImage(e.target.result as string)
        }
      }
      reader.onerror = () => {
        setError("Failed to read file")
      }
      reader.readAsDataURL(fileToRead)
    } catch (err) {
      console.error("Upload processing error:", err)
      setError("حدث خطأ أثناء معالجة الصورة")
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
    // Allow selecting the same file again by resetting the input
    e.target.value = ""
  }

  const openCamera = () => {
    if (!fileInputCameraRef.current) return
    fileInputCameraRef.current.click()
  }

  const openPhotoPicker = () => {
    if (!fileInputGalleryRef.current) return
    fileInputGalleryRef.current.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }

  const handleDragLeave = () => {
    setIsDraggingFile(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  // Helper function to adjust color brightness
  const adjustColorBrightness = (r: number, g: number, b: number, factor: number): string => {
    // Ensure the colors are visible against black background
    const minBrightness = 40 // Minimum brightness to ensure visibility
    r = Math.max(Math.min(Math.round(r * factor), 255), minBrightness)
    g = Math.max(Math.min(Math.round(g * factor), 255), minBrightness)
    b = Math.max(Math.min(Math.round(b * factor), 255), minBrightness)
    return `rgb(${r}, ${g}, ${b})`
  }

  const startDragging = () => {
    setIsDragging(true)
  }

  const supportsDownloadAttribute = (): boolean => {
    if (typeof document === "undefined") return false
    const link = document.createElement("a")
    return typeof (link as any).download !== "undefined"
  }

  const shareBlobIfPossible = async (blob: Blob, filename: string, title: string) => {
    try {
      const navAny = navigator as any
      if (navAny && typeof navAny.share === "function" && typeof navAny.canShare === "function") {
        const file = new File([blob], filename, { type: blob.type })
        if (navAny.canShare({ files: [file] })) {
          await navAny.share({ files: [file], title })
          return true
        }
      }
    } catch {}
    return false
  }

  const downloadBlob = async (blob: Blob, filename: string, title: string) => {
    // Try Web Share API first (best UX on mobile)
    const shared = await shareBlobIfPossible(blob, filename, title)
    if (shared) return

    const url = URL.createObjectURL(blob)
    try {
      if (supportsDownloadAttribute()) {
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        // iOS Safari fallback - open in a new tab; user can Save Image / Share
        window.open(url, "_blank")
      }
    } finally {
      // Delay revocation slightly to allow navigation/download to begin
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }
  }

  const handleDownloadPng = () => {
    if (!outputCanvasRef.current || !asciiArt) {
      setError("لا يوجد فن ASCII للتنزيل.")
      return
    }
    outputCanvasRef.current.toBlob(async (blob) => {
      if (!blob) {
        setError("تعذر إنشاء صورة PNG")
        return
      }
      await downloadBlob(blob, "ascii-art.png", "ASCII Art PNG")
    }, "image/png")
  }

  const handleDownloadTxt = async () => {
    if (!asciiArt) {
      setError("لا يوجد فن ASCII للتنزيل.")
      return
    }
    const encoder = new TextEncoder()
    const bytes = encoder.encode(asciiArt)
    const blob = new Blob([bytes], { type: "text/plain;charset=utf-8" })
    await downloadBlob(blob, "ascii-art.txt", "ASCII Art Text")
  }

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div
        ref={containerRef}
        className="flex flex-col md:flex-row min-h-screen w-full overflow-hidden select-none"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* ASCII Art Preview - Top on mobile, Right on desktop */}
        <div
          ref={previewRef}
          className={cn(
            "order-1 md:order-2 flex-1 bg-black overflow-auto flex items-center justify-center relative",
            isDraggingFile ? "bg-opacity-50" : "",
          )}
          style={{
            ...(isHydrated && isDesktop
              ? {
                  width: `${100 - leftPanelWidth}%`,
                  marginLeft: `${leftPanelWidth}%`,
                }
              : {}),
          }}
        >
          {isDraggingFile && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10 select-none">
              <div className="text-white text-xl font-mono">Drop image here</div>
            </div>
          )}
          {loading ? (
            <div className="text-white font-mono select-none">Loading image...</div>
          ) : error ? (
            <div className="text-red-400 font-mono p-4 text-center select-none">
              {error}
              <div className="mt-2 text-white text-sm">Try uploading a different image or refreshing the page.</div>
            </div>
          ) : (
            <div>
              <canvas
                ref={outputCanvasRef}
                className="max-w-full select-text"
                style={{
                  fontSize: "0.4rem",
                  lineHeight: "0.4rem",
                  fontFamily: "monospace",
                }}
              />
            </div>
          )}

          {/* Thank You Message */}
          {showThankYou && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-20">
              تم إرسال فن ASCII إلى بريدك الإلكتروني! شكرًا لك.
            </div>
          )}

          {/* Floating "Open in v0" button - positioned to not trigger scroll */}
          <div className="fixed bottom-4 right-4 z-30 pointer-events-auto">
            <a
              href="https://v0.dev/community/ascii-art-request-0UE1nczWzbu"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50 rounded block"
            >
            <WhatsAppIcon/>
            </a>
          </div>
        </div>

        {/* Resizable divider - Only visible on desktop after hydration */}
        {isHydrated && isDesktop && (
          <div
            className="order-3 w-2 bg-stone-800 hover:bg-stone-700 cursor-col-resize items-center justify-center z-10 transition-opacity duration-300"
            onMouseDown={startDragging}
            style={{
              position: "absolute",
              left: `${leftPanelWidth}%`,
              top: 0,
              bottom: 0,
              display: "flex",
            }}
          >
            <GripVertical className="h-6 w-6 text-stone-500" />
          </div>
        )}

        {/* Control Panel - Bottom on mobile, Left on desktop */}
        <div
          className={cn(
            "order-2 md:order-1 w-full md:h-auto p-2 md:p-4 bg-stone-900 font-mono text-stone-300 transition-opacity duration-300",
            !isHydrated ? "opacity-0" : "opacity-100",
          )}
          style={{
            width: "100%",
            height: "auto",
            flex: "0 0 auto",
            ...(isHydrated && isDesktop
              ? {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${leftPanelWidth}%`,
                  overflowY: "auto",
                }
              : {}),
          }}
        >
          <div className="space-y-4 p-2 md:p-4 border border-stone-700 rounded-md">
            <div className="space-y-1">
              <h1 className="text-lg text-stone-100 font-bold">ASCII Art Converter</h1>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2 border-t border-stone-700 pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="resolution" className="text-stone-300">
                    الدقة: {resolution.toFixed(2)}
                  </Label>
                </div>
                <Slider
                  id="resolution"
                  min={0.05}
                  max={0.3}
                  step={0.01}
                  value={[resolution]}
                  onValueChange={(value) => setResolution(value[0])}
                  className="[&>span]:border-none [&_.bg-primary]:bg-stone-800 [&>.bg-background]:bg-stone-500/30"
                />
              </div>

              <div className="space-y-2 border-t border-stone-700 pt-4">
                <Label htmlFor="charset" className="text-stone-300">
                  مجموعة الأحرف
                </Label>
                <Select value={charSet} onValueChange={setCharSet}>
                  <SelectTrigger id="charset" className="bg-stone-800 border-stone-700 text-stone-300">
                    <SelectValue placeholder="اختر مجموعة الأحرف" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-800 border-stone-700 text-stone-300">
                    <SelectItem value="standard" className="focus:bg-stone-700 focus:text-stone-100">
                      قياسي
                    </SelectItem>
                    <SelectItem value="detailed" className="focus:bg-stone-700 focus:text-stone-100">
                      مفصل
                    </SelectItem>
                    <SelectItem value="blocks" className="focus:bg-stone-700 focus:text-stone-100">
                      أحرف الكتل
                    </SelectItem>
                    <SelectItem value="minimal" className="focus:bg-stone-700 focus:text-stone-100">
                      أدنى
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 border-t border-stone-700 pt-4">
                <Switch
                  id="invert"
                  checked={inverted}
                  onCheckedChange={setInverted}
                  className="data-[state=checked]:bg-stone-600"
                />
                <Label htmlFor="invert" className="text-stone-300">
                  عكس الألوان
                </Label>
              </div>

              <div className="flex items-center space-x-2 border-t border-stone-700 pt-4">
                <Switch
                  id="grayscale"
                  checked={grayscale}
                  onCheckedChange={setGrayscale}
                  className="data-[state=checked]:bg-stone-600"
                />
                <Label htmlFor="grayscale" className="text-stone-300">
                  وضع التدرج الرمادي
                </Label>
              </div>

              <div className="hidden">
                <canvas ref={canvasRef} width="300" height="300"></canvas>
              </div>
              {/* Gallery picker (no capture) */}
              <input
                type="file"
                ref={fileInputGalleryRef}
                accept="image/*,.heic,.heif"
                onChange={handleFileInputChange}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0, 0, 0, 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              />
              {/* Camera picker (with capture) */}
              <input
                type="file"
                ref={fileInputCameraRef}
                accept="image/*,.heic,.heif"
                onChange={handleFileInputChange}
                capture="environment"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0, 0, 0, 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              />

              {/* Modified button layout to be stacked vertically */}
              <div className="flex flex-col gap-2 pt-4 border-t border-stone-700">
                <Button
                  onClick={() => {
                    if (!asciiArt) {
                      setError("No ASCII art to copy")
                      return
                    }
                    const el = document.createElement("textarea")
                    el.value = asciiArt
                    document.body.appendChild(el)
                    el.select()
                    document.execCommand("copy")
                    document.body.removeChild(el)
                    alert("تم نسخ فن ASCII إلى الحافظة!") // Arabic alert
                  }}
                  className="flex-1 bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600"
                  disabled={loading || !imageLoaded}
                >
                  {sidebarNarrow ? "نسخ" : "نسخ فن ASCII"}
                </Button>

                <div className="flex flex-col md:flex-row gap-2">
                  <Button
                    onClick={handleEmailSubmissionTrigger}
                    className="flex-1 bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600"
                    disabled={loading || !imageLoaded || !asciiArt}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    إرسال الصورة عبر البريد
                  </Button>
                  <Button
                    onClick={handleDownloadTxt}
                    className="flex-1 bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600"
                    disabled={loading || !imageLoaded || !asciiArt}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    تنزيل النص
                  </Button>
                </div>

                <Button
                  onClick={handleEmailSubmissionTrigger} // Always trigger email flow
                  className="flex-1 bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600"
                  disabled={loading || !imageLoaded || !asciiArt}
                >
                  <Download className="h-4 w-4 mr-2" />
                  إرسال فن ASCII (نص و PNG)
                </Button>

                <div className="flex flex-col md:flex-row gap-2">
                  <Button
                    onClick={openPhotoPicker}
                    className="flex-1 bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    اختيار من الصور
                  </Button>
                  <Button
                    onClick={openCamera}
                    className="flex-1 bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    التقاط صورة
                  </Button>
                </div>
              </div>
              

              {/* Arabic Description Section */}
              <div className="space-y-2 border-t border-stone-700 pt-4 text-right">
                <h2 className="text-md text-stone-100 font-bold">الوصف</h2>
                <p className="text-sm text-stone-400 leading-relaxed">
                  هذا التطبيق يحول صورك إلى فن ASCII مذهل. يمكنك تعديل الدقة، واختيار مجموعات الأحرف المختلفة، وعكس
                  الألوان، والتبديل بين وضع التدرج الرمادي والألوان. سيتم إرسال فن ASCII إليك عبر البريد الإلكتروني.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Submission Modal */}
        <EmailSubmissionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          asciiArtText={asciiArt}
          asciiArtPngDataURL={outputCanvasRef.current?.toDataURL("image/png") || ""}
          initialEmail={savedEmail} // Pass saved email
          initialUsername={savedUsername} // Pass saved username
        />
      </div>
    </div>
  )
}

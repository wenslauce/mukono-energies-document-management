import Image from "next/image"

interface DocumentWatermarkProps {
  companyLogo?: string
  opacity?: number
}

export function DocumentWatermark({
  companyLogo = "/logo.png",
  opacity = 0.1
}: DocumentWatermarkProps) {
  return (
    <div className="pdf-watermark absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
      <div 
        style={{ opacity }} 
        className="w-[500px] h-[500px] relative select-none transform-gpu"
      >
        <Image 
          src={companyLogo}
          alt="Watermark"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 500px"
          className="object-contain select-none"
          unoptimized={true}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  )
} 
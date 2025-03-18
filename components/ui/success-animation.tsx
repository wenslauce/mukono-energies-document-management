"use client"

import { motion } from "framer-motion"
import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SuccessAnimationProps {
  className?: string
  size?: "sm" | "md" | "lg"
  color?: string
}

export function SuccessAnimation({ 
  className, 
  size = "md", 
  color = "text-green-500" 
}: SuccessAnimationProps) {
  // Size mapping
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.3,
        type: "spring",
        stiffness: 200,
        damping: 10
      }
    }
  }

  const checkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { 
        delay: 0.2,
        duration: 0.5,
        ease: "easeInOut" 
      }
    }
  }

  const circleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: 0.4,
        ease: "easeOut" 
      }
    }
  }

  return (
    <motion.div
      className={cn("flex items-center justify-center", className)}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className={cn(sizeMap[size], color)}>
        <motion.div
          className="relative h-full w-full"
          variants={circleVariants}
        >
          <CheckCircle className="h-full w-full" />
        </motion.div>
      </motion.div>
    </motion.div>
  )
} 
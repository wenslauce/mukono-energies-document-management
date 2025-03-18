"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SuccessAnimation } from "./success-animation"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  redirectCountdown?: number
  redirectMessage?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  redirectCountdown,
  redirectMessage = "Redirecting in",
  actionLabel = "Continue",
  onAction,
  className
}: SuccessModalProps) {
  const [countdown, setCountdown] = useState(redirectCountdown || 0)

  useEffect(() => {
    if (!isOpen || !redirectCountdown) return
    
    setCountdown(redirectCountdown)
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          if (onAction) onAction()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [isOpen, redirectCountdown, onAction])

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  }
  
  const modalVariants = {
    hidden: { 
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { 
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: { 
      opacity: 0,
      y: 20,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          
          <motion.div
            className={cn(
              "relative z-50 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900",
              "border border-gray-200 dark:border-gray-800",
              className
            )}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <SuccessAnimation size="lg" />
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {message}
                </p>
                
                {redirectCountdown && countdown > 0 && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                    {redirectMessage} <span className="font-medium">{countdown}</span>s
                  </p>
                )}
              </div>
              
              <Button 
                onClick={onAction || onClose}
                className="mt-2 w-full"
              >
                {actionLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
} 
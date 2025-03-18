"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

// Sample data - in a real app, this would come from Supabase
const events = [
  { date: new Date(2023, 6, 5), title: "Invoice #INV-001", amount: 250000, type: "invoice" },
  { date: new Date(2023, 6, 12), title: "Receipt #RCT-001", amount: 250000, type: "receipt" },
  { date: new Date(2023, 6, 18), title: "Quote #QT-001", amount: 500000, type: "quote" },
  { date: new Date(2023, 6, 25), title: "Invoice #INV-002", amount: 350000, type: "invoice" },
]

export function CalendarView() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedEvents, setSelectedEvents] = useState<any[]>([])

  const handleSelect = (day: Date | undefined) => {
    setDate(day)
    if (day) {
      const dayEvents = events.filter(
        (event) =>
          event.date.getDate() === day.getDate() &&
          event.date.getMonth() === day.getMonth() &&
          event.date.getFullYear() === day.getFullYear(),
      )
      setSelectedEvents(dayEvents)
    } else {
      setSelectedEvents([])
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 gap-2">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          className="rounded-md border"
          components={{
            Day: ({ day, ...props }) => {
              const hasEvent = events.some(
                (event) =>
                  event.date.getDate() === day.date.getDate() &&
                  event.date.getMonth() === day.date.getMonth() &&
                  event.date.getFullYear() === day.date.getFullYear(),
              )

              return (
                <button
                  {...props}
                  className={cn(
                    props.className,
                    hasEvent && "relative bg-primary/10 text-primary-foreground font-bold",
                  )}
                >
                  {day.date.getDate()}
                  {hasEvent && (
                    <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </button>
              )
            },
          }}
        />
      </div>

      <div className="mt-4 flex-1">
        <h3 className="mb-2 text-sm font-medium">
          {date ? <>Events for {date.toLocaleDateString()}</> : <>Select a date to view events</>}
        </h3>

        <AnimatePresence>
          {selectedEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedEvents.map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                >
                  <Card className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.type}</p>
                    </div>
                    <p className="font-bold">
                      {new Intl.NumberFormat("en-UG", {
                        style: "currency",
                        currency: "UGX",
                      }).format(event.amount)}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-muted-foreground"
            >
              No events for this date
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}


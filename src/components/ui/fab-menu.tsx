import * as React from "react"
import { FAB } from "./fab"
import { Plus, MessageSquare, Phone, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface FABMenuProps {
  onTextClick: () => void
  onVoiceClick: () => void
  className?: string
  offset?: {
    bottom?: string
    right?: string
  }
}

export function FABMenu({ onTextClick, onVoiceClick, className, offset }: FABMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleTextClick = () => {
    setIsOpen(false)
    onTextClick()
  }

  const handleVoiceClick = () => {
    setIsOpen(false)
    onVoiceClick()
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Menu items */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed z-50" style={{ bottom: offset?.bottom || '80px', right: offset?.right || '16px' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="mb-3"
            >
              <button
                onClick={handleVoiceClick}
                className="flex items-center gap-3 bg-background rounded-full shadow-lg px-4 py-3 hover:shadow-xl transition-shadow"
              >
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium pr-2">Voice</span>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="mb-3"
            >
              <button
                onClick={handleTextClick}
                className="flex items-center gap-3 bg-background rounded-full shadow-lg px-4 py-3 hover:shadow-xl transition-shadow"
              >
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium pr-2">Text</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <FAB
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "transition-transform",
          isOpen && "rotate-45",
          className
        )}
        offset={offset}
      >
        {isOpen ? <X /> : <Plus />}
      </FAB>
    </>
  )
}
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface PromptInputProps {
  className?: string
  value?: string
  onValueChange?: (value: string) => void
  onSubmit?: () => void
  children: React.ReactNode
}

const PromptInputContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
} | null>(null)

function PromptInput({ 
  className, 
  value = "", 
  onValueChange = () => {}, 
  onSubmit = () => {},
  children,
  ...props
}: PromptInputProps) {
  return (
    <PromptInputContext.Provider value={{ value, onValueChange, onSubmit }}>
      <div 
        className={cn(
          "relative flex min-h-[60px] w-full rounded-xl border border-input bg-background p-3",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </PromptInputContext.Provider>
  )
}

interface PromptInputTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
}

function PromptInputTextarea({ className, onKeyDown, ...props }: PromptInputTextareaProps) {
  const context = React.useContext(PromptInputContext)
  
  if (!context) {
    throw new Error("PromptInputTextarea must be used within PromptInput")
  }

  const { value, onValueChange, onSubmit } = context

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
    onKeyDown?.(e)
  }

  return (
    <textarea
      className={cn(
        "flex-1 resize-none border-0 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

interface PromptInputActionsProps {
  className?: string
  children: React.ReactNode
}

function PromptInputActions({ className, children }: PromptInputActionsProps) {
  return (
    <div className={cn("flex items-end gap-2", className)}>
      {children}
    </div>
  )
}

export { 
  PromptInput, 
  PromptInputTextarea, 
  PromptInputActions 
}
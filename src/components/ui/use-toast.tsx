import { createContext, useContext, useState } from "react"

type ToastType = {
  title: string
  description: string
  duration?: number
}

type ToastContextType = {
  toast: (props: ToastType) => void
  toasts: ToastType[]
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const toast = (props: ToastType) => {
    const id = Date.now()
    setToasts((prev) => [...prev, props])
    
    if (props.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((_, i) => i !== id))
      }, props.duration || 3000)
    }
  }

  return (
    <ToastContext.Provider value={{ toast, toasts }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  
  return context
} 
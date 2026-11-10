import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'
type Toast = { id: number; message: string; variant: ToastVariant }
type ToastContextValue = { toast: (message: string, variant?: ToastVariant) => void }

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const timers = useRef<number[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems(current => current.filter(item => item.id !== id))
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId.current++
    setItems(current => [...current, { id, message, variant }])
    const duration = variant === 'error' ? 7000 : 4000
    timers.current.push(window.setTimeout(() => dismiss(id), duration))
  }, [dismiss])

  useEffect(() => () => {
    timers.current.forEach(timer => window.clearTimeout(timer))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map(item => {
          const Icon = item.variant === 'success'
            ? CircleCheck
            : item.variant === 'error'
              ? CircleAlert
              : item.variant === 'warning'
                ? TriangleAlert
                : Info
          return (
            <div key={item.id} className={`toast toast-${item.variant}`} role={item.variant === 'error' ? 'alert' : 'status'}>
              <Icon size={18} aria-hidden="true" />
              <span>{item.message}</span>
              <button type="button" aria-label="Cerrar notificación" onClick={() => dismiss(item.id)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe utilizarse dentro de ToastProvider')
  return context
}

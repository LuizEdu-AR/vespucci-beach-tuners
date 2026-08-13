import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)

  const toast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID()
    setToasts((items) => [...items, { id, message, type }])
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3600)
  }, [])

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve
    setDialog(typeof options === 'string' ? { title: 'Confirmar ação', message: options } : options)
  }), [])

  const closeDialog = (result) => {
    setDialog(null)
    resolver.current?.(result)
    resolver.current = null
  }

  const icons = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info }
  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])

  return <UIContext.Provider value={value}>
    {children}
    <div className="toast-stack" aria-live="polite">{toasts.map((item) => { const Icon = icons[item.type] || Info; return <div key={item.id} className={`toast toast-${item.type}`}><Icon size={19}/><span>{item.message}</span><button onClick={() => setToasts((items) => items.filter((t) => t.id !== item.id))}><X size={16}/></button></div> })}</div>
    {dialog && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeDialog(false)}><div className="modal-card confirm-card" role="dialog" aria-modal="true"><div className="modal-icon warning"><AlertTriangle size={22}/></div><div className="modal-copy"><span className="eyebrow">CONFIRMAÇÃO</span><h3>{dialog.title || 'Confirmar ação'}</h3><p>{dialog.message}</p></div><div className="modal-actions"><button className="button ghost" onClick={() => closeDialog(false)}>{dialog.cancelLabel || 'Cancelar'}</button><button className={`button ${dialog.danger ? 'danger-solid' : 'primary'}`} onClick={() => closeDialog(true)}>{dialog.confirmLabel || 'Confirmar'}</button></div></div></div>}
  </UIContext.Provider>
}

export const useUI = () => useContext(UIContext)

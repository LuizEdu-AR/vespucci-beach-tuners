import { X } from 'lucide-react'

export default function Modal({ open, title, eyebrow, children, onClose, actions }) {
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}><div className="modal-card" role="dialog" aria-modal="true"><div className="modal-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h3>{title}</h3></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18}/></button></div><div className="modal-body">{children}</div>{actions && <div className="modal-actions">{actions}</div>}</div></div>
}

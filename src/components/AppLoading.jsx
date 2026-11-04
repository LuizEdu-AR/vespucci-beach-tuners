import { LoaderCircle } from 'lucide-react'

export default function AppLoading() {
  return <div className="app-loading" role="status" aria-live="polite">
    <LoaderCircle className="app-loading-spinner" size={34} strokeWidth={2.2} aria-hidden="true" />
    <span>Carregando sistema...</span>
  </div>
}

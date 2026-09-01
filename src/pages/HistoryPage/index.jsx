import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Search, Trash2, UserRound, Wrench } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import { ROLE_RANK } from '../../data/seeds'
import { deleteService, subscribeServices } from '../../services/firestore'

const money = (v) => Number(v || 0).toLocaleString('pt-BR')
const PAGE_SIZE = 10

const localDateKey = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function HistoryPage() {
  const { user } = useAuth()
  const { confirm, toast } = useUI()
  const [history, setHistory] = useState([])
  const [q, setQ] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('')

  useEffect(
    () =>
      subscribeServices(
        setHistory,
        (error) => {
          console.error(error)
          toast('Não foi possível carregar o histórico.', 'error')
        }
      ),
    [toast]
  )

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return history.filter((record) => {
      const matchesSearch = !term || `${record.clientId} ${record.clientName || ''} ${record.mechanic?.name || ''} ${record.mechanic?.id || ''}`
        .toLowerCase()
        .includes(term)

      const matchesDate = !dateFilter || localDateKey(record.createdAt) === dateFilter

      return matchesSearch && matchesDate
    })
  }, [history, q, dateFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const canDelete = (ROLE_RANK[user.role] ?? -1) >= ROLE_RANK.Gerente

  const shownRole = (record) => {
    if (record.mechanic?.uid === user.uid) {
      return user.secondaryRole || record.mechanic?.role
    }
    return record.mechanic?.role
  }

  const goToPage = (target) => {
    const numeric = Number(target)
    if (!Number.isFinite(numeric)) return
    const nextPage = Math.min(totalPages, Math.max(1, Math.trunc(numeric)))
    setPage(nextPage)
    setPageInput('')
  }

  const remove = async (id) => {
    const ok = await confirm({
      title: 'Excluir registro',
      message: 'Este cálculo será removido definitivamente do histórico.',
      danger: true,
      confirmLabel: 'Excluir',
    })
    if (!ok) return

    try {
      await deleteService(id)
      toast('Registro removido do histórico.', 'success')
    } catch (error) {
      console.error(error)
      toast('Não foi possível excluir o registro.', 'error')
    }
  }

  const firstPages = Array.from(
    { length: Math.min(3, totalPages) },
    (_, index) => index + 1
  )

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REGISTROS</span>
          <h1>Histórico de cálculos</h1>
          <p>Modificações, cliente, mecânico e imagens anexadas em cada atendimento finalizado.</p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 210px',
          gap: 12,
          alignItems: 'stretch',
        }}
      >
        <div className="searchbar" style={{ margin: 0 }}>
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por cliente, mecânico ou ID..."
          />
        </div>

        <div
          className="searchbar"
          style={{
            margin: 0,
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          <CalendarDays size={18} />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value)
              setPage(1)
            }}
            title="Filtrar histórico por data"
            style={{ minWidth: 0 }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 12,
          marginBottom: 16,
          padding: '10px 12px',
          border: '1px solid #17232d',
          borderRadius: 12,
          background: 'rgba(7, 16, 22, 0.7)',
        }}
      >
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1}
          style={{
            height: 36,
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 9,
            border: '1px solid #17232d',
            background: '#081117',
            color: page === 1 ? '#43535c' : '#c7d4da',
            fontWeight: 700,
            cursor: page === 1 ? 'not-allowed' : 'pointer',
            opacity: page === 1 ? 0.55 : 1,
          }}
        >
          <ChevronLeft size={16} />
          Anterior
        </button>

        {firstPages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => setPage(pageNumber)}
            style={{
              minWidth: 38,
              height: 36,
              padding: '0 11px',
              borderRadius: 9,
              border: page === pageNumber ? '1px solid #0A93B8' : '1px solid #17232d',
              background: page === pageNumber ? 'rgba(10, 147, 184, 0.18)' : '#081117',
              color: page === pageNumber ? '#20c8f2' : '#c7d4da',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {pageNumber}
          </button>
        ))}

        {page > 3 && page < totalPages && (
          <button
            type="button"
            aria-current="page"
            title={`Página atual: ${page}`}
            style={{
              minWidth: 38,
              height: 36,
              padding: '0 11px',
              borderRadius: 9,
              border: '1px solid #0A93B8',
              background: 'rgba(10, 147, 184, 0.18)',
              color: '#20c8f2',
              fontWeight: 700,
              cursor: 'default',
            }}
          >
            {page}
          </button>
        )}

        {totalPages > 3 && (
          <>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goToPage(pageInput)
              }}
              onBlur={() => {
                if (pageInput) goToPage(pageInput)
              }}
              placeholder="Página"
              aria-label="Ir para página"
              style={{
                width: 92,
                height: 36,
                borderRadius: 9,
                border: '1px solid #17232d',
                background: '#081117',
                color: '#fff',
                padding: '0 10px',
              }}
            />

            {totalPages > 4 && (
              <span style={{ color: '#647782', fontWeight: 700 }}>…</span>
            )}

            <button
              type="button"
              onClick={() => setPage(totalPages)}
              style={{
                minWidth: 38,
                height: 36,
                padding: '0 11px',
                borderRadius: 9,
                border: page === totalPages ? '1px solid #0A93B8' : '1px solid #17232d',
                background: page === totalPages ? 'rgba(10, 147, 184, 0.18)' : '#081117',
                color: page === totalPages ? '#20c8f2' : '#c7d4da',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page === totalPages}
          style={{
            height: 36,
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 9,
            border: '1px solid #17232d',
            background: '#081117',
            color: page === totalPages ? '#43535c' : '#c7d4da',
            fontWeight: 700,
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
            opacity: page === totalPages ? 0.55 : 1,
          }}
        >
          Próximo
          <ChevronRight size={16} />
        </button>

        <span
          style={{
            marginLeft: 'auto',
            color: '#748892',
            fontSize: 13,
          }}
        >
          Página {page} de {totalPages} · {filtered.length} registro{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state large">Nenhum cálculo encontrado.</div>
      ) : (
        <div className="history-list">
          {paginated.map((record) => (
            <article className="card history-card" key={record.id}>
              <div className="history-head">
                <div>
                  <span className="record-code">CLIENTE #{record.clientId}</span>
                  {record.clientName && (
                    <div className="history-client-name">{record.clientName}</div>
                  )}
                  <h3>$ {money(record.total)}</h3>
                </div>

                {canDelete && (
                  <button
                    className="icon-button danger"
                    onClick={() => remove(record.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>

              <div className="history-meta">
                <span>
                  <UserRound size={15} />
                  {record.mechanic?.name} · ID {record.mechanic?.id}
                </span>
                <span>
                  <Wrench size={15} />
                  {shownRole(record)}
                </span>
                <span>
                  <CalendarDays size={15} />
                  {record.createdAt
                    ? new Date(record.createdAt).toLocaleString('pt-BR')
                    : 'Agora'}
                </span>
              </div>

              <div className="history-body">
                <div>
                  <h4>Modificações</h4>
                  <div className="mod-list">
                    {(record.modifications || []).map((modification, index) => (
                      <div key={index}>
                        <span>{modification.label}</span>
                        <strong>$ {money(modification.price)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="history-images">
                  {record.vtuningImage && (
                    <figure>
                      <img src={record.vtuningImage} alt="V-Tuning" />
                      <figcaption>V-Tuning</figcaption>
                    </figure>
                  )}
                  {record.vehicleImage && (
                    <figure>
                      <img src={record.vehicleImage} alt="Veículo" />
                      <figcaption>Veículo</figcaption>
                    </figure>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronUp,
  Pencil,
  Search,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import { useUI } from '../../context/UIContext'
import { useAuth } from '../../context/AuthContext'
import {
  subscribeClients,
  subscribeServices,
  updateClient,
} from '../../services/firestore'

const money = (value) => Number(value || 0).toLocaleString('pt-BR')

export default function ClientsPage() {
  const { toast } = useUI()
  const { isManagerOrAbove } = useAuth()

  const [clients, setClients] = useState([])
  const [history, setHistory] = useState([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)

  const [editing, setEditing] = useState(null)
  const [editName, setEditName] = useState('')
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(
    () =>
      subscribeClients(
        setClients,
        (error) => {
          console.error(error)
          toast('Não foi possível carregar os clientes.', 'error')
        }
      ),
    [toast]
  )

  useEffect(
    () =>
      subscribeServices(
        setHistory,
        (error) => {
          console.error(error)
          toast(
            'Não foi possível carregar os serviços dos clientes.',
            'error'
          )
        }
      ),
    [toast]
  )

  const clientRows = useMemo(() => {
    const map = new Map(
      clients.map((client) => [
        String(client.id),
        {
          ...client,
          services: [],
        },
      ])
    )

    history.forEach((record) => {
      const key = String(record.clientId)

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: record.clientName || 'Cliente sem nome salvo',
          createdAt: null,
          services: [],
        })
      }

      map.get(key).services.push(record)
    })

    return [...map.values()]
      .map((client) => ({
        ...client,
        services: client.services.sort(
          (a, b) =>
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        ),
      }))
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'pt-BR')
      )
  }, [clients, history])

  const filtered = clientRows.filter((client) =>
    `${client.name} ${client.id}`
      .toLowerCase()
      .includes(q.toLowerCase())
  )

  const startEdit = (client, event) => {
    event?.stopPropagation()

    setEditing(client)
    setEditName(client.name || '')
    setEditId(String(client.id || ''))
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditName('')
    setEditId('')
  }

  const saveEdit = async (event) => {
    event.preventDefault()

    if (!editing || saving) return

    const name = editName.trim()
    const id = editId.trim()

    if (!name || !id) {
      toast('Informe o nome e o ID do cliente.', 'error')
      return
    }

    setSaving(true)

    try {
      await updateClient({
        oldId: editing.id,
        id,
        name,
      })

      if (open === editing.id) {
        setOpen(id)
      }

      toast('Cliente atualizado com sucesso.', 'success')
      cancelEdit()
    } catch (error) {
      console.error(error)
      toast(
        error?.message || 'Não foi possível atualizar o cliente.',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRAÇÃO</span>
          <h1>Clientes</h1>
          <p>
            Lista de clientes cadastrados e histórico completo dos
            serviços solicitados por cada um.
          </p>
        </div>
      </div>

      <div className="searchbar">
        <Search size={18} />
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Buscar cliente por nome ou ID..."
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state large">
          Nenhum cliente cadastrado.
        </div>
      ) : (
        <div className="client-list">
          {filtered.map((client) => {
            const expanded = open === client.id
            const total = client.services.reduce(
              (sum, record) => sum + Number(record.total || 0),
              0
            )

            return (
              <article
                className="card client-card"
                key={client.id}
              >
                <button
                  className="client-card-head"
                  onClick={() =>
                    setOpen(expanded ? null : client.id)
                  }
                >
                  <div className="client-identity">
                    <div className="avatar small">
                      {client.name?.charAt(0)}
                    </div>

                    <div>
                      <strong>{client.name}</strong>
                      <span>ID #{client.id}</span>
                    </div>
                  </div>

                  <div className="client-stats">
                    <div>
                      <span>SERVIÇOS</span>
                      <strong>{client.services.length}</strong>
                    </div>

                    <div>
                      <span>TOTAL</span>
                      <strong>$ {money(total)}</strong>
                    </div>

                    {isManagerOrAbove && (
                      <span
                        role="button"
                        tabIndex={0}
                        title="Editar cliente"
                        onClick={(event) =>
                          startEdit(client, event)
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === 'Enter' ||
                            event.key === ' '
                          ) {
                            event.preventDefault()
                            startEdit(client, event)
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <Pencil size={17} />
                      </span>
                    )}

                    {expanded ? (
                      <ChevronUp />
                    ) : (
                      <ChevronDown />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="client-services">
                    {client.services.length === 0 ? (
                      <div className="empty-state">
                        Este cliente ainda não possui serviços
                        finalizados.
                      </div>
                    ) : (
                      client.services.map((record) => (
                        <div
                          className="client-service"
                          key={record.id}
                        >
                          <div className="client-service-top">
                            <div>
                              <span className="record-code">
                                SERVIÇO
                              </span>
                              <strong>
                                $ {money(record.total)}
                              </strong>
                            </div>

                            <span>
                              <CalendarDays size={14} />
                              {record.createdAt
                                ? new Date(
                                    record.createdAt
                                  ).toLocaleString('pt-BR')
                                : 'Agora'}
                            </span>
                          </div>

                          <div className="history-meta compact">
                            <span>
                              <UserRound size={15} />
                              {record.mechanic?.name} · ID{' '}
                              {record.mechanic?.id}
                            </span>

                            <span>
                              <Wrench size={15} />
                              {record.mechanic?.role}
                            </span>
                          </div>

                          <div className="client-service-body">
                            <div className="mod-list">
                              {(record.modifications || []).map(
                                (modification, index) => (
                                  <div key={index}>
                                    <span>
                                      {modification.label}
                                    </span>
                                    <strong>
                                      $ {money(modification.price)}
                                    </strong>
                                  </div>
                                )
                              )}
                            </div>

                            <div className="client-service-images">
                              {record.vtuningImage && (
                                <figure>
                                  <img
                                    src={record.vtuningImage}
                                    alt="V-Tuning"
                                  />
                                  <figcaption>
                                    V-Tuning
                                  </figcaption>
                                </figure>
                              )}

                              {record.vehicleImage && (
                                <figure>
                                  <img
                                    src={record.vehicleImage}
                                    alt="Veículo"
                                  />
                                  <figcaption>
                                    <CarFront size={13} /> Veículo
                                  </figcaption>
                                </figure>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {editing && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              cancelEdit()
            }
          }}
        >
          <div
            className="modal-card card"
            style={{
              maxWidth: 520,
              width: 'calc(100% - 32px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div>
                <span className="eyebrow">
                  ADMINISTRAÇÃO
                </span>
                <h2 style={{ marginTop: 4 }}>
                  Editar cliente
                </h2>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveEdit}>
              <label className="field">
                <span>Nome</span>
                <input
                  value={editName}
                  onChange={(event) =>
                    setEditName(event.target.value)
                  }
                  autoFocus
                />
              </label>

              <label className="field">
                <span>ID</span>
                <input
                  value={editId}
                  onChange={(event) =>
                    setEditId(event.target.value)
                  }
                />
              </label>

              <p
                style={{
                  opacity: 0.75,
                  fontSize: 13,
                }}
              >
                Ao alterar o ID ou nome, os serviços já
                registrados desse cliente também serão
                vinculados aos novos dados.
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '20px',
                }}
              >
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    border: '1px solid #17232d',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    background: 'transparent',
                    color: '#c7d4da',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    cursor: saving
                      ? 'not-allowed'
                      : 'pointer',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    border: '1px solid #0A93B8',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    background:
                      'linear-gradient(135deg, #0A93B8, #087c9b)',
                    color: '#ffffff',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    cursor: saving
                      ? 'not-allowed'
                      : 'pointer',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving
                    ? 'Salvando...'
                    : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

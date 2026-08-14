import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, LoaderCircle, Plus, Trash2, UserPlus } from 'lucide-react'
import ImageUpload from '../../components/ImageUpload'
import { PRICE_TABLE } from '../../data/seeds'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import { createClient, createService, getClientById, subscribePriceTable } from '../../services/firestore'
import { sendServiceToDiscord } from '../../services/discordApi'

const money = (v) => Number(v || 0).toLocaleString('pt-BR')
const emptySelections = () => ({ tuning: {}, fullTuning: false, blindagem: '', items: {}, aesthetics: {}, guinchoKm: 0, dmv: 'none', dmvMaterials: 0 })

export default function CalculatorPage() {
  const { user } = useAuth(); const { toast } = useUI()
  const [prices, setPrices] = useState(PRICE_TABLE)
  const [clientId, setClientId] = useState(''); const [client, setClient] = useState(null); const [searchingClient, setSearchingClient] = useState(false)
  const [newClientName, setNewClientName] = useState(''); const [showClientForm, setShowClientForm] = useState(false); const [registeringClient, setRegisteringClient] = useState(false)
  const [vtuning, setVtuning] = useState(''); const [vehicle, setVehicle] = useState(''); const [sel, setSel] = useState(emptySelections()); const [finishing, setFinishing] = useState(false)

  useEffect(() => subscribePriceTable(setPrices, (error) => { console.error(error); toast('Não foi possível sincronizar a tabela de preços.', 'error') }), [toast])
  useEffect(() => {
    const clean = clientId.trim(); setClient(null); setShowClientForm(false)
    if (!clean) { setSearchingClient(false); return }
    setSearchingClient(true)
    const timer = setTimeout(async () => { try { setClient(await getClientById(clean)) } catch (error) { console.error(error); toast('Não foi possível consultar o cliente.', 'error') } finally { setSearchingClient(false) } }, 350)
    return () => clearTimeout(timer)
  }, [clientId, toast])

  const breakdown = useMemo(() => {
    const rows = []; let total = 0
    if (sel.fullTuning) { const price = Number(prices.fullTuning || 0); rows.push({ label: 'Full Tuning', price }); total += price }
    else Object.entries(sel.tuning).forEach(([name, level]) => { if (level) { const price = prices.tuning?.[name]?.[Number(level) - 1]; if (price) { rows.push({ label: `${name} · nível ${level}`, price }); total += price } } })
    if (sel.blindagem === 'full') { const price = Number(prices.fullBlindagem || 0); rows.push({ label: 'Full Blindagem', price }); total += price }
    else if (sel.blindagem) { const price = prices.blindagem?.[Number(sel.blindagem) - 1] || 0; if (price) { rows.push({ label: `Blindagem · nível ${sel.blindagem}`, price }); total += price } }
    ; (prices.items || []).forEach(i => { const qty = Number(sel.items[i.key] || 0); if (qty) { rows.push({ label: `${i.label} × ${qty}`, price: i.price * qty }); total += i.price * qty } })
      ; (prices.aesthetics || []).forEach(i => { const qty = Number(sel.aesthetics[i.key] || 0); if (qty) { rows.push({ label: `${i.label} × ${qty}`, price: i.price * qty }); total += i.price * qty } })
    if (sel.guinchoKm > 0) { const price = Number(prices.towing?.base || 0) + Math.ceil(sel.guinchoKm / 2) * Number(prices.towing?.per2Km || 0); rows.push({ label: `Guincho · ${sel.guinchoKm} km`, price }); total += price }
    if (sel.dmv !== 'none') { const dmv = (prices.dmv || []).find(d => String(d.key) === String(sel.dmv)); if (dmv) { const materials = dmv.materials ? Number(sel.dmvMaterials || 0) : 0; rows.push({ label: `${dmv.label}${materials ? ' + materiais' : ''}`, price: Number(dmv.price || 0) + materials }); total += Number(dmv.price || 0) + materials } }
    return { rows, total }
  }, [sel, prices])

  const registerClient = async () => {
    const cleanId = clientId.trim(); const cleanName = newClientName.trim()
    if (!cleanId) return toast('Informe o ID do cliente antes de cadastrá-lo.', 'warning')
    if (!cleanName) return toast('Informe o nome do cliente.', 'warning')
    try { setRegisteringClient(true); await createClient({ id: cleanId, name: cleanName, createdBy: { uid: user.uid, id: user.id, name: user.name } }); const created = { id: cleanId, clientId: cleanId, name: cleanName }; setClient(created); setShowClientForm(false); setNewClientName(''); toast(`${cleanName} foi cadastrado e vinculado ao ID ${cleanId}.`, 'success') } catch (error) { console.error(error); toast('Não foi possível cadastrar o cliente.', 'error') } finally { setRegisteringClient(false) }
  }
  const applyFullTuning = () => { const tuning = {}; Object.entries(prices.tuning || {}).forEach(([name, levels]) => { if (levels.length) tuning[name] = levels.length }); setSel(s => ({ ...s, tuning, fullTuning: true })) }
  const clear = () => { setSel(emptySelections()); setClientId(''); setClient(null); setNewClientName(''); setShowClientForm(false); setVtuning(''); setVehicle('') }
  const finish = async () => {
    if (!clientId.trim()) return toast('Informe o ID do cliente.', 'warning')
    if (!client) return toast('Cadastre este cliente antes de finalizar o serviço.', 'warning')
    if (!vtuning) return toast('Anexe a imagem do V-Tuning.', 'warning')
    if (!breakdown.rows.length) return toast('Selecione ao menos um serviço.', 'warning')
    try {
      setFinishing(true)
      const serviceData = { clientId: client.id, clientName: client.name, mechanic: { uid: user.uid, id: user.id, name: user.name, role: user.role }, vtuningImage: vtuning, vehicleImage: vehicle || '', modifications: breakdown.rows, total: breakdown.total }
      const serviceId = await createService(serviceData)
      try {
        await sendServiceToDiscord({ ...serviceData, serviceId })
        toast('Serviço finalizado, salvo no histórico e enviado ao Discord.', 'success')
      } catch (discordError) {
        console.error('Serviço salvo, mas o envio ao Discord falhou:', discordError)
        toast('Serviço salvo no histórico, mas não foi possível enviar ao Discord.', 'warning')
      }
      clear()
    } catch (error) {
      console.error(error)
      toast('Não foi possível finalizar o serviço.', 'error')
    } finally {
      setFinishing(false)
    }
  }
  const qtyField = (group, key, max) => <input className="qty" type="number" min="0" max={max || 99} value={sel[group][key] || 0} onChange={e => setSel(s => ({ ...s, [group]: { ...s[group], [key]: Math.max(0, Number(e.target.value)) } }))} />

  return <>
    <div className="page-heading"><div><span className="eyebrow">ORÇAMENTO</span><h1>Calcular serviço</h1><p>Monte as modificações e finalize para salvar no histórico compartilhado.</p></div><button className="button ghost" onClick={clear}><Trash2 size={17} /> Limpar</button></div>
    <div className="content-grid calculator-layout"><div className="stack">
      <div className="card"><h3>Identificação</h3><div className="form-grid three">
        <div><label>ID do cliente *</label><input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Ex.: 4581" />
          {searchingClient && <div className="client-missing"><LoaderCircle className="spin" size={15} /><span>Consultando cliente...</span></div>}
          {!searchingClient && clientId.trim() && client && <div className="client-found"><CheckCircle2 size={16} /><div><strong>{client.name}</strong><span>Cliente cadastrado · ID {client.id}</span></div></div>}
          {!searchingClient && clientId.trim() && !client && !showClientForm && <><div className="client-missing"><AlertTriangle size={15} /><span>Cliente ainda não cadastrado.</span></div><button type="button" className="button small client-register-button" onClick={() => setShowClientForm(true)}><UserPlus size={16} /> Cadastrar cliente</button></>}
        </div>
        <div><label>Nome do cliente</label><input value={client?.name || ''} disabled placeholder={clientId.trim() ? (searchingClient ? 'Consultando...' : 'Cliente não cadastrado') : 'Informe o ID primeiro'} /></div>
        <div><label>Mecânico responsável</label><input value={`${user.name} · ID ${user.id}`} disabled /></div>
      </div>
        {showClientForm && !client && <div className="client-inline-form"><div><label>Nome do novo cliente</label><input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Nome completo do cliente" autoFocus /></div><button type="button" className="button primary" onClick={registerClient} disabled={registeringClient}><Plus size={17} /> {registeringClient ? 'Salvando...' : 'Salvar cliente'}</button><button type="button" className="button ghost" onClick={() => { setShowClientForm(false); setNewClientName('') }}>Cancelar</button></div>}
        <div className="form-grid two top-gap"><ImageUpload label="Imagem do V-Tuning" required value={vtuning} onChange={setVtuning} maxMB={5} /><ImageUpload label="Foto do veículo (opcional)" value={vehicle} onChange={setVehicle} maxMB={5} /></div></div>
      <div className="card"><div className="section-head"><h3>Tuning</h3><button className="button small" onClick={applyFullTuning}>Aplicar Full Tuning · $ {money(prices.fullTuning)}</button></div><div className="option-list">{Object.entries(prices.tuning || {}).map(([name, levels]) => <div className="option-row" key={name}><div><strong>{name}</strong><span>{levels.map((v, i) => `N${i + 1}: $ ${money(v)}`).join(' · ')}</span></div><select value={sel.tuning[name] || ''} onChange={e => setSel(s => ({ ...s, fullTuning: false, tuning: { ...s.tuning, [name]: e.target.value } }))}><option value="">Não aplicar</option>{levels.map((v, i) => <option key={`${name}-${i}`} value={i + 1}>Nível {i + 1} — $ {money(v)}</option>)}</select></div>)}</div></div>
      <div className="card"><h3>Estética</h3><div className="option-list">{(prices.aesthetics || []).map(i => <div className="option-row" key={i.key}><div><strong>{i.label}</strong><span>$ {money(i.price)}</span></div>{qtyField('aesthetics', i.key)}</div>)}</div></div>
      <div className="card"><h3>Blindagem</h3><div className="option-row"><div><strong>Nível de blindagem</strong></div><select value={sel.blindagem} onChange={e => setSel({ ...sel, blindagem: e.target.value })}><option value="">Não aplicar</option>{(prices.blindagem || []).map((v, i) => <option key={`blind-${i}`} value={String(i + 1)}>Nível {i + 1} — $ {money(v)}</option>)}</select></div></div>
      <div className="card"><h3>Itens e serviços</h3><div className="option-list">{(prices.items || []).map(i => <div className="option-row" key={i.key}><div><strong>{i.label}</strong><span>$ {money(i.price)}{i.max ? ` · máximo ${i.max}` : ''}{i.durability ? ` · durabilidade ${i.durability}` : ''}</span></div>{qtyField('items', i.key, i.max)}</div>)}<div className="option-row"><div><strong>Guincho</strong><span>$ {money(prices.towing?.base)} + $ {money(prices.towing?.per2Km)} a cada 2 km</span></div><input className="qty wide-qty" type="number" min="0" value={sel.guinchoKm} onChange={e => setSel({ ...sel, guinchoKm: Number(e.target.value) })} placeholder="km" /></div><div className="option-row"><div><strong>DMV</strong><span>Escolha uma modalidade cadastrada na tabela</span></div><div className="inline-fields"><select value={sel.dmv} onChange={e => setSel({ ...sel, dmv: e.target.value, dmvMaterials: 0 })}><option value="none">Não aplicar</option>{(prices.dmv || []).map(d => <option key={d.key} value={d.key}>{d.label} — $ {money(d.price)}{d.materials ? ' + materiais' : ''}</option>)}</select>{(prices.dmv || []).find(d => String(d.key) === String(sel.dmv))?.materials && <input className="qty wide-qty" type="number" min="0" value={sel.dmvMaterials} onChange={e => setSel({ ...sel, dmvMaterials: Number(e.target.value) })} placeholder="$ materiais" />}</div></div></div></div>
    </div>
      <aside className="card summary-card"><span className="eyebrow">RESUMO</span><h3>Serviço atual</h3>{client && <div className="summary-client"><span>CLIENTE</span><strong>{client.name}</strong><small>#{client.id}</small></div>}{breakdown.rows.length === 0 ? <div className="empty-state">Nenhuma modificação selecionada.</div> : <div className="summary-list">{breakdown.rows.map((r, i) => <div key={i}><span>{r.label}</span><strong>$ {money(r.price)}</strong></div>)}</div>}<div className="summary-total"><span>TOTAL</span><strong>$ {money(breakdown.total)}</strong></div>{clientId.trim() && !client && !searchingClient && <div className="finish-blocked-hint"><AlertTriangle size={15} />Cadastre o cliente para finalizar.</div>}<button className="button primary wide" onClick={finish} disabled={finishing}><CheckCircle2 size={18} /> {finishing ? 'Finalizando...' : 'Finalizar cálculo'}</button></aside>
    </div></>
}

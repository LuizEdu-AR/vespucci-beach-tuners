import { useEffect, useState } from 'react'
import { CalendarDays, Search, Trash2, UserRound, Wrench } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import { ROLE_RANK } from '../../data/seeds'
import { deleteService, subscribeServices } from '../../services/firestore'
const money=v=>Number(v||0).toLocaleString('pt-BR')

export default function HistoryPage(){
 const{user}=useAuth();const{confirm,toast}=useUI();const[history,setHistory]=useState([]);const[q,setQ]=useState('')
 useEffect(()=>subscribeServices(setHistory,(error)=>{console.error(error);toast('Não foi possível carregar o histórico.','error')}),[toast])
 const filtered=history.filter(r=>`${r.clientId} ${r.clientName||''} ${r.mechanic?.name||''} ${r.mechanic?.id||''}`.toLowerCase().includes(q.toLowerCase()))
 const canDelete=(ROLE_RANK[user.role]??-1)>=ROLE_RANK.Gerente
 const remove=async id=>{const ok=await confirm({title:'Excluir registro',message:'Este cálculo será removido definitivamente do histórico.',danger:true,confirmLabel:'Excluir'});if(!ok)return;try{await deleteService(id);toast('Registro removido do histórico.','success')}catch(error){console.error(error);toast('Não foi possível excluir o registro.','error')}}
 return <><div className="page-heading"><div><span className="eyebrow">REGISTROS</span><h1>Histórico de cálculos</h1><p>Modificações, cliente, mecânico e imagens anexadas em cada atendimento finalizado.</p></div></div><div className="searchbar"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por cliente, mecânico ou ID..."/></div>{filtered.length===0?<div className="card empty-state large">Nenhum cálculo encontrado.</div>:<div className="history-list">{filtered.map(record=><article className="card history-card" key={record.id}><div className="history-head"><div><span className="record-code">CLIENTE #{record.clientId}</span>{record.clientName&&<div className="history-client-name">{record.clientName}</div>}<h3>$ {money(record.total)}</h3></div>{canDelete&&<button className="icon-button danger" onClick={()=>remove(record.id)}><Trash2 size={17}/></button>}</div><div className="history-meta"><span><UserRound size={15}/>{record.mechanic?.name} · ID {record.mechanic?.id}</span><span><Wrench size={15}/>{record.mechanic?.role}</span><span><CalendarDays size={15}/>{record.createdAt?new Date(record.createdAt).toLocaleString('pt-BR'):'Agora'}</span></div><div className="history-body"><div><h4>Modificações</h4><div className="mod-list">{(record.modifications||[]).map((m,i)=><div key={i}><span>{m.label}</span><strong>$ {money(m.price)}</strong></div>)}</div></div><div className="history-images">{record.vtuningImage&&<figure><img src={record.vtuningImage} alt="V-Tuning"/><figcaption>V-Tuning</figcaption></figure>}{record.vehicleImage&&<figure><img src={record.vehicleImage} alt="Veículo"/><figcaption>Veículo</figcaption></figure>}</div></div></article>)}</div>}</>
}

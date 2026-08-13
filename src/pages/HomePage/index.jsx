import { useEffect, useState } from 'react'
import { Calculator, ClipboardList, Megaphone, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeNotices, subscribeServices } from '../../services/firestore'

export default function HomePage(){
 const{user}=useAuth();const[historyCount,setHistoryCount]=useState(0);const[noticeCount,setNoticeCount]=useState(0)
 useEffect(()=>subscribeServices(rows=>setHistoryCount(rows.length),console.error),[])
 useEffect(()=>subscribeNotices(rows=>setNoticeCount(rows.length),console.error),[])
 const cards=[['Equipe','Hierarquia e cargos',Users,'/hierarquia'],['Novo cálculo','Montar orçamento',Calculator,'/calculadora'],['Histórico',`${historyCount} cálculo(s) finalizado(s)`,ClipboardList,'/historico'],['Avisos',`${noticeCount} aviso(s) publicado(s)`,Megaphone,'/avisos']]
 return <><div className="page-heading"><div><span className="eyebrow">PAINEL</span><h1>Olá, {user.name.split(' ')[0]}.</h1><p>Gerencie os serviços da Vespucci Beach Tuners em um só lugar.</p></div></div><div className="hero-card"><div><span className="hero-kicker">OFICINA ONLINE</span><h2>Controle rápido, histórico organizado e preços padronizados.</h2><p>Os dados agora são sincronizados pelo Firebase entre os computadores autorizados.</p></div><div className="hero-id"><span>SEU ID</span><strong>#{user.id}</strong><small>{user.role}</small></div></div><div className="dashboard-grid">{cards.map(([title,sub,Icon,to])=><Link className="dash-card" to={to} key={title}><div className="dash-icon"><Icon/></div><div><strong>{title}</strong><span>{sub}</span></div><span className="card-arrow">→</span></Link>)}</div></>
}

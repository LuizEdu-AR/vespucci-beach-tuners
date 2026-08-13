import { NavLink, Outlet } from 'react-router-dom'
import { Calculator, ClipboardList, ContactRound, Gauge, Home, LogOut, Megaphone, Menu, ShieldCheck, Tags, User, Users, X } from 'lucide-react'
import { useState } from 'react'
import logo from '../../assets/vespucci-logo.png'
import { useAuth } from '../../context/AuthContext'
import { UNDEFINED_ROLE } from '../../data/seeds'
import RoleBadge from '../RoleBadge'
import './index.css'

export default function Layout() {
  const { user, logout, isManagerOrAbove } = useAuth()
  const [open, setOpen] = useState(false)
  const undefinedUser = user?.role === UNDEFINED_ROLE
  const links = undefinedUser
    ? [
        { to: '/hierarquia', icon: Users, label: 'Hierarquia' },
        { to: '/precos', icon: Tags, label: 'Tabela de preços' },
        { to: '/perfil', icon: User, label: 'Meu perfil' },
      ]
    : [
        { to: '/', icon: Home, label: 'Início' },
        { to: '/hierarquia', icon: Users, label: 'Hierarquia' },
        { to: '/precos', icon: Tags, label: 'Tabela de preços' },
        { to: '/calculadora', icon: Calculator, label: 'Calcular serviço' },
        { to: '/historico', icon: ClipboardList, label: 'Histórico' },
        ...(isManagerOrAbove ? [{ to: '/clientes', icon: ContactRound, label: 'Clientes' }] : []),
        { to: '/avisos', icon: Megaphone, label: 'Quadro de avisos' },
        { to: '/perfil', icon: User, label: 'Meu perfil' },
      ]

  return (
    <div className="app-shell">
      <button className="mobile-menu" onClick={() => setOpen(true)}><Menu /></button>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <button className="close-menu" onClick={() => setOpen(false)}><X /></button>
        <div className="brand">
          <img src={logo} alt="Vespucci Beach Tuners" />
          <div><strong>Vespucci Beach</strong><span>Tunershop Manager</span></div>
        </div>
        <nav>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={19}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{user?.photo ? <img src={user.photo} alt=""/> : user?.name?.charAt(0)}</div>
          <div className="sidebar-user-info"><strong>{user?.name}</strong><span>ID {user?.id}</span><RoleBadge role={user?.role}/></div>
          <button className="icon-button" onClick={logout} title="Sair"><LogOut size={18}/></button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div><span className="eyebrow"><ShieldCheck size={16}/> SISTEMA INTERNO</span></div>
          <div className="topbar-user"><Gauge size={18}/><span>{user?.name} · #{user?.id}</span></div>
        </header>
        <div className="page-container"><Outlet /></div>
      </main>
    </div>
  )
}

import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { LockKeyhole, UserRound } from 'lucide-react'
import logo from '../../assets/vespucci-logo.png'
import { useAuth } from '../../context/AuthContext'
import { UNDEFINED_ROLE } from '../../data/seeds'

export default function LoginPage(){
  const { user, loading, login } = useAuth(); const navigate = useNavigate()
  const [form,setForm]=useState({id:'',password:''}); const [error,setError]=useState(''); const [busy,setBusy]=useState(false)
  if(loading) return <div className="app-loading">Carregando sistema...</div>
  if(user) return <Navigate to={user.role===UNDEFINED_ROLE?'/hierarquia':'/'} replace/>
  const submit=async(e)=>{e.preventDefault();setError('');setBusy(true);const result=await login(form.id,form.password);setBusy(false);if(!result.ok)setError(result.message);else navigate(result.user.role===UNDEFINED_ROLE?'/hierarquia':'/')}
  return <div className="auth-page"><div className="auth-panel"><img className="auth-logo" src={logo} alt="Vespucci Beach Tuners"/><span className="eyebrow">TUNERSHOP MANAGEMENT</span><h1>Acesso à oficina</h1><p>Entre usando seu ID e sua senha cadastrada.</p><form onSubmit={submit}><label>ID</label><div className="input-icon"><UserRound size={18}/><input value={form.id} onChange={e=>setForm({...form,id:e.target.value})} placeholder="Ex.: 194" required/></div><label>Senha</label><div className="input-icon"><LockKeyhole size={18}/><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Sua senha" required/></div>{error&&<div className="alert error">{error}</div>}<button className="button primary wide" disabled={busy}>{busy?'Entrando...':'Entrar'}</button></form><p className="auth-link">Ainda não possui acesso? <Link to="/cadastro">Criar cadastro</Link></p></div></div>
}

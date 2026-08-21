import { useEffect, useMemo, useState } from 'react'
import { Crown, Pencil, Save, UserMinus, UserPlus, X } from 'lucide-react'
import { ROLE_GROUPS, ROLE_ORDER, ROLE_RANK, UNDEFINED_ROLE } from '../../data/seeds'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import { subscribeUsers, updateUserRole } from '../../services/firestore'
import { fireUser } from '../../services/adminApi'
import RoleBadge from '../../components/RoleBadge'

export default function HierarchyPage(){
  const {user,canManageRole,isManagerOrAbove}=useAuth()
  const {toast,confirm}=useUI()
  const [users,setUsers]=useState([])
  const [editing,setEditing]=useState(null)
  const [role,setRole]=useState('')

  useEffect(()=>subscribeUsers(setUsers,(error)=>{console.error(error);toast('Não foi possível carregar a hierarquia.','error')}),[toast])

  const pending=useMemo(()=>users.filter(u=>(u.role||UNDEFINED_ROLE)===UNDEFINED_ROLE),[users])
  const staff=useMemo(()=>users.filter(u=>(u.role||UNDEFINED_ROLE)!==UNDEFINED_ROLE),[users])
  const start=(person)=>{setEditing(person.id);setRole(person.role===UNDEFINED_ROLE?'Jovem Aprendiz':person.role)}

  const save=async(person)=>{
    if(!isManagerOrAbove)return
    if(person.id===user.uid)return toast('Você não pode alterar o próprio cargo.','warning')
    if(user.role!=='Dev' && ROLE_RANK[role]>=ROLE_RANK[user.role]) return toast('Você só pode atribuir cargos abaixo do seu próprio nível.','warning')
    try{
      await updateUserRole(person.id,role)
      setEditing(null)
      toast(`${person.name} agora está no cargo ${role}.`,'success')
    }catch(error){console.error(error);toast('Não foi possível alterar o cargo. Confira suas permissões.','error')}
  }

  const fire=async(person)=>{
    if(person.id===user.uid)return toast('Você não pode demitir o próprio usuário.','warning')
    if(!canManageRole(person.role))return
    const ok=await confirm({title:'Demitir funcionário',message:`A conta de ${person.name} será excluída e perderá o acesso imediatamente. O histórico de serviços será preservado. Se for readmitido no futuro, precisará se cadastrar novamente.`,danger:true,confirmLabel:'Demitir'})
    if(!ok)return
    try{
      await fireUser(person.id)
      setEditing(null)
      toast(`${person.name} foi demitido. A conta foi excluída e o histórico de serviços foi preservado.`,'success')
    }catch(error){console.error(error);toast('Não foi possível concluir a demissão.','error')}
  }

  const assignableRoles=ROLE_ORDER.filter(r=>r!==UNDEFINED_ROLE&&r!=='Dev'&&(user.role==='Dev'||ROLE_RANK[r]<ROLE_RANK[user.role]))

  const personRow=(person,pendingUser=false,displayRole=null)=><div className="person-row" key={person.id}><div className="person-main"><div className="avatar small">{person.photoURL?<img src={person.photoURL} alt=""/>:person.name?.charAt(0)}</div><div><strong>{person.name}</strong><span>ID {person.rpId}{person.contactRP?` · ${pendingUser?'Contato ':''}${person.contactRP}`:''}</span></div></div>{editing===person.id?<div className="role-edit"><select value={role} onChange={e=>setRole(e.target.value)}>{assignableRoles.map(r=><option key={r}>{r}</option>)}</select><button className="icon-button success" onClick={()=>save(person)} title="Salvar cargo"><Save size={17}/></button><button className="icon-button" onClick={()=>setEditing(null)}><X size={17}/></button></div>:pendingUser?<button className="button small" onClick={()=>start(person)}><UserPlus size={16}/> Atribuir cargo</button>:<div className="person-actions"><RoleBadge role={displayRole||person.role}/>{person.id!==user.uid&&canManageRole(person.role)&&<><button className="icon-button" onClick={()=>start(person)} title="Alterar cargo"><Pencil size={16}/></button><button className="icon-button danger" onClick={()=>fire(person)} title="Demitir funcionário"><UserMinus size={16}/></button></>}</div>}</div>

  return <>
    <div className="page-heading"><div><span className="eyebrow">EQUIPE</span><h1>Hierarquia</h1><p>O gerenciamento de cargos segue a hierarquia da organização.</p></div></div>

    {isManagerOrAbove&&pending.length>0&&<section className="card pending-staff-card"><div className="section-head"><div><span className="eyebrow">ADMINISTRAÇÃO</span><h3>Cadastros aguardando cargo</h3></div><span className="pending-count">{pending.length}</span></div><p className="muted-copy">Estes usuários têm cadastro ativo, mas não aparecem na hierarquia até receberem um cargo.</p><div className="pending-list">{pending.map(person=>personRow(person,true))}</div></section>}

    <div className="hierarchy-grid">{ROLE_GROUPS.map(group=>{const people=staff.filter(p=>p.role===group||p.secondaryRole===group);return <section className="role-section" key={group}><div className="role-section-title"><div><Crown size={17}/><strong>{group==='Dono'?'PROPRIETÁRIOS':group.toUpperCase()}</strong></div><span>{people.length}</span></div>{people.length===0?<div className="vacant">• (Vago)</div>:people.map(person=>personRow(person,false,group))}</section>})}</div>
  </>
}

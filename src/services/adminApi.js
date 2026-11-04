import { auth } from './firebase'

export async function fireUser(uid) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Sua sessão expirou. Entre novamente.')

  const token = await currentUser.getIdToken()
  const response = await fetch('/api/fire-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ uid }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a demissão.')
  return data
}

export async function resetEmployeePassword(uid, password) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Sua sessão expirou. Entre novamente.')
  const token = await currentUser.getIdToken()
  const response = await fetch('/api/reset-user-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ uid, password }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Não foi possível redefinir a senha.')
  return data
}

export async function updateMyOperationalRole(secondaryRole) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Sua sessão expirou. Entre novamente.')
  const token = await currentUser.getIdToken()
  const response = await fetch('/api/update-operational-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ secondaryRole }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Não foi possível alterar o cargo operacional.')
  return data
}

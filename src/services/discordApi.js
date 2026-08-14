import { auth } from './firebase'

export async function sendServiceToDiscord(service) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Usuário não autenticado.')

  const token = await currentUser.getIdToken()
  const response = await fetch('/api/discord-service', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(service),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o serviço para o Discord.')
  return data
}

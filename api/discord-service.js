import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length) return getApps()[0]

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin não configurado no servidor.')
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

const money = (value) => Number(value || 0).toLocaleString('pt-BR')
const safeText = (value, fallback = 'Não informado') => String(value || fallback).slice(0, 1000)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const webhookUrl = process.env.DISCORD_SERVICES_WEBHOOK_URL
    if (!webhookUrl) throw new Error('Webhook do Discord não configurado no servidor.')

    const authorization = req.headers.authorization || ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Sessão não informada.' })

    const app = getAdminApp()
    const adminAuth = getAuth(app)
    const adminDb = getFirestore(app)
    const decoded = await adminAuth.verifyIdToken(token)

    const profileSnap = await adminDb.collection('users').doc(decoded.uid).get()
    if (!profileSnap.exists) return res.status(403).json({ error: 'Perfil do usuário não encontrado.' })

    const profile = profileSnap.data()
    if (profile.active === false) return res.status(403).json({ error: 'Usuário sem acesso ao sistema.' })

    const { serviceId, clientId, clientName, modifications, total, vtuningImage, vehicleImage } = req.body || {}
    if (!clientId || !Array.isArray(modifications) || !modifications.length) {
      return res.status(400).json({ error: 'Dados do serviço incompletos.' })
    }

    const modificationsText = modifications
      .map((item) => `• ${safeText(item?.label, 'Serviço')} — $ ${money(item?.price)}`)
      .join('\n')
      .slice(0, 4000)

    const embed = {
      title: '🔧 Serviço finalizado',
      color: 0x00bde7,
      fields: [
        { name: '👤 Cliente', value: `${safeText(clientName)} — ID ${safeText(clientId)}`, inline: false },
        { name: '🔩 Mecânico', value: `${safeText(profile.name)} — ID ${safeText(profile.rpId)} · ${safeText(profile.role)}`, inline: false },
        { name: '🛠️ Modificações', value: modificationsText || 'Nenhuma modificação informada.', inline: false },
        { name: '💰 Valor total', value: `$ ${money(total)}`, inline: false },
      ],
      footer: { text: serviceId ? `Vespucci Beach Tuners • Serviço ${serviceId}` : 'Vespucci Beach Tuners • Registro de serviço' },
      timestamp: new Date().toISOString(),
    }

    if (vtuningImage) embed.image = { url: String(vtuningImage) }

    const embeds = [embed]
    if (vehicleImage) {
      embeds.push({
        title: '🚗 Foto do veículo',
        color: 0x00bde7,
        image: { url: String(vehicleImage) },
      })
    }

    const discordResponse = await fetch(`${webhookUrl}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Vespucci Beach Tuners',
        allowed_mentions: { parse: [] },
        embeds,
      }),
    })

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text()
      console.error('Discord recusou o envio:', discordResponse.status, errorText)
      return res.status(502).json({ error: 'Discord recusou o envio da mensagem.' })
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Erro ao enviar serviço para Discord:', error)
    return res.status(500).json({ error: 'Não foi possível enviar o serviço para o Discord.' })
  }
}

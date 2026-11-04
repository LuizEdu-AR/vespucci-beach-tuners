import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const OPERATIONAL_ROLES = new Set([
  'Jovem Aprendiz', 'Estagiário', 'Mecânico', 'Mecânico Sênior',
  'Supervisor', 'Gerente',
])

function getAdminApp() {
  if (getApps().length) return getApps()[0]
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase Admin não configurado.')
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }
  try {
    const authorization = req.headers.authorization || ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Sessão não informada.' })
    const secondaryRole = req.body?.secondaryRole
    if (!OPERATIONAL_ROLES.has(secondaryRole)) {
      return res.status(400).json({ error: 'Cargo operacional inválido.' })
    }
    const app = getAdminApp()
    const decoded = await getAuth(app).verifyIdToken(token, true)
    const ref = getFirestore(app).collection('users').doc(decoded.uid)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.active === false || snap.data()?.role !== 'Dev') {
      return res.status(403).json({ error: 'Somente o próprio usuário Dev pode alterar seu cargo operacional por esta opção.' })
    }
    await ref.update({ secondaryRole })
    return res.status(200).json({ ok: true, secondaryRole })
  } catch (error) {
    console.error('Falha ao atualizar cargo operacional:', error?.code || error?.message)
    return res.status(500).json({ error: 'Não foi possível atualizar o cargo operacional.' })
  }
}

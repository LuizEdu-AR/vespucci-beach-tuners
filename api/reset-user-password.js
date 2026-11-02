import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function adminApp() {
  if (getApps().length) return getApps()[0]
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase Admin não configurado.')
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

const validPassword = value => typeof value === 'string' &&
  value.length >= 8 && value.length <= 128 &&
  /[A-Z]/.test(value) && /[a-z]/.test(value) &&
  /\d/.test(value) && /[^A-Za-z0-9]/.test(value)

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
    const app = adminApp()
    const auth = getAuth(app)
    const db = getFirestore(app)
    const decoded = await auth.verifyIdToken(token, true)
    const callerSnap = await db.collection('users').doc(decoded.uid).get()
    if (!callerSnap.exists || callerSnap.data()?.active === false ||
        !['Dono', 'Dev'].includes(callerSnap.data()?.role)) {
      return res.status(403).json({ error: 'Somente Dono e Dev podem redefinir senhas.' })
    }
    const uid = typeof req.body?.uid === 'string' ? req.body.uid.trim() : ''
    const password = req.body?.password
    if (!uid || uid.length > 128) return res.status(400).json({ error: 'Funcionário inválido.' })
    if (uid === decoded.uid) return res.status(400).json({ error: 'Altere sua própria senha em Meu perfil.' })
    if (!validPassword(password)) return res.status(400).json({ error: 'A senha não atende aos requisitos de segurança.' })
    const targetSnap = await db.collection('users').doc(uid).get()
    if (!targetSnap.exists || targetSnap.data()?.active === false) {
      return res.status(404).json({ error: 'Funcionário não encontrado ou inativo.' })
    }
    // Um Dono não pode alterar a senha de outro Dono ou de um Dev.
    if (callerSnap.data().role === 'Dono' && ['Dono', 'Dev'].includes(targetSnap.data().role)) {
      return res.status(403).json({ error: 'Você só pode redefinir senhas de cargos inferiores.' })
    }
    await auth.updateUser(uid, { password })
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Erro ao redefinir senha:', error?.code || error?.message)
    if (error?.code === 'auth/user-not-found') return res.status(404).json({ error: 'Conta de autenticação não encontrada.' })
    return res.status(500).json({ error: 'Não foi possível redefinir a senha.' })
  }
}

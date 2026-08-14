import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const ROLE_RANK = {
  'Cargo indefinido': 0,
  'Jovem Aprendiz': 1,
  'Estagiário': 2,
  'Mecânico': 3,
  'Mecânico Sênior': 4,
  'Supervisor': 5,
  'Gerente': 6,
  'Diretor': 7,
  'Dono': 8,
  'Dev': 9,
}

function getAdminApp() {
  if (getApps().length) return getApps()[0]

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin não configurado no servidor.')
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const authorization = req.headers.authorization || ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Sessão não informada.' })

    const app = getAdminApp()
    const adminAuth = getAuth(app)
    const adminDb = getFirestore(app)
    const decoded = await adminAuth.verifyIdToken(token)
    const callerUid = decoded.uid
    const targetUid = String(req.body?.uid || '').trim()

    if (!targetUid) return res.status(400).json({ error: 'Funcionário não informado.' })
    if (targetUid === callerUid) return res.status(400).json({ error: 'Você não pode demitir o próprio usuário.' })

    const [callerSnap, targetSnap] = await Promise.all([
      adminDb.collection('users').doc(callerUid).get(),
      adminDb.collection('users').doc(targetUid).get(),
    ])

    if (!callerSnap.exists) return res.status(403).json({ error: 'Perfil do administrador não encontrado.' })
    if (!targetSnap.exists) return res.status(404).json({ error: 'Funcionário não encontrado.' })

    const caller = callerSnap.data()
    const target = targetSnap.data()
    const callerRank = ROLE_RANK[caller.role] ?? 0
    const targetRank = ROLE_RANK[target.role] ?? 0

    if (callerRank < ROLE_RANK.Gerente) {
      return res.status(403).json({ error: 'Somente Gerente ou superior pode demitir funcionários.' })
    }
    if (caller.role !== 'Dev' && callerRank <= targetRank) {
      return res.status(403).json({ error: 'Você só pode demitir funcionários abaixo do seu próprio cargo.' })
    }

    // Primeiro remove o acesso ao Firebase Authentication.
    // Se a conta já não existir no Auth, seguimos para limpar o perfil do Firestore.
    try {
      await adminAuth.deleteUser(targetUid)
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error
    }

    // Remove somente o perfil atual. Serviços/histórico NÃO são apagados:
    // os registros de /services permanecem com os dados do mecânico gravados no serviço.
    await adminDb.collection('users').doc(targetUid).delete()

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Erro ao demitir funcionário:', error)
    return res.status(500).json({ error: 'Não foi possível concluir a demissão.' })
  }
}

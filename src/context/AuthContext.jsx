import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { ROLE_RANK, UNDEFINED_ROLE } from '../data/seeds'
import { auth, db } from '../services/firebase'

const AuthContext = createContext(null)
const internalEmail = (id) => `${String(id).trim()}@vespucci.local`

function profileToUser(uid, data) {
  return {
    uid,
    id: String(data.rpId || ''),
    name: data.name || 'Usuário',
    role: data.role || UNDEFINED_ROLE,
    photo: data.photoURL || '',
    contactRP: data.contactRP || '',
    active: data.active !== false,
  }
}

function friendlyAuthError(error) {
  const code = error?.code || ''
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code)) return 'ID ou senha inválidos.'
  if (code === 'auth/email-already-in-use') return 'Este ID já está cadastrado.'
  if (code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  if (code === 'auth/network-request-failed') return 'Falha de conexão. Verifique sua internet.'
  if (code === 'auth/requires-recent-login') return 'Por segurança, saia e entre novamente antes de alterar a senha.'
  return error?.message || 'Não foi possível concluir a operação.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribeProfile = null
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeProfile?.()
      unsubscribeProfile = null
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }
      unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (snap) => {
        if (!snap.exists()) {
          await signOut(auth)
          setUser(null)
        } else {
          setUser(profileToUser(firebaseUser.uid, snap.data()))
        }
        setLoading(false)
      }, (error) => {
        console.error(error)
        setUser(null)
        setLoading(false)
      })
    })
    return () => {
      unsubscribeProfile?.()
      unsubscribeAuth()
    }
  }, [])

  const login = async (id, password) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, internalEmail(id), password)
      const snap = await getDoc(doc(db, 'users', credential.user.uid))
      if (!snap.exists()) {
        await signOut(auth)
        return { ok: false, message: 'Seu perfil ainda não existe no banco de dados.' }
      }
      const session = profileToUser(credential.user.uid, snap.data())
      setUser(session)
      return { ok: true, user: session }
    } catch (error) {
      return { ok: false, message: friendlyAuthError(error) }
    }
  }

  const register = async ({ id, name, password, photo, contactRP }) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, internalEmail(id), password)
      await setDoc(doc(db, 'users', credential.user.uid), {
        rpId: String(id).trim(),
        name: name.trim(),
        role: UNDEFINED_ROLE,
        contactRP: contactRP.trim(),
        photoURL: photo || '',
        active: true,
        createdAt: serverTimestamp(),
      })
      await signOut(auth)
      setUser(null)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: friendlyAuthError(error) }
    }
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  const updateProfile = async (changes) => {
    if (!auth.currentUser || !user) return { ok: false, message: 'Sessão inválida.' }
    try {
      const profileChanges = {}
      if (changes.name !== undefined) profileChanges.name = changes.name.trim()
      if (changes.photo !== undefined) profileChanges.photoURL = changes.photo || ''
      if (changes.contactRP !== undefined) profileChanges.contactRP = changes.contactRP.trim()
      if (changes.password) await updatePassword(auth.currentUser, changes.password)
      if (Object.keys(profileChanges).length) await updateDoc(doc(db, 'users', user.uid), profileChanges)
      const updated = { ...user, name: profileChanges.name ?? user.name, photo: profileChanges.photoURL ?? user.photo, contactRP: profileChanges.contactRP ?? user.contactRP }
      setUser(updated)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: friendlyAuthError(error) }
    }
  }

  const isManagerOrAbove = !!user && (ROLE_RANK[user.role] ?? -1) >= ROLE_RANK.Gerente
  const canEditPrices = !!user && (user.role === 'Dev' || (ROLE_RANK[user.role] ?? -1) >= ROLE_RANK.Diretor)
  const canManageRole = (targetRole) => {
    if (!user || !isManagerOrAbove) return false
    const ownRank = ROLE_RANK[user.role] ?? -1
    const targetRank = ROLE_RANK[targetRole] ?? ROLE_RANK[UNDEFINED_ROLE]
    return user.role === 'Dev' || ownRank > targetRank
  }

  const value = useMemo(() => ({
    user, loading, login, register, logout, updateProfile, canManageRole,
    canPublishNotice: isManagerOrAbove, isManagerOrAbove, canEditPrices,
  }), [user, loading, isManagerOrAbove, canEditPrices])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

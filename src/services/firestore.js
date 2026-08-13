import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { PRICE_TABLE } from '../data/seeds'

const clone = (value) => JSON.parse(JSON.stringify(value))
const toIso = (value) => value?.toDate ? value.toDate().toISOString() : value || null
const fromSnap = (snap) => ({ id: snap.id, ...snap.data(), createdAt: toIso(snap.data()?.createdAt) })

export function subscribeUsers(callback, onError) {
  return onSnapshot(collection(db, 'users'), (snap) => callback(snap.docs.map(fromSnap)), onError)
}

export async function updateUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role })
}

export async function getClientById(id) {
  if (!id) return null
  const snap = await getDoc(doc(db, 'clients', String(id)))
  return snap.exists() ? fromSnap(snap) : null
}

export async function createClient({ id, name, createdBy }) {
  await setDoc(doc(db, 'clients', String(id)), {
    clientId: String(id),
    name: name.trim(),
    createdBy,
    createdAt: serverTimestamp(),
  })
}

export function subscribeClients(callback, onError) {
  return onSnapshot(collection(db, 'clients'), (snap) => callback(snap.docs.map(fromSnap)), onError)
}

export async function createService(record) {
  const ref = await addDoc(collection(db, 'services'), { ...record, createdAt: serverTimestamp() })
  return ref.id
}

export function subscribeServices(callback, onError) {
  return onSnapshot(collection(db, 'services'), (snap) => {
    const rows = snap.docs.map(fromSnap).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    callback(rows)
  }, onError)
}

export async function deleteService(id) {
  await deleteDoc(doc(db, 'services', id))
}

export function subscribeNotices(callback, onError) {
  return onSnapshot(collection(db, 'notices'), (snap) => {
    const rows = snap.docs.map(fromSnap).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    callback(rows)
  }, onError)
}

export async function createNotice(notice) {
  await addDoc(collection(db, 'notices'), { ...notice, createdAt: serverTimestamp() })
}

export async function deleteNotice(id) {
  await deleteDoc(doc(db, 'notices', id))
}

export function subscribePriceTable(callback, onError) {
  return onSnapshot(doc(db, 'prices', 'config'), (snap) => {
    callback(snap.exists() ? snap.data() : clone(PRICE_TABLE), snap.exists())
  }, onError)
}

export async function savePriceTable(table) {
  await setDoc(doc(db, 'prices', 'config'), clone(table))
}

export async function ensurePriceTable() {
  const ref = doc(db, 'prices', 'config')
  const snap = await getDoc(ref)
  if (!snap.exists()) await setDoc(ref, clone(PRICE_TABLE))
}

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const RETENTION_DAYS = 21
const SERVICE_TAG = 'vespucci-service'
const CLOUDINARY_PAGE_SIZE = 500
const DELETE_BATCH_SIZE = 100
const FIRESTORE_BATCH_SIZE = 400

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

function getCloudinaryConfig() {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.VITE_CLOUDINARY_CLOUD_NAME

  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Credenciais administrativas do Cloudinary não configuradas.')
  }

  return { cloudName, apiKey, apiSecret }
}

function basicAuth(apiKey, apiSecret) {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`
}

async function listTaggedAssets({ cloudName, apiKey, apiSecret }) {
  const assets = []
  let nextCursor = ''

  do {
    const params = new URLSearchParams({
      max_results: String(CLOUDINARY_PAGE_SIZE),
    })

    if (nextCursor) {
      params.set('next_cursor', nextCursor)
    }

    const url =
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}` +
      `/resources/image/tags/${encodeURIComponent(SERVICE_TAG)}?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        Authorization: basicAuth(apiKey, apiSecret),
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        `Cloudinary recusou a listagem dos assets (${response.status}).`
      )
    }

    assets.push(...(data.resources || []))
    nextCursor = data.next_cursor || ''
  } while (nextCursor)

  return assets
}

async function deleteCloudinaryAssets(config, publicIds) {
  const deleted = new Set()
  const failed = []

  for (let index = 0; index < publicIds.length; index += DELETE_BATCH_SIZE) {
    const chunk = publicIds.slice(index, index + DELETE_BATCH_SIZE)
    const body = new URLSearchParams()

    chunk.forEach((publicId) => body.append('public_ids[]', publicId))
    body.set('invalidate', 'true')

    const url =
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}` +
      '/resources/image/upload'

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: basicAuth(config.apiKey, config.apiSecret),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      failed.push(...chunk)
      console.error(
        'Cloudinary recusou exclusão em lote:',
        response.status,
        data
      )
      continue
    }

    const deletedMap = data.deleted || {}

    chunk.forEach((publicId) => {
      const status = deletedMap[publicId]

      if (status === 'deleted' || status === 'not_found') {
        deleted.add(publicId)
      } else {
        failed.push(publicId)
      }
    })
  }

  return { deleted, failed }
}

async function clearExpiredServiceImages(adminDb, cutoffDate) {
  const snapshot = await adminDb
    .collection('services')
    .where('createdAt', '<=', cutoffDate)
    .get()

  let updated = 0
  let batch = adminDb.batch()
  let batchWrites = 0

  const commitBatch = async () => {
    if (!batchWrites) return
    await batch.commit()
    batch = adminDb.batch()
    batchWrites = 0
  }

  for (const serviceDoc of snapshot.docs) {
    const data = serviceDoc.data()
    const updates = {}

    if (
      data.vtuningImage ||
      data.vtuningPublicId ||
      data.vtuningAssetId
    ) {
      updates.vtuningImage = FieldValue.delete()
      updates.vtuningPublicId = FieldValue.delete()
      updates.vtuningAssetId = FieldValue.delete()
      updates.vtuningExpiredAt = FieldValue.serverTimestamp()
    }

    if (
      data.vehicleImage ||
      data.vehiclePublicId ||
      data.vehicleAssetId
    ) {
      updates.vehicleImage = FieldValue.delete()
      updates.vehiclePublicId = FieldValue.delete()
      updates.vehicleAssetId = FieldValue.delete()
      updates.vehicleExpiredAt = FieldValue.serverTimestamp()
    }

    if (!Object.keys(updates).length) continue

    batch.update(serviceDoc.ref, updates)
    batchWrites += 1
    updated += 1

    if (batchWrites >= FIRESTORE_BATCH_SIZE) {
      await commitBatch()
    }
  }

  await commitBatch()

  return updated
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      throw new Error('CRON_SECRET não configurado no servidor.')
    }

    const authorization = req.headers.authorization || ''

    if (authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Não autorizado.' })
    }

    const cutoffDate = new Date(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    )

    const cloudinary = getCloudinaryConfig()
    const assets = await listTaggedAssets(cloudinary)

    const expiredAssets = assets.filter((asset) => {
      const createdAt = new Date(asset.created_at)
      return (
        asset.public_id &&
        !Number.isNaN(createdAt.getTime()) &&
        createdAt <= cutoffDate
      )
    })

    const publicIds = expiredAssets.map((asset) => asset.public_id)

    const { deleted, failed } =
      await deleteCloudinaryAssets(cloudinary, publicIds)

    const adminDb = getFirestore(getAdminApp())
    const firestoreUpdated =
      await clearExpiredServiceImages(adminDb, cutoffDate)

    return res.status(200).json({
      ok: true,
      retentionDays: RETENTION_DAYS,
      cutoff: cutoffDate.toISOString(),
      taggedAssetsChecked: assets.length,
      expiredAssetsFound: publicIds.length,
      deletedFromCloudinary: deleted.size,
      cloudinaryDeleteFailures: failed.length,
      firestoreServicesUpdated: firestoreUpdated,
    })
  } catch (error) {
    console.error('Erro na limpeza automática de imagens:', error)
    return res.status(500).json({
      error: 'Não foi possível concluir a limpeza automática de imagens.',
    })
  }
}

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadImage(file, options = {}) {
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary não configurado. Confira o .env.local.')
  }

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', uploadPreset)

  if (options.folder) {
    form.append('folder', options.folder)
  }

  if (Array.isArray(options.tags) && options.tags.length) {
    form.append('tags', options.tags.join(','))
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Falha ao enviar imagem para o Cloudinary.')
  }

  return {
    url: data.secure_url,
    publicId: data.public_id,
    assetId: data.asset_id,
    createdAt: data.created_at || new Date().toISOString(),
  }
}

import { ImagePlus, LoaderCircle, ClipboardPaste, X } from 'lucide-react'
import { useState } from 'react'
import { useUI } from '../../context/UIContext'
import { uploadImage } from '../../services/cloudinary'

export default function ImageUpload({
  label,
  value,
  onChange,
  required = false,
  maxMB = 5
}) {
  const { toast } = useUI()
  const [uploading, setUploading] = useState(false)

  const processFile = async (file) => {
    if (!file || uploading) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Use uma imagem JPG, PNG ou WebP.', 'warning')
      return
    }

    if (file.size > maxMB * 1024 * 1024) {
      toast(`Use uma imagem de até ${maxMB} MB.`, 'warning')
      return
    }

    try {
      setUploading(true)

      const { url } = await uploadImage(file)

      onChange(url)

      toast('Imagem enviada com sucesso.', 'success')
    } catch (error) {
      console.error(error)

      toast(
        error.message || 'Não foi possível enviar a imagem.',
        'error'
      )
    } finally {
      setUploading(false)
    }
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]

    await processFile(file)

    event.target.value = ''
  }

  const handlePaste = async (event) => {
    if (uploading) return

    const items = Array.from(
      event.clipboardData?.items || []
    )

    const imageItem = items.find(
      (item) => item.type.startsWith('image/')
    )

    if (!imageItem) {
      toast(
        'A área de transferência não contém uma imagem.',
        'warning'
      )
      return
    }

    const file = imageItem.getAsFile()

    if (!file) {
      toast(
        'Não foi possível ler a imagem copiada.',
        'error'
      )
      return
    }

    event.preventDefault()

    await processFile(file)
  }

  return (
    <div className="image-upload">
      <label>
        {label}
        {required ? ' *' : ''}
      </label>

      {value ? (
        <div className="image-preview">
          <img src={value} alt={label} />

          <button
            type="button"
            className="icon-button danger"
            onClick={() => onChange('')}
            aria-label="Remover imagem"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div
          className={`upload-box ${uploading ? 'uploading' : ''}`}
          tabIndex={0}
          onPaste={handlePaste}
          title="Clique nesta área e pressione Ctrl+V para colar uma imagem"
        >
          {uploading ? (
            <LoaderCircle
              className="spin"
              size={26}
            />
          ) : (
            <ImagePlus size={26} />
          )}

          <span>
            {uploading
              ? 'Enviando...'
              : ''}
          </span>

          <small>
            JPG/PNG/WebP, até {maxMB} MB
          </small>

          {!uploading && (
            <small>
              <ClipboardPaste
                size={13}
                style={{
                  verticalAlign: 'middle',
                  marginRight: 4
                }}
              />
              Clique aqui e pressione Ctrl+V
            </small>
          )}

          <label
            className="button small"
            style={{ marginTop: 8 }}
          >
            Escolher arquivo

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              disabled={uploading}
              hidden
            />
          </label>
        </div>
      )}
    </div>
  )
}
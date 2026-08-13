import { ImagePlus, LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'
import { useUI } from '../../context/UIContext'
import { uploadImage } from '../../services/cloudinary'

export default function ImageUpload({ label, value, onChange, required = false, maxMB = 5 }) {
  const { toast } = useUI()
  const [uploading, setUploading] = useState(false)

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Use uma imagem JPG, PNG ou WebP.', 'warning')
      event.target.value = ''
      return
    }
    if (file.size > maxMB * 1024 * 1024) {
      toast(`Use uma imagem de até ${maxMB} MB.`, 'warning')
      event.target.value = ''
      return
    }
    try {
      setUploading(true)
      const { url } = await uploadImage(file)
      onChange(url)
      toast('Imagem enviada com sucesso.', 'success')
    } catch (error) {
      console.error(error)
      toast(error.message || 'Não foi possível enviar a imagem.', 'error')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return <div className="image-upload">
    <label>{label}{required ? ' *' : ''}</label>
    {value ? <div className="image-preview"><img src={value} alt={label}/><button type="button" className="icon-button danger" onClick={() => onChange('')} aria-label="Remover imagem"><X size={18}/></button></div> :
      <label className={`upload-box ${uploading ? 'uploading' : ''}`}>
        {uploading ? <LoaderCircle className="spin" size={26}/> : <ImagePlus size={26}/>}<span>{uploading ? 'Enviando...' : 'Selecionar imagem'}</span><small>JPG/PNG/WebP, até {maxMB} MB</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={uploading} hidden/>
      </label>}
  </div>
}

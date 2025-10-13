import React, { useState, useEffect, useMemo, useRef } from 'react'
import api from '../../../Api'
import locationsRaw from '../../../data/locations.json'
import { buildImageUrl } from '../../../utils/imageUtils'
import { getBrazilDate } from '../../../../helpers/getBrazilDate'
import { motion, AnimatePresence } from 'framer-motion';

// Componente Locais — exibe 2 colunas:
//  - Visualizar Meus Locais (com botão cancelar assinatura / deletar local / editar)
//  - Adicionar Local (form)
// Requisito: antes de publicar TODOS os valores do formulário são obrigatórios

const useMock = false // mude para `true` para testar sem backend

const initialForm = {
  localId: null,
  localName: '',
  localDescricao: '',
  link: '',
  localType: 'outros',
  country: '',
  countryCode: '',
  state: '',
  city: '',
  // form.image pode ser um File (arquivo novo) ou uma string (imageUrl existente)
  image: null,
}

const tiposPermitidos = [
  'clinica-de-fisioterapia',
  'academia',
  'consultorio-de-nutricionista',
  'loja',
  'outros'
]

const Locais = ({ user = {}, tema = 'light' }) => {
  const [meusLocais, setMeusLocais] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [editing, setEditing] = useState(false)
  // quando abrimos para editar, por padrão vamos SALVAR COMO NOVO para evitar sobrescrever o original
  const [saveAsNew, setSaveAsNew] = useState(false)
  const [editingSourceId, setEditingSourceId] = useState(null)

  // controlamos se o usuário quer substituir a imagem existente (apenas para edição)
  const [replaceImage, setReplaceImage] = useState(false)

  // preview da imagem: pode ser uma URL remota (local.imageUrl) ou um blob criado por createObjectURL
  const [imagePreview, setImagePreview] = useState(null)

  const fileInputRef = useRef(null)

  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // lista de países do JSON
  const countries = useMemo(() => (locationsRaw?.countries || []), [])

  // estados baseados no country selecionado
  const states = useMemo(() => {
    if (!form.country) return []
    const byCountry = locationsRaw?.byCountry?.[form.country]
    return byCountry?.states || []
  }, [form.country])

  // cidades baseadas no state selecionado
  const cities = useMemo(() => {
    if (!form.country || !form.state) return []
    const citiesByState = locationsRaw?.byCountry?.[form.country]?.citiesByState || {}
    return citiesByState[form.state] || []
  }, [form.country, form.state])

  useEffect(() => {
    fetchMeusLocais()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // cleanup de object URLs para evitar vazamento de memória
  useEffect(() => {
    return () => {
      if (imagePreview && typeof imagePreview === 'string' && imagePreview.startsWith('blob:')) {
        try { URL.revokeObjectURL(imagePreview) } catch (e) { /* ignore */ }
      }
    }
  }, [imagePreview])

  // ------------------ helpers de mock ------------------
  const simulateDelay = (ms = 700) => new Promise(res => setTimeout(res, ms))

  const fetchMeusLocais = async () => {
    setLoading(true)
    setError(null)
    try {
      if (useMock) {
        await simulateDelay()
        const mock = (window.__MOCK_LOCAIS__ = window.__MOCK_LOCAIS__ || [
          {
            localId: 'mock-1',
            localName: 'Academia Central',
            localType: 'academia',
            status: 'active',
            subscriptionId: 'sub_mock_1',
            link: 'https://example.com/academia',
            country: 'Brazil',
            countryCode: 'BR',
            state: 'São Paulo',
            city: 'São Paulo',
            imageUrl: null,
            estatisticas: { impressoes: 1200, cliques: 85 },
            userId: user?.id || user?._id || 'user-mock'
          }
        ])
        const uid = user?.id || user?._id
        setMeusLocais(uid ? mock.filter(l => l.userId === uid) : mock)
      } else {
        const res = await api.get('/locais', { params: { userId: user?.id || user?._id } })
        const payload = res.data
        if (payload && typeof payload === 'object') {
          if (payload.success && payload.data && Array.isArray(payload.data.items)) {
            setMeusLocais(payload.data.items)
          } else if (Array.isArray(payload.items)) {
            setMeusLocais(payload.items)
          } else if (Array.isArray(payload)) {
            setMeusLocais(payload)
          } else {
            setMeusLocais([])
          }
        } else {
          setMeusLocais([])
        }
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar seus locais')
      setMeusLocais([])
    } finally {
      setLoading(false)
    }
  }

  // ------------------ deletar / cancelar ------------------
  const handleDeletarLocal = async (localId) => {
    const ok = window.confirm('Tem certeza que deseja deletar este local? A ação é irreversível.')
    if (!ok) return
    try {
      const before = meusLocais
      setMeusLocais(prev => prev.filter(l => l.localId !== localId))
      if (useMock) {
        await simulateDelay()
        window.__MOCK_LOCAIS__ = (window.__MOCK_LOCAIS__ || []).filter(l => l.localId !== localId)
      } else {
        await api.post('/deletar-local', { localId, userId: user?.id || user?._id })
      }
    } catch (err) {
      console.error(err)
      setError('Não foi possível deletar o local.')
      fetchMeusLocais()
    }
  }

  // ------------------ adicionar / editar local ------------------
  const openForEdit = (local) => {
    // preenche o formulário com os dados do local selecionado
    // form.image recebe a imageUrl (string) — não tentamos preencher o <input type="file" /> porque não é permitido
    setForm({
      localId: saveAsNew ? null : (local.localId || null),
      localName: local.localName || '',
      localDescricao: local.localDescricao || '',
      link: local.link || '',
      localType: local.localType || 'outros',
      country: local.country || '',
      countryCode: local.countryCode || '',
      state: local.state || '',
      city: local.city || '',
      image: local.imageUrl || null,
    })

    // mostre o preview da url existente
    setImagePreview(local.imageUrl || null)

    // resetamos flags de substituição de imagem
    setReplaceImage(false)

    setFieldErrors({})
    setEditing(true)
    setEditingSourceId(local.localId || null)
    // por padrão, ao abrir via editar, queremos evitar sobrescrever — força checkbox ligado
    setSaveAsNew(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    // revoke de qualquer blob criado localmente
    if (imagePreview && typeof imagePreview === 'string' && imagePreview.startsWith('blob:')) {
      try { URL.revokeObjectURL(imagePreview) } catch (e) { /* ignore */ }
    }

    setForm(initialForm)
    setEditing(false)
    setError(null)
    setFieldErrors({})
    setSaveAsNew(false)
    setEditingSourceId(null)
    setImagePreview(null)
    setReplaceImage(false)
    if (fileInputRef.current) fileInputRef.current.value = null
  }

  const handleChange = (key, value) => {
    if (key === 'country') {
      const code = (locationsRaw?.countries || []).find(c => c.name === value)?.code || ''
      setForm(f => ({ ...f, country: value, countryCode: code, state: '', city: '' }))
      setFieldErrors(fe => ({ ...fe, country: undefined, countryCode: undefined, state: undefined, city: undefined }))
      return
    }
    if (key === 'state') {
      setForm(f => ({ ...f, state: value, city: '' }))
      setFieldErrors(fe => ({ ...fe, state: undefined, city: undefined }))
      return
    }
    setForm(f => ({ ...f, [key]: value }))
    setFieldErrors(fe => ({ ...fe, [key]: undefined }))
  }

  const handleFile = (file) => {
    // revoke previous blob preview se existia
    if (imagePreview && typeof imagePreview === 'string' && imagePreview.startsWith('blob:')) {
      try { URL.revokeObjectURL(imagePreview) } catch (e) { /* ignore */ }
    }

    // quando o usuário seleciona um arquivo novo, sobrescrevemos form.image com o File
    setForm(f => ({ ...f, image: file }))

    if (!file) {
      setImagePreview(null)
      setFieldErrors(fe => ({ ...fe, image: undefined }))
      return
    }

    // cria um preview temporário
    if (file instanceof File) {
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    } else {
      setImagePreview(null)
    }

    setFieldErrors(fe => ({ ...fe, image: undefined }))
  }

  const isImageFile = (file) => {
    if (!file) return false
    // se for string (imageUrl), consideramos válido aqui — validação de URL acontece em outro lugar
    if (typeof file === 'string') return true
    if (!(file instanceof File)) return false
    if (file.type && file.type.startsWith('image/')) return true
    const name = file.name || ''
    return /\.(jpe?g|png|gif|webp|bmp|svg|heic|heif)$/i.test(name)
  }

  const isValidHttpUrl = (value) => {
    if (!value || typeof value !== 'string') return false
    try {
      const u = new URL(value)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch (e) {
      return false
    }
  }

  const getValidationErrors = () => {
    const errs = {}
    if (!form.localName || !form.localName.trim()) errs.localName = 'Nome do local é obrigatório.'
    if (!form.localDescricao || !form.localDescricao.trim()) errs.localDescricao = 'Descrição é obrigatória.'
    if (!form.link || !form.link.trim()) {
      errs.link = 'Link é obrigatório.'
    } else if (!isValidHttpUrl(form.link.trim())) {
      errs.link = 'Link inválido — deve começar com http:// ou https://.'
    }
    if (!form.localType || !form.localType.trim()) errs.localType = 'Tipo do local é obrigatório.'
    if (!form.country || !form.country.trim()) errs.country = 'País é obrigatório.'
    if (!form.state || !form.state.trim()) errs.state = 'Estado é obrigatório.'
    if (!form.city || !form.city.trim()) errs.city = 'Cidade é obrigatória.'

    // imagem obrigatória + checagem básica de tipo e tamanho
    // regras:
    // - se estamos editando e NÃO substituindo (replaceImage === false) e há image (string), ok
    // - caso contrário, precisamos ter um File como form.image
    if (editing && !replaceImage) {
      // editar sem substituir: aceitável desde que exista imagePreview ou form.image string
      if (!form.image && !imagePreview) {
        errs.image = 'Imagem é obrigatória.'
      }
    } else {
      // criação ou edição com substituição: requer um arquivo ou preview
      if (!form.image && !imagePreview) {
        errs.image = 'Imagem é obrigatória.'
      } else if (form.image && !isImageFile(form.image)) {
        errs.image = 'O arquivo selecionado não parece ser uma imagem válida.'
      } else if (form.image instanceof File) {
        const maxSize = 5 * 1024 * 1024 // 5 MB
        if (form.image.size > maxSize) errs.image = 'Imagem muito grande. Máx 5 MB.'
      }
    }

    return errs
  }

  const isFormValid = useMemo(() => Object.keys(getValidationErrors()).length === 0, [form, imagePreview, replaceImage, editing])

  const submitLocal = async (e) => {
    e && e.preventDefault()
    setSubmitting(true)
    setError(null)

    const errors = getValidationErrors()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Preencha todos os campos obrigatórios antes de publicar.')
      setSubmitting(false)
      return
    }

    // Se temos uma imageUrl (string) e precisamos enviar um File (ex: criar novo a partir de existente
    // ou backend exige file), tentamos baixar a imagem e convertê-la para File. Se falhar (CORS), enviamos imageUrl.
    let imageToSend = form.image
    if (typeof imageToSend === 'string' && imageToSend && (!editing || (editing && !replaceImage))) {
      try {
        const resp = await fetch(imageToSend, { mode: 'cors' })
        if (resp.ok) {
          const blob = await resp.blob()
          const ext = (blob.type && blob.type.split('/')[1]) || 'jpg'
          const filename = `image.${ext}`
          imageToSend = new File([blob], filename, { type: blob.type || 'image/jpeg' })
          // setamos também no form para seguir a lógica (e para preview se necessário)
          setForm(f => ({ ...f, image: imageToSend }))
          // cria preview blob
          try { URL.revokeObjectURL(imagePreview) } catch (e) { /* ignore */ }
          const blobUrl = URL.createObjectURL(blob)
          setImagePreview(blobUrl)
        } else {
          // não conseguimos baixar: mantemos string (será enviada como imageUrl)
          console.warn('fetch imageUrl returned not ok', resp.status)
        }
      } catch (err) {
        console.warn('não foi possível baixar imageUrl para converter em File (possível CORS). Enviando imageUrl se backend aceitar.', err)
        // imageToSend permanece string
      }
    }

    // Verificação adicional: tenta carregar a imagem no cliente para garantir que não é um arquivo corrompido/não-imagem
    if (imageToSend instanceof File) {
      const imageOk = await new Promise(resolve => {
        const img = new Image()
        const url = URL.createObjectURL(imageToSend)
        let settled = false
        img.onload = () => { if (!settled) { settled = true; URL.revokeObjectURL(url); resolve(true) } }
        img.onerror = () => { if (!settled) { settled = true; URL.revokeObjectURL(url); resolve(false) } }
        img.src = url
        // timeout de 3s
        setTimeout(() => { if (!settled) { settled = true; URL.revokeObjectURL(url); resolve(false) } }, 3000)
      })

      if (!imageOk) {
        setFieldErrors({ image: 'Arquivo selecionado não é uma imagem válida.' })
        setError('Verifique a imagem enviada.')
        setSubmitting(false)
        return
      }
    }

    try {
      const isOverwrite = editing && !saveAsNew && !!editingSourceId

      const fd = new FormData()
      fd.append('localName', form.localName)
      fd.append('localDescricao', form.localDescricao)
      fd.append('link', form.link)
      fd.append('tipo', form.localType)
      fd.append('country', form.country)
      fd.append('countryCode', form.countryCode)
      fd.append('state', form.state)
      fd.append('city', form.city)
      fd.append('userId', user?._id)

      // imagem: se temos um File depois da tentativa de download, envia como 'image'
      if (imageToSend instanceof File) {
        fd.append('image', imageToSend)
      } else if (typeof imageToSend === 'string' && imageToSend.trim() && (!editing || !replaceImage)) {
        // fallback: envia imageUrl (string) para backend tratar — preferível ao erro atual
        fd.append('imageUrl', imageToSend)
      }

      if (isOverwrite) fd.append('localId', editingSourceId)

      if (useMock) {
        await simulateDelay()
        const created = {
          localId: (isOverwrite ? editingSourceId : (form.localId || `mock-${getBrazilDate()}`)),
          localName: form.localName,
          localDescricao: form.localDescricao,
          localType: form.localType,
          status: 'active',
          subscriptionId: `sub_mock_${getBrazilDate()}`,
          link: form.link,
          country: form.country,
          countryCode: form.countryCode,
          state: form.state,
          city: form.city,
          // escolha da imageUrl para o mock:
          imageUrl: imageToSend instanceof File ? URL.createObjectURL(imageToSend) : (typeof imageToSend === 'string' && imageToSend ? imageToSend : imagePreview || null),
          userId: user?.id || user?._id,
          estatisticas: { impressoes: 0, cliques: 0 }
        }

        if (isOverwrite) {
          window.__MOCK_LOCAIS__ = (window.__MOCK_LOCAIS__ || []).map(l => l.localId === editingSourceId ? { ...l, ...created } : l)
        } else {
          window.__MOCK_LOCAIS__ = [...(window.__MOCK_LOCAIS__ || []), created]
        }

        resetForm()
        fetchMeusLocais()
      } else {
        // NÃO setamos Content-Type manualmente — o browser colocará multipart/form-data com boundary
        if (isOverwrite) {
          await api.post('/editar-local', fd, { headers: { 'Content-Type': undefined } })
        } else {
          const res = await api.post('/createPayment', fd, { headers: { 'Content-Type': undefined } })

          if (res && res.data && res.data.url) {
            window.location.href = res.data.url
            return
          }
        }

        resetForm()
        fetchMeusLocais()
      }
    } catch (err) {
      console.error('submitLocal erro', err)
      console.error('response data:', err?.response?.data)
      setError('Erro ao enviar o local. Verifique a conexão e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ------------------ render ------------------
  return (
    <div className={`w-full p-4 ${tema === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ADD / EDIT FORM */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-6 shadow ${form.localId ? tema === 'dark' ? 'bg-green-800 text-white' : 'bg-green-400 text-slate-900' : tema === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
          <h2 className="text-xl font-semibold mb-3">{editing ? (saveAsNew ? 'Adicionar (a partir do local)' : 'Editar Local (sobrescrever)') : 'Adicionar Local'}</h2>
          {error && <div className="mb-2 text-sm text-red-500">{error}</div>}

          <form onSubmit={submitLocal}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              <label className="block text-sm font-medium mb-2">
                Nome do Local <span className="text-red-500">*</span>
              </label>
              <input className={`w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-300 resize-none ${
                  fieldErrors.localName 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : tema === 'dark' 
                      ? 'border-slate-600 bg-slate-700/50 text-white placeholder-slate-400' 
                      : 'border-slate-300 bg-white text-slate-900 placeholder-slate-500'
                }`} 
                rows="3"
                value={form.localName} 
                onChange={e => handleChange('localName', e.target.value)}
                placeholder="Descreva seu local"
              />
              <AnimatePresence>
                {fieldErrors.localName && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-500 text-xs mt-1"
                  >
                    {fieldErrors.localName}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              <label className="block text-sm font-medium mb-2">
                Descrição <span className="text-red-500">*</span>
              </label>
              <textarea 
                className={`w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-300 resize-none ${
                  fieldErrors.localDescricao 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : tema === 'dark' 
                      ? 'border-slate-600 bg-slate-700/50 text-white placeholder-slate-400' 
                      : 'border-slate-300 bg-white text-slate-900 placeholder-slate-500'
                }`} 
                rows="3"
                value={form.localDescricao} 
                onChange={e => handleChange('localDescricao', e.target.value)}
                placeholder="Descreva seu local"
              />
              <AnimatePresence>
                {fieldErrors.localDescricao && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-500 text-xs mt-1"
                  >
                    {fieldErrors.localDescricao}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <label className="block text-sm font-medium mb-2">
                Link <span className="text-red-500">*</span>
              </label>
              <input 
                className={`w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-300 ${
                  fieldErrors.link 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : tema === 'dark' 
                      ? 'border-slate-600 bg-slate-700/50 text-white placeholder-slate-400' 
                      : 'border-slate-300 bg-white text-slate-900 placeholder-slate-500'
                }`} 
                value={form.link} 
                onChange={e => handleChange('link', e.target.value)}
                placeholder="https://exemplo.com"
              />
              <AnimatePresence>
                {fieldErrors.link && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-500 text-xs mt-1"
                  >
                    {fieldErrors.link}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
            >
              <label className="block text-sm font-medium mb-2">
                Tipo de Local <span className="text-red-500">*</span>
              </label>
              <select 
                disabled={editing && !saveAsNew} 
                className={`w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-300 ${
                  fieldErrors.localType 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : tema === 'dark' 
                      ? 'border-slate-600 bg-slate-700/50 text-white' 
                      : 'border-slate-300 bg-white text-slate-900'
                } ${editing && !saveAsNew ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`} 
                value={form.localType} 
                onChange={e => handleChange('localType', e.target.value)}
              >
                {tiposPermitidos.map(t => (
                  <option className="text-black" key={t} value={t}>{t}</option>
                ))}
              </select>
              <AnimatePresence>
                {fieldErrors.localType && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-500 text-xs mt-1"
                  >
                    {fieldErrors.localType}
                  </motion.div>
                )}
              </AnimatePresence>
              {editing && !saveAsNew && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs mt-1 text-yellow-600 dark:text-yellow-400"
                >
                  O tipo não pode ser alterado ao editar — cada tipo tem preço diferente.
                </motion.div>
              )}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <label className="block text-sm font-medium mb-2">
                  País <span className="text-red-500">*</span>
                </label>
                <select 
                  className={`w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-300 ${
                    fieldErrors.country 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : tema === 'dark' 
                        ? 'border-slate-600 bg-slate-700/50 text-white' 
                        : 'border-slate-300 bg-white text-slate-900'
                  }`} 
                  value={form.country} 
                  onChange={e => handleChange('country', e.target.value)}
                >
                  <option className="text-black" value="">Selecione um país</option>
                  {countries.map(c => (
                    <option className="text-black" key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <AnimatePresence>
                  {fieldErrors.country && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-500 text-xs mt-1"
                    >
                      {fieldErrors.country}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
              >
                <label className="block text-sm font-medium mb-2">
                  Estado <span className="text-red-500">*</span>
                </label>
                <select 
                  className={`w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-300 ${
                    fieldErrors.state 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : tema === 'dark' 
                        ? 'border-slate-600 bg-slate-700/50 text-white' 
                        : 'border-slate-300 bg-white text-slate-900'
                  }`} 
                  value={form.state} 
                  onChange={e => handleChange('state', e.target.value)}
                >
                  <option className="text-black" value="">Selecione um estado</option>
                  {states.map(s => (
                    <option className="text-black" key={s} value={s}>{s}</option>
                  ))}
                </select>
                <AnimatePresence>
                  {fieldErrors.state && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-500 text-xs mt-1"
                    >
                      {fieldErrors.state}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                <label className="block text-sm font-medium mb-2">
                  Cidade <span className="text-red-500">*</span>
                </label>
                <select 
                  className={`w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-300 ${
                    fieldErrors.city 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : tema === 'dark' 
                        ? 'border-slate-600 bg-slate-700/50 text-white' 
                        : 'border-slate-300 bg-white text-slate-900'
                  }`} 
                  value={form.city} 
                  onChange={e => handleChange('city', e.target.value)}
                >
                  <option className="text-black" value="">Selecione uma cidade</option>
                  {cities.map(c => (
                    <option className="text-black" key={c} value={c}>{c}</option>
                  ))}
                </select>
                <AnimatePresence>
                  {fieldErrors.city && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-500 text-xs mt-1"
                    >
                      {fieldErrors.city}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55, duration: 0.3 }}
            >
              <label className="block text-sm font-medium mb-2">
                Imagem <span className="text-red-500">*</span>
              </label>

              {editing && imagePreview && !replaceImage ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-2"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Imagem atual:</div>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <motion.img 
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                      src={imagePreview} 
                      alt="imagem atual" 
                      className="w-32 h-20 object-cover rounded-lg border shadow-sm" 
                    />
                    <div className="flex flex-col gap-2">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button" 
                        onClick={() => {
                          setReplaceImage(true)
                          setForm(f => ({ ...f, image: null }))
                          if (imagePreview && imagePreview.startsWith('blob:')) {
                            try { URL.revokeObjectURL(imagePreview) } catch (e) { /* ignore */ }
                          }
                          setImagePreview(null)
                          if (fileInputRef.current) fileInputRef.current.value = null
                        }} 
                        className="px-4 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-sm font-medium"
                      >
                        Substituir imagem
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button" 
                        onClick={() => {
                          const ok = window.confirm('Remover imagem atual?')
                          if (!ok) return
                          setForm(f => ({ ...f, image: null }))
                          setImagePreview(null)
                          setReplaceImage(true)
                          if (fileInputRef.current) fileInputRef.current.value = null
                        }} 
                        className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all duration-200 text-sm font-medium"
                      >
                        Remover imagem
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="mt-2">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="relative"
                  >
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*" 
                      onChange={e => handleFile(e.target.files?.[0] || null)} 
                      className={`w-full p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-blue-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400 ${
                        fieldErrors.image 
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                          : tema === 'dark' 
                            ? 'border-slate-600 bg-slate-700/50 text-white' 
                            : 'border-slate-300 bg-white text-slate-900'
                      }`} 
                    />
                  </motion.div>
                  {editing && replaceImage && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2"
                    >
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button" 
                        onClick={() => {
                          setReplaceImage(false)
                          setForm(f => ({ ...f, image: form.image }))
                          setImagePreview(form.image || null)
                          if (fileInputRef.current) fileInputRef.current.value = null
                        }} 
                        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
                      >
                        Manter imagem atual
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              )}

              <AnimatePresence>
                {fieldErrors.image && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-500 text-xs mt-1"
                  >
                    {fieldErrors.image}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {editing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
              >
                <label className="inline-flex items-center gap-3 cursor-pointer">
                  <motion.input 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="checkbox" 
                    checked={saveAsNew} 
                    onChange={() => {
                      const next = !saveAsNew
                      setSaveAsNew(next)
                      if (!next && editingSourceId) {
                        setForm(f => ({ ...f, localId: editingSourceId }))
                      } else {
                        setForm(f => ({ ...f, localId: null }))
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium">
                    Salvar como novo (não sobrescrever o local original)
                  </span>
                </label>
                {!saveAsNew && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-xs mt-2 text-yellow-700 dark:text-yellow-400"
                  >
                    ⚠️ Atenção: ao desmarcar essa opção, você irá sobrescrever o local original — ação potencialmente irreversível.
                  </motion.div>
                )}
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.3 }}
              className="flex gap-3 pt-4"
            >
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={submitting || !isFormValid} 
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  submitting || !isFormValid
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {submitting && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  )}
                  {submitting ? 'Enviando...' : (form.localId ? 'Salvar Alterações' : (editing ? 'Adicionar como novo' : 'Adicionar Local'))}
                </div>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button" 
                onClick={resetForm} 
                className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
              >
                Limpar
              </motion.button>
            </motion.div>
          </form>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
            className="mt-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            💡 <strong>Observação:</strong> todos os campos são obrigatórios antes de publicar. Se seu backend exigir criação de pagamento/assinatura antes do cadastro, adapte a chamada para '/createPayment' conforme sua API.
          </motion.p>
        </motion.section>

        {/* LISTA DE LOCAIS */}
        <motion.section 
          initial={{ opacity: 0, y: 20, scale: 0.95 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className={`rounded-2xl p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl overflow-hidden ${
            tema === 'dark' 
              ? 'bg-slate-800/90 border border-slate-700/50' 
              : 'bg-white/90 border border-slate-200/50'
          }`}
        >
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-xl font-semibold mb-4 flex items-center gap-2"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-green-500 rounded-full"
            />
            Meus Locais
            {meusLocais.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium"
              >
                {meusLocais.length}
              </motion.span>
            )}
          </motion.h2>
          
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            <AnimatePresence>
              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-8"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                  />
                  <span className="ml-3 text-slate-600 dark:text-slate-400">Carregando...</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence>
              {!loading && meusLocais.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-12"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl mb-4"
                  >
                    📍
                  </motion.div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Você ainda não tem locais cadastrados.
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                    Comece adicionando seu primeiro local!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <AnimatePresence>
                {meusLocais.map((local, index) => (
                  <motion.div 
                    key={local.localId || local._id || Math.random()}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="w-24 h-16 bg-slate-100 dark:bg-slate-600 rounded-lg overflow-hidden flex-shrink-0 shadow-sm"
                        >
                          {local.imageUrl ? (
                            <img 
                              src={buildImageUrl(local.imageUrl)} 
                              alt={local.localName} 
                              className="w-full h-full object-cover transition-transform duration-200 hover:scale-110" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                              <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                🖼️
                              </motion.div>
                            </div>
                          )}
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <motion.h3 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-semibold text-slate-900 dark:text-white truncate"
                          >
                            {local.localName}
                          </motion.h3>
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-xs text-slate-500 dark:text-slate-400 mt-1"
                          >
                            {local.localType} • {local.city} - {local.state} • {local.country}
                          </motion.p>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className={`px-2 py-1 rounded-full font-medium uppercase ${
                                local.status === 'ativo' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              {local.status}
                            </motion.div>
                            <span className="text-slate-500 dark:text-slate-400">
                              👁️ {local.estatisticas?.impressoes ?? 0} • 👆 {local.estatisticas?.cliques ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <motion.button 
                          whileHover={{ scale: 1.05, backgroundColor: "rgb(59 130 246)" }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openForEdit(local)} 
                          className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium transition-all duration-200 hover:shadow-lg"
                        >
                          ✏️ Editar
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05, backgroundColor: "rgb(239 68 68)" }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeletarLocal(local.localId)} 
                          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium transition-all duration-200 hover:shadow-lg"
                        >
                          🗑️ Deletar
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default Locais

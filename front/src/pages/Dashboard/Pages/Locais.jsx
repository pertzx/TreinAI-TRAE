import React, { useState, useEffect, useMemo, useRef } from 'react'
import api from '../../../Api'
import locationsRaw from '../../../data/locations.json'
import { buildImageUrl } from '../../../utils/imageUtils'
import { getBrazilDate } from '../../../../helpers/getBrazilDate'
import { motion, AnimatePresence } from 'framer-motion';
import {
  sanitizeLocalData,
  validateLocalData,
  validateImageFile,
  createRequestTimeout,
  sanitizeForDisplay,
  validateUserId,
  tokenRateLimit,
  paymentRateLimit
} from '../../../utils/security';

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

  // NOVO: Estados para o sistema de tokens
  const [tokensDisponiveis, setTokensDisponiveis] = useState(0)
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [showTokenInfo, setShowTokenInfo] = useState(false)

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
    verificarTokensDisponiveis()
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

  // NOVO: Função para verificar tokens disponíveis
  const verificarTokensDisponiveis = async () => {
    const userId = user?._id || user?.id

    if (!validateUserId(userId) || useMock) {
      setTokensDisponiveis(useMock ? 3 : 0) // Mock: 3 tokens disponíveis
      return
    }

    setLoadingTokens(true)
    try {
      const controller = createRequestTimeout(10000) // 10s timeout
      const response = await api.get(`/verificar-tokens/${userId}`, {
        signal: controller.signal
      })
      setTokensDisponiveis(response.data.tokensDisponiveis || 0)
    } catch (err) {
      console.error('Erro ao verificar tokens:', err)
      setTokensDisponiveis(0)
      if (err.name !== 'AbortError') {
        setError('Erro ao verificar tokens disponíveis')
      }
    } finally {
      setLoadingTokens(false)
    }
  }

  // NOVO: Função para criar sessão de pagamento simplificada
  const criarSessaoPagamento = async (formData) => {
    const userId = user?._id || user?.id

    // Verificar rate limiting para pagamentos
    if (!paymentRateLimit.isAllowed(userId)) {
      throw new Error('Muitas tentativas de pagamento. Aguarde alguns minutos.')
    }

    try {
      const controller = createRequestTimeout(15000) // 15s timeout
      const response = await api.post('/criar-sessao-pagamento-local', formData, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data && response.data.url) {
        // Redireciona para o Stripe Checkout
        window.location.href = response.data.url
        return true
      }

      throw new Error('URL de pagamento não recebida')
    } catch (err) {
      console.error('Erro ao criar sessão de pagamento:', err)
      if (err.name === 'AbortError') {
        throw new Error('Timeout na criação do pagamento. Tente novamente.')
      }
      throw err
    }
  }

  // NOVO: Função para criar local com token
  const criarLocalComToken = async (formData) => {
    try {
      // DEBUG: Log do FormData sendo enviado
      console.log('=== DEBUG Frontend - Enviando FormData ===');
      for (let pair of formData.entries()) {
        console.log(`${pair[0]}:`, pair[1]);
      }
      console.log('==========================================');
      
      const controller = createRequestTimeout(15000) // 15s timeout
      const response = await api.post('/criar-local-com-token', formData, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data && response.data.success) {
        return response.data.local
      }

      throw new Error(response.data?.message || 'Erro ao criar local com token')
    } catch (err) {
      console.error('Erro ao criar local com token:', err)
      if (err.name === 'AbortError') {
        throw new Error('Timeout na criação do local. Tente novamente.')
      }
      throw err
    }
  }

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
    // Usar validação de segurança
    const validationResult = validateLocalData(form)
    let errs = { ...validationResult.errors }

    // Validação adicional de imagem com segurança
    if (editing && !replaceImage) {
      // editar sem substituir: aceitável desde que exista imagePreview ou form.image string
      if (!form.image && !imagePreview) {
        errs.image = 'Imagem é obrigatória.'
      }
    } else {
      // criação ou edição com substituição: requer um arquivo ou preview
      if (!form.image && !imagePreview) {
        errs.image = 'Imagem é obrigatória.'
      } else if (form.image instanceof File) {
        const imageValidation = validateImageFile(form.image)
        if (!imageValidation.isValid) {
          errs.image = imageValidation.error
        }
      } else if (form.image && !isImageFile(form.image)) {
        errs.image = 'O arquivo selecionado não parece ser uma imagem válida.'
      }
    }

    return errs
  }

  const isFormValid = useMemo(() => Object.keys(getValidationErrors()).length === 0, [form, imagePreview, replaceImage, editing])

  // NOVO: Função principal de submit com lógica de tokens
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

    // Validar rate limiting
    const userId = user?._id || user?.id
    if (!validateUserId(userId)) {
      setError('Usuário inválido. Faça login novamente.')
      setSubmitting(false)
      return
    }

    // Verificar rate limiting para tokens
    if (!tokenRateLimit.isAllowed(userId)) {
      setError('Muitas tentativas. Aguarde um momento antes de tentar novamente.')
      setSubmitting(false)
      return
    }

    // Sanitizar dados do formulário
    const sanitizedData = sanitizeLocalData(form)

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
      fd.append('localName', sanitizedData.localName || form.localName)
      fd.append('localDescricao', sanitizedData.localDescricao || form.localDescricao)
      fd.append('link', sanitizedData.link || form.link)
      fd.append('localType', sanitizedData.localType || form.localType)
      fd.append('country', sanitizedData.country || form.country)
      fd.append('countryCode', form.countryCode)
      fd.append('state', sanitizedData.state || form.state)
      fd.append('city', sanitizedData.city || form.city)
      fd.append('userId', userId)

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
        // NOVO FLUXO: Verificar se há tokens disponíveis
        if (!isOverwrite) {
          // Atualizar tokens disponíveis
          await verificarTokensDisponiveis()

          if (tokensDisponiveis > 0) {
            // Usar token para criar local diretamente
            try {
              const novoLocal = await criarLocalComToken(fd)
              console.log('Local criado com token:', novoLocal)

              // Atualizar tokens disponíveis após uso
              await verificarTokensDisponiveis()

              resetForm()
              fetchMeusLocais()

              // Mostrar feedback de sucesso
              setError(null)
              // Você pode adicionar uma notificação de sucesso aqui

            } catch (tokenErr) {
              console.error('Erro ao criar local com token:', tokenErr)
              setError(tokenErr.message || 'Erro ao criar local com token. Tentando pagamento...')

              // Fallback para pagamento se falhar com token
              try {
                // Exibe o conteúdo do FormData de forma legível
                for (let pair of fd.entries()) {
                  console.log(`${pair[0]}:`, pair[1])
                }
                await criarSessaoPagamento(fd)
              } catch (paymentErr) {
                setError('Erro ao processar pagamento. Tente novamente.')
              }
            }
          } else {
            // Sem tokens: criar sessão de pagamento
            try {
              // Exibe o conteúdo do FormData de forma legível
              for (let pair of fd.entries()) {
                console.log(`${pair[0]}:`, pair[1])
              }
              await criarSessaoPagamento(fd)
            } catch (paymentErr) {
              setError('Erro ao processar pagamento. Tente novamente.')
            }
          }
        } else {
          // Edição: usar endpoint antigo
          await api.post('/editar-local', fd, { headers: { 'Content-Type': undefined } })
          resetForm()
          fetchMeusLocais()
        }
      }
    } catch (err) {
      console.error('submitLocal erro', err)
      console.error('response data:', err?.response?.data)
      setError('Erro ao enviar o local. Verifique a conexão e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`locais-container ${tema === 'dark' ? 'dark-theme' : 'light-theme'}`}>
      <div className="locais-header">
        <h1>Gerenciar Locais</h1>

        {/* NOVO: Painel de informações de tokens */}
        <motion.div
          className="tokens-info-panel"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="tokens-display">
            <div className="tokens-count">
              <span className="tokens-icon">🎫</span>
              <span className="tokens-number">
                {loadingTokens ? '...' : tokensDisponiveis}
              </span>
              <span className="tokens-label">Tokens Disponíveis</span>
            </div>

            <button
              className="tokens-info-btn"
              onClick={() => setShowTokenInfo(!showTokenInfo)}
              title="Informações sobre tokens"
            >
              ℹ️
            </button>
          </div>

          <AnimatePresence>
            {showTokenInfo && (
              <motion.div
                className="tokens-explanation"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p>
                  <strong>Como funcionam os tokens:</strong>
                </p>
                <ul>
                  <li>• Cada token permite criar 1 local gratuitamente</li>
                  <li>• Tokens são obtidos através de pagamentos bem-sucedidos</li>
                  <li>• Sem tokens? Você será redirecionado para pagamento</li>
                  <li>• Tokens expiram automaticamente após 30 dias</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="locais-content">
        {/* Coluna 1: Meus Locais */}
        <div className="locais-column meus-locais">
          <h2>Meus Locais</h2>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando seus locais...</p>
            </div>
          ) : error && !editing ? (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <button onClick={fetchMeusLocais} className="retry-btn">
                Tentar Novamente
              </button>
            </div>
          ) : meusLocais.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📍</div>
              <h3>Nenhum local encontrado</h3>
              <p>Crie seu primeiro local usando o formulário ao lado</p>
            </div>
          ) : (
            <div className="locais-grid">
              <AnimatePresence>
                {meusLocais.map((local, index) => (
                  <motion.div
                    key={local.localId}
                    className="local-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  >
                    <div className="local-image">
                      {local.imageUrl ? (
                        <img
                          src={buildImageUrl(local.imageUrl)}
                          alt={sanitizeForDisplay(local.localName)}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className="image-placeholder" style={{ display: local.imageUrl ? 'none' : 'flex' }}>
                        <span>📷</span>
                      </div>

                      <div className="local-status">
                        <span className={`status-badge ${local.status}`}>
                          {local.status === 'active' ? '✅ Ativo' : '⏸️ Inativo'}
                        </span>
                      </div>
                    </div>

                    <div className="local-info">
                      <h3>{sanitizeForDisplay(local.localName)}</h3>
                      <p className="local-description">{sanitizeForDisplay(local.localDescricao)}</p>

                      <div className="local-details">
                        <div className="detail-item">
                          <span className="detail-label">Tipo:</span>
                          <span className="detail-value">{sanitizeForDisplay(local.localType)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Local:</span>
                          <span className="detail-value">
                            {sanitizeForDisplay(local.city)}, {sanitizeForDisplay(local.state)}, {sanitizeForDisplay(local.country)}
                          </span>
                        </div>
                        {local.estatisticas && (
                          <div className="local-stats">
                            <div className="stat">
                              <span className="stat-number">{local.estatisticas.impressoes || 0}</span>
                              <span className="stat-label">Visualizações</span>
                            </div>
                            <div className="stat">
                              <span className="stat-number">{local.estatisticas.cliques || 0}</span>
                              <span className="stat-label">Cliques</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="local-actions">
                        <button
                          className="action-btn edit-btn"
                          onClick={() => openForEdit(local)}
                          title="Editar local"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeletarLocal(local.localId)}
                          title="Deletar local"
                        >
                          🗑️ Deletar
                        </button>
                        {local.link && (
                          <a
                            href={local.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn link-btn"
                            title="Visitar site"
                          >
                            🔗 Visitar
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Coluna 2: Formulário */}
        <div className="locais-column form-column">
          <div className="form-header">
            <h2>{editing ? 'Editar Local' : 'Adicionar Novo Local'}</h2>
            {editing && (
              <button
                className="cancel-edit-btn"
                onClick={resetForm}
                title="Cancelar edição"
              >
                ✖️ Cancelar
              </button>
            )}
          </div>

          {/* NOVO: Indicador de fluxo de pagamento/token */}
          {!editing && (
            <motion.div
              className="payment-flow-indicator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {tokensDisponiveis > 0 ? (
                <div className="flow-indicator success">
                  <span className="flow-icon">🎫</span>
                  <div className="flow-text">
                    <strong>Criação Gratuita</strong>
                    <p>Você tem {tokensDisponiveis} token(s) disponível(is)</p>
                  </div>
                </div>
              ) : (
                <div className="flow-indicator payment">
                  <span className="flow-icon">💳</span>
                  <div className="flow-text">
                    <strong>Pagamento Necessário</strong>
                    <p>Você será redirecionado para o pagamento</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <form onSubmit={submitLocal} className="local-form">
            {error && (
              <motion.div
                className="form-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {error}
              </motion.div>
            )}

            <div className="form-group">
              <label htmlFor="localName">Nome do Local *</label>
              <input
                id="localName"
                type="text"
                value={form.localName}
                onChange={(e) => handleChange('localName', e.target.value)}
                placeholder="Ex: Academia Central"
                className={fieldErrors.localName ? 'error' : ''}
              />
              {fieldErrors.localName && (
                <span className="field-error">{fieldErrors.localName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="localDescricao">Descrição *</label>
              <textarea
                id="localDescricao"
                value={form.localDescricao}
                onChange={(e) => handleChange('localDescricao', e.target.value)}
                placeholder="Descreva seu local..."
                rows="3"
                className={fieldErrors.localDescricao ? 'error' : ''}
              />
              {fieldErrors.localDescricao && (
                <span className="field-error">{fieldErrors.localDescricao}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="link">Link do Site *</label>
              <input
                id="link"
                type="url"
                value={form.link}
                onChange={(e) => handleChange('link', e.target.value)}
                placeholder="https://seusite.com"
                className={fieldErrors.link ? 'error' : ''}
              />
              {fieldErrors.link && (
                <span className="field-error">{fieldErrors.link}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="localType">Tipo do Local *</label>
              <select
                id="localType"
                value={form.localType}
                onChange={(e) => handleChange('localType', e.target.value)}
                className={fieldErrors.localType ? 'error' : ''}
              >
                <option value="academia">Academia</option>
                <option value="clinica-de-fisioterapia">Clínica de Fisioterapia</option>
                <option value="consultorio-de-nutricionista">Consultório de Nutricionista</option>
                <option value="loja">Loja</option>
                <option value="outros">Outros</option>
              </select>
              {fieldErrors.localType && (
                <span className="field-error">{fieldErrors.localType}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="country">País *</label>
                <select
                  id="country"
                  value={form.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className={fieldErrors.country ? 'error' : ''}
                >
                  <option value="">Selecione o país</option>
                  {countries.map(country => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.country && (
                  <span className="field-error">{fieldErrors.country}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="state">Estado *</label>
                <select
                  id="state"
                  value={form.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  disabled={!form.country}
                  className={fieldErrors.state ? 'error' : ''}
                >
                  <option value="">Selecione o estado</option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {fieldErrors.state && (
                  <span className="field-error">{fieldErrors.state}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="city">Cidade *</label>
              <select
                id="city"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                disabled={!form.state}
                className={fieldErrors.city ? 'error' : ''}
              >
                <option value="">Selecione a cidade</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {fieldErrors.city && (
                <span className="field-error">{fieldErrors.city}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="image">Imagem *</label>

              {editing && form.image && typeof form.image === 'string' && (
                <div className="current-image-section">
                  <p>Imagem atual:</p>
                  <div className="current-image-preview">
                    <img src={buildImageUrl(form.image)} alt="Imagem atual" />
                  </div>
                  <label className="replace-image-checkbox">
                    <input
                      type="checkbox"
                      checked={replaceImage}
                      onChange={(e) => setReplaceImage(e.target.checked)}
                    />
                    Substituir imagem
                  </label>
                </div>
              )}

              {(!editing || replaceImage || !form.image) && (
                <div className="image-upload-section">
                  <input
                    ref={fileInputRef}
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files[0])}
                    className={fieldErrors.image ? 'error' : ''}
                  />

                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" />
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() => {
                          handleFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                      >
                        ✖️
                      </button>
                    </div>
                  )}
                </div>
              )}

              {fieldErrors.image && (
                <span className="field-error">{fieldErrors.image}</span>
              )}
            </div>

            {editing && (
              <div className="form-group">
                <label className="save-as-new-checkbox">
                  <input
                    type="checkbox"
                    checked={saveAsNew}
                    onChange={(e) => setSaveAsNew(e.target.checked)}
                  />
                  Salvar como novo local (não sobrescrever o original)
                </label>
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className={`submit-btn ${!isFormValid ? 'disabled' : ''} ${submitting ? 'loading' : ''}`}
              >
                {submitting ? (
                  <>
                    <div className="btn-spinner"></div>
                    Processando...
                  </>
                ) : editing ? (
                  saveAsNew ? 'Criar Novo Local' : 'Atualizar Local'
                ) : tokensDisponiveis > 0 ? (
                  '🎫 Criar com Token'
                ) : (
                  '💳 Pagar e Criar'
                )}
              </button>

              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="cancel-btn"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .locais-container {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .locais-header {
          margin-bottom: 30px;
        }

        .locais-header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .tokens-info-panel {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          border-radius: 16px;
          padding: 20px;
          color: white;
          box-shadow: 0 8px 32px rgba(240, 147, 251, 0.3);
        }

        .tokens-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tokens-count {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tokens-icon {
          font-size: 2rem;
        }

        .tokens-number {
          font-size: 2.5rem;
          font-weight: 700;
        }

        .tokens-label {
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .tokens-info-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.2s ease;
        }

        .tokens-info-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .tokens-explanation {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .tokens-explanation ul {
          margin: 10px 0 0 0;
          padding: 0;
          list-style: none;
        }

        .tokens-explanation li {
          margin: 5px 0;
          opacity: 0.9;
        }

        .locais-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }

        .locais-column h2 {
          font-size: 1.8rem;
          font-weight: 600;
          margin-bottom: 20px;
          color: #333;
        }

        .dark-theme .locais-column h2 {
          color: #fff;
        }

        .loading-state, .error-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
          border-radius: 12px;
          background: #f8f9fa;
        }

        .dark-theme .loading-state,
        .dark-theme .error-state,
        .dark-theme .empty-state {
          background: #2d3748;
          color: #fff;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .locais-grid {
          display: grid;
          gap: 20px;
        }

        .local-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }

        .dark-theme .local-card {
          background: #2d3748;
          border-color: #4a5568;
        }

        .local-image {
          position: relative;
          height: 200px;
          overflow: hidden;
        }

        .local-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          color: #a0aec0;
        }

        .local-status {
          position: absolute;
          top: 12px;
          right: 12px;
        }

        .status-badge {
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .status-badge.active {
          background: rgba(34, 197, 94, 0.9);
        }

        .local-info {
          padding: 20px;
        }

        .local-info h3 {
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: #1a202c;
        }

        .dark-theme .local-info h3 {
          color: #fff;
        }

        .local-description {
          color: #718096;
          margin-bottom: 15px;
          line-height: 1.5;
        }

        .local-details {
          margin-bottom: 20px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }

        .detail-label {
          font-weight: 500;
          color: #4a5568;
        }

        .dark-theme .detail-label {
          color: #a0aec0;
        }

        .detail-value {
          color: #2d3748;
        }

        .dark-theme .detail-value {
          color: #e2e8f0;
        }

        .local-stats {
          display: flex;
          gap: 20px;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
        }

        .dark-theme .local-stats {
          border-top-color: #4a5568;
        }

        .stat {
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #667eea;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #718096;
        }

        .local-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .edit-btn {
          background: #3182ce;
          color: white;
        }

        .edit-btn:hover {
          background: #2c5aa0;
          transform: translateY(-1px);
        }

        .delete-btn {
          background: #e53e3e;
          color: white;
        }

        .delete-btn:hover {
          background: #c53030;
          transform: translateY(-1px);
        }

        .link-btn {
          background: #38a169;
          color: white;
        }

        .link-btn:hover {
          background: #2f855a;
          transform: translateY(-1px);
        }

        .form-column {
          background: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          height: fit-content;
          border: 1px solid #e2e8f0;
        }

        .dark-theme .form-column {
          background: #2d3748;
          border-color: #4a5568;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .cancel-edit-btn {
          background: #e2e8f0;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .cancel-edit-btn:hover {
          background: #cbd5e0;
        }

        .payment-flow-indicator {
          margin-bottom: 25px;
          padding: 20px;
          border-radius: 12px;
          border: 2px solid;
        }

        .flow-indicator.success {
          background: #f0fff4;
          border-color: #38a169;
        }

        .flow-indicator.payment {
          background: #fffaf0;
          border-color: #ed8936;
        }

        .flow-indicator {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .flow-icon {
          font-size: 2rem;
        }

        .flow-text strong {
          display: block;
          font-size: 1.1rem;
          margin-bottom: 4px;
        }

        .flow-text p {
          margin: 0;
          color: #718096;
          font-size: 0.9rem;
        }

        .local-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-error {
          background: #fed7d7;
          color: #c53030;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #feb2b2;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .form-group label {
          font-weight: 500;
          color: #2d3748;
          font-size: 0.95rem;
        }

        .dark-theme .form-group label {
          color: #e2e8f0;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
          background: white;
        }

        .dark-theme .form-group input,
        .dark-theme .form-group select,
        .dark-theme .form-group textarea {
          background: #4a5568;
          border-color: #718096;
          color: #fff;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error {
          border-color: #e53e3e;
        }

        .field-error {
          color: #e53e3e;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .current-image-section {
          margin-bottom: 15px;
        }

        .current-image-preview {
          width: 100px;
          height: 100px;
          border-radius: 8px;
          overflow: hidden;
          margin: 10px 0;
        }

        .current-image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .replace-image-checkbox,
        .save-as-new-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .image-upload-section input[type="file"] {
          padding: 8px;
        }

        .image-preview {
          position: relative;
          width: 150px;
          height: 150px;
          margin-top: 10px;
          border-radius: 8px;
          overflow: hidden;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-image-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 10px;
        }

        .submit-btn {
          flex: 1;
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .submit-btn:hover:not(.disabled):not(.loading) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        .submit-btn.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn.loading {
          opacity: 0.8;
          cursor: wait;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .cancel-btn {
          padding: 14px 24px;
          background: #e2e8f0;
          color: #4a5568;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn:hover {
          background: #cbd5e0;
        }

        .retry-btn {
          background: #3182ce;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          margin-top: 15px;
        }

        .retry-btn:hover {
          background: #2c5aa0;
        }

        /* Responsividade */
        @media (max-width: 1024px) {
          .locais-content {
            grid-template-columns: 1fr;
            gap: 30px;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .locais-container {
            padding: 15px;
          }
          
          .locais-header h1 {
            font-size: 2rem;
          }
          
          .tokens-display {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }
          
          .form-column {
            padding: 20px;
          }
          
          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

export default Locais

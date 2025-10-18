import React, { useState, useEffect } from 'react'
import api from '../../../Api.js'
// Ajuste o caminho abaixo para onde você salvar seu JSON
import locations from '../../../data/locations.json'
import { motion, AnimatePresence } from 'framer-motion';
import { FaLocationPin, FaChartLine, FaHandPointer, FaPlus, FaUpload, FaBullhorn, FaEye} from 'react-icons/fa6'
import { FaSave, FaTimes, FaCloudUploadAlt, FaEdit, FaTrash } from 'react-icons/fa'
import { useToast } from '../../../components/Toast.jsx'
import { buildImageUrl } from '../../../utils/imageUtils.js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const AnunciosDash = ({ user, tema = 'dark' }) => {
    const [showFormMobile, setShowFormMobile] = useState(true)

    useEffect(() => {
        const handleResizeInit = () => {
            if (typeof window !== 'undefined') {
                setShowFormMobile(window.innerWidth >= 768)
            }
        }
        handleResizeInit()
        window.addEventListener('resize', handleResizeInit)
        return () => window.removeEventListener('resize', handleResizeInit)
    }, [])

    const toggleFormMobile = () => setShowFormMobile(v => !v)

    const [saldo, setSaldo] = useState(user.saldoDeImpressoes || 0)
    const [valor, setValor] = useState('') // valor formatado para exibição
    const [isProcessing, setIsProcessing] = useState(false)

    const [anuncio, setAnuncio] = useState({
        titulo: '',
        descricao: '',
        link: '',
        anuncioTipo: 'imagem',
        countryCode: null,
        countryName: null,
        state: null,
        city: null,
        midia: null,
        anuncioId: null
    })

    const [previewUrl, setPreviewUrl] = useState(null)
    const [isSubmittingAd, setIsSubmittingAd] = useState(false)

    const [anuncios, setAnuncios] = useState([])
    const [loadingAds, setLoadingAds] = useState(false)

    // edição inline
    const [editingId, setEditingId] = useState(null)
    const [editDraft, setEditDraft] = useState({})
    const [editPreviews, setEditPreviews] = useState({})
    // snapshots originais para comparação
    const [editOriginals, setEditOriginals] = useState({})
    // snapshot quando o usuário abre o form principal para editar
    const [mainEditOriginal, setMainEditOriginal] = useState(null)

    // Toast
    const { showError, showSuccess } = useToast();

    // --- helpers locations ---
    const countryList = locations?.countries || []

    const getCountryByCode = (code) => countryList.find(c => c.code === code) || null

    const getStatesForCountryCode = (countryCode) => {
        if (!countryCode) return []
        const country = getCountryByCode(countryCode)
        if (!country) return []
        const countryName = country.name
        const raw = locations?.byCountry?.[countryName]?.states || []
        return raw
    }

    const getCitiesForState = (countryCode, stateValue) => {
        if (!countryCode || !stateValue) return []
        const country = getCountryByCode(countryCode)
        if (!country) return []
        const countryName = country.name
        const rawCitiesByState = locations?.byCountry?.[countryName]?.citiesByState || {}
        return rawCitiesByState[stateValue] || []
    }

    const mapOption = (opt) => {
        if (!opt && opt !== 0) return { value: '', label: '' }
        if (typeof opt === 'string') return { value: opt, label: opt }
        return { value: opt.code || opt.name || opt.value, label: opt.name || opt.label || opt.value }
    }

    const formatarMoedaInput = (value) => {
        // Remove tudo que não é dígito
        const digits = value.replace(/\D/g, '')

        // Se não há dígitos, retorna vazio
        if (!digits) return ''

        // Converte para número inteiro
        const number = parseInt(digits, 10)

        // Formata como moeda brasileira (sempre com ,00 para valores inteiros)
        return number.toLocaleString('pt-BR')
    }

    const extrairValorNumerico = (valorFormatado) => {
        // Remove tudo que não é dígito
        const digits = valorFormatado.replace(/\D/g, '')
        if (!digits) return 0

        // Retorna o valor inteiro
        return parseInt(digits, 10)
    }

    const handleValorChange = (e) => {
        const inputValue = e.target.value

        // Se o usuário está apagando tudo, permite
        if (inputValue === '') {
            setValor('')
            return
        }

        // Formata o valor conforme o usuário digita
        const valorFormatado = formatarMoedaInput(inputValue)
        setValor(valorFormatado)
    }

    const extrairNumero = (valorFormatado) => (valorFormatado || '').toString().replace(/\D/g, '')
    const formatarReais = (numeroEmReais) => {
        return 'R$ ' + Number(numeroEmReais).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    const themeClasses = {
        container: tema === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800',
        input: tema === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900',
        button: tema === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
    }

    // add saldo (VALIDAÇÃO: somente números inteiros em reais > 1)
    const handleAdicionarSaldo = async () => {
        try {
            const valorEmReais = extrairValorNumerico(valor)
            console.log('Valor a adicionar:', valorEmReais)

            if (valorEmReais <= 1) {
                showError('O valor precisa ser maior que R$ 1,00 (apenas valores inteiros)')
                return
            }
            if (valorEmReais >= 100000) {
                showError('Valor muito alto, máximo R$ 99.999,00. Entre em contato conosco se precisar de mais.')
                return
            }

            if (!user?._id) {
                showError('Dados do usuário inválidos. Não é possível processar a requisição.')
                return
            }

            const payload = {
                userId: user._id,
                quantidade: valorEmReais,
            }
            console.log('payload adicionar-saldo:', payload)
            setIsProcessing(true)
            const response = await api.post('/adicionar-saldo', payload)
            if (response.data.url) {
                window.location.href = response.data.url
                return
            }
            if (response.data.novoSaldo !== undefined) {
                setSaldo(response.data.novoSaldo)
                showSuccess('Saldo adicionado com sucesso!')
                setValor('') // Limpa o campo após sucesso
            }
            setIsProcessing(false)
        } catch (error) {
            setIsProcessing(false)
            showError(error?.response?.data?.message || 'Erro ao adicionar saldo')
            console.error(error)
        }
    }

    // file
    const MAX_IMAGE_BYTES = 1 * 1024 * 1024 // 1 MB
    const MAX_VIDEO_BYTES = 35 * 1024 * 1024 // 35 MB

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            const isImage = file.type.startsWith('image/')
            const isVideo = file.type.startsWith('video/')
            if (anuncio.anuncioTipo === 'imagem' && !isImage) {
                showError('Por favor, selecione uma imagem para anúncios do tipo imagem.')
                return
            }
            if (anuncio.anuncioTipo === 'video' && !isVideo) {
                showError('Por favor, selecione um vídeo para anúncios do tipo vídeo.')
                return
            }
            if (isImage && file.size > MAX_IMAGE_BYTES) {
                showError('Imagem muito grande. O tamanho máximo permitido é 1 MB. Utilize ferramentas de compressão se necessário. Pesquise na web por "compress image".')
                return
            }
            if (isVideo && file.size > MAX_VIDEO_BYTES) {
                showError('Vídeo muito grande. O tamanho máximo permitido é 35 MB. Utilize ferramentas de compressão se necessário. Pesquise na web por "compress video".')
                return
            }
            if (previewUrl) URL.revokeObjectURL(previewUrl)
            const fileUrl = URL.createObjectURL(file)
            setPreviewUrl(fileUrl)
            setAnuncio(prev => ({ ...prev, midia: file }))
        }
    }

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    // --- handle selects / inputs
    const handleAnuncioChange = (e) => {
        const { name, value } = e.target

        // anúncio tipo (mantém midia reset)
        if (name === 'anuncioTipo') {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl)
                setPreviewUrl(null)
            }
            setAnuncio(prev => ({ ...prev, [name]: value, midia: null }))
            return
        }

        // selects: se value === '' -> null internamente
        if (name === 'countryCode') {
            const code = value === '' ? null : value
            const country = getCountryByCode(code)
            setAnuncio(prev => ({ ...prev, countryCode: code, countryName: country?.name || null, state: null, city: null }))
            return
        }

        if (name === 'state') {
            const stateVal = value === '' ? null : value
            setAnuncio(prev => ({ ...prev, state: stateVal, city: null }))
            return
        }

        if (name === 'city') {
            const cityVal = value === '' ? null : value
            setAnuncio(prev => ({ ...prev, city: cityVal }))
            return
        }

        setAnuncio(prev => ({ ...prev, [name]: value }))
    }

    // validação URL
    const isValidUrl = (url) => {
        try {
            const u = new URL((url || '').toString())
            return u.protocol === 'http:' || u.protocol === 'https:'
        } catch (e) {
            return false
        }
    }

    const fetchAnuncios = async () => {
        if (!user?._id) return
        try {
            setLoadingAds(true)
            const res = await api.post('/anuncios', { userId: user._id })
            const data = res.data?.anuncios || res.data || []
            console.log('Anúncios recebidos:', res)
            setAnuncios(Array.isArray(data) ? data : [])
            setLoadingAds(false)
        } catch (err) {
            console.error('Erro ao buscar anúncios', err)
            showError('Não foi possível carregar os anúncios')
            setLoadingAds(false)
        }
    }

    useEffect(() => {
        fetchAnuncios()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id])

    // helper: monta payload de edição apenas com campos que vierem (não nulos/''/undefined)
    const buildEditPayloadObject = (obj) => {
        const allowed = ['titulo', 'descricao', 'link', 'anuncioTipo', 'countryCode', 'countryName', 'state', 'city', 'userId', 'anuncioId']
        const payload = {}
        for (const k of allowed) {
            const val = obj[k]
            if (val !== undefined && val !== null && val !== '') payload[k] = val
        }
        return payload
    }

    // normaliza valores para comparação
    const _norm = (v) => {
        if (v === undefined) return null
        if (v === null) return null
        if (typeof v === 'string') return v.trim()
        return v
    }

    const hasDraftChanges = (original = {}, draft = {}) => {
        const keys = ['titulo', 'descricao', 'link', 'anuncioTipo', 'countryCode', 'countryName', 'state', 'city']
        for (const k of keys) {
            const o = _norm(original[k])
            const d = _norm(draft[k])
            if ((o || '') !== (d || '')) return true
        }
        if (draft.midia) return true
        return false
    }

    const handleSubmitAnuncio = async (e) => {
        e.preventDefault()

        if (
            !anuncio.titulo?.trim() ||
            !anuncio.descricao?.trim() ||
            !anuncio.link?.trim() ||
            !anuncio.anuncioTipo
        ) {
            showError('Preencha todos os campos obrigatórios: título, descrição, link, tipo')
            return
        }

        if (!isValidUrl(anuncio.link.trim())) {
            showError('Informe um link válido que comece com http:// ou https://')
            return
        }

        const arquivo = anuncio.midia
        if (!arquivo) {
            showError('Anexe uma mídia para o anúncio')
            return
        }
        if (anuncio.anuncioTipo === 'imagem' && arquivo.size > MAX_IMAGE_BYTES) {
            showError('Imagem muito grande. O tamanho máximo permitido é 1 MB.')
            return
        }
        if (anuncio.anuncioTipo === 'video' && arquivo.size > MAX_VIDEO_BYTES) {
            showError('Vídeo muito grande. O tamanho máximo permitido é 50 MB.')
            return
        }

        try {
            const formData = new FormData()
            formData.append('titulo', anuncio.titulo)
            formData.append('descricao', anuncio.descricao)
            formData.append('link', anuncio.link)
            formData.append('anuncioTipo', anuncio.anuncioTipo)
            formData.append('countryCode', anuncio.countryCode ?? '')
            formData.append('country', anuncio.countryName ?? '')
            formData.append('state', anuncio.state ?? '')
            formData.append('city', anuncio.city ?? '')
            formData.append('userId', user._id)
            formData.append('midia', anuncio.midia)

            console.log('CRIAÇÃO - FormData (simulado). Para depurar, mostramos objeto resumido no console:')
            console.log({
                titulo: anuncio.titulo,
                descricao: anuncio.descricao,
                link: anuncio.link,
                anuncioTipo: anuncio.anuncioTipo,
                countryCode: anuncio.countryCode,
                country: anuncio.countryName,
                state: anuncio.state,
                city: anuncio.city,
                userId: user._id,
                midia: anuncio.midia ? { name: anuncio.midia.name, size: anuncio.midia.size, type: anuncio.midia.type } : null
            })

            setIsSubmittingAd(true)
            const resp = await api.post('/criar-anuncio', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            setIsSubmittingAd(false)
            showSuccess('Anúncio enviado com sucesso')

            setAnuncio({
                titulo: '', descricao: '', link: '', anuncioTipo: 'imagem',
                countryCode: null, countryName: null, state: null, city: null, midia: null, anuncioId: null
            })
            if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }

            await fetchAnuncios()
            window.location.reload()
            return resp
        } catch (err) {
            setIsSubmittingAd(false)
            showError(err?.response?.data?.message || 'Erro ao enviar anúncio')
            console.error(err)
        }
    }

    const statesForCountry = getStatesForCountryCode(anuncio.countryCode)
    const citiesForState = getCitiesForState(anuncio.countryCode, anuncio.state)

    const formatDate = (iso) => {
        if (!iso) return ''
        try {
            const d = new Date(iso)
            return d.toLocaleString('pt-BR')
        } catch (e) {
            return iso
        }
    }

    const handleDeletarAnuncio = async (anuncioId) => {
        try {
            const payload = {
                userId: user._id,
                anuncioId: anuncioId
            }
            await api.post('/deletar-anuncio', payload);
            showSuccess('Anúncio deletado com sucesso!')
            await fetchAnuncios()
            window.location.reload()
        } catch (error) {
            console.error(error);
            showError(error?.response?.data?.message || 'Erro ao deletar anúncio')
        }
    };

    // iniciar edição inline/popula form principal e snapshot
    const startEdit = (ad) => {
        const id = ad.anuncioId
        setEditingId(id)
        const original = {
            anuncioId: id,
            titulo: ad.titulo || '',
            descricao: ad.descricao || '',
            link: ad.link || '',
            anuncioTipo: ad.anuncioTipo || 'imagem',
            countryCode: ad.countryCode ?? null,
            countryName: ad.country ?? null,
            state: ad.state ?? null,
            city: ad.city ?? null
        }
        setEditOriginals(prev => ({ ...prev, [id]: original }))

        setEditDraft({
            anuncioId: id,
            titulo: original.titulo,
            descricao: original.descricao,
            link: original.link,
            anuncioTipo: original.anuncioTipo,
            countryCode: original.countryCode,
            countryName: original.countryName,
            state: original.state,
            city: original.city,
            midia: null
        })
        setEditPreviews(prev => ({ ...prev, [id]: ad.midiaUrl || ad.midia || ad.mediaUrl || ad.image || null }))
        setEditFileErrors(prev => ({ ...prev, [id]: '' }))

        // popula form principal também (opcional)
        setAnuncio({
            titulo: ad.titulo || '',
            descricao: ad.descricao || '',
            link: ad.link || '',
            anuncioTipo: ad.anuncioTipo || 'imagem',
            countryCode: ad.countryCode ?? null,
            countryName: ad.country ?? null,
            state: ad.state ?? null,
            city: ad.city ?? null,
            midia: null,
            anuncioId: id
        })
        setMainEditOriginal(original)

        const el = document.getElementById(`ad-card-${id}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const cancelEdit = (id) => {
        setEditingId(null)
        setEditDraft({})
        setEditOriginals(prev => {
            const copy = { ...prev }
            delete copy[id]
            return copy
        })
        const url = editPreviews[id]
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
        setEditPreviews(prev => {
            const copy = { ...prev }
            delete copy[id]
            return copy
        })
        setMainEditOriginal(null)
    }

    const handleEditChange = (id, e) => {
        const { name, value } = e.target
        if (name === 'anuncioTipo') {
            setEditDraft(prev => ({ ...prev, anuncioTipo: value, midia: null }))
            setEditPreviews(prev => ({ ...prev, [id]: null }))
            return
        }
        if (name === 'countryCode') {
            const code = value === '' ? null : value
            const country = getCountryByCode(code)
            setEditDraft(prev => ({ ...prev, countryCode: code, countryName: country?.name || null, state: null, city: null }))
            return
        }
        if (name === 'state') {
            const stateVal = value === '' ? null : value
            setEditDraft(prev => ({ ...prev, state: stateVal, city: null }))
            return
        }
        if (name === 'city') {
            const cityVal = value === '' ? null : value
            setEditDraft(prev => ({ ...prev, city: cityVal }))
            return
        }
        setEditDraft(prev => ({ ...prev, [name]: value }))
    }

    const handleEditFileChange = (id, e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')
        if (editDraft.anuncioTipo === 'imagem' && !isImage) {
            showError('Selecione uma imagem para tipo imagem.')
            return
        }
        if (editDraft.anuncioTipo === 'video' && !isVideo) {
            showError('Selecione um vídeo para tipo vídeo.')
            return
        }
        if (isImage && file.size > MAX_IMAGE_BYTES) {
            showError('Imagem muito grande. Máx 1 MB.')
            return
        }
        if (isVideo && file.size > MAX_VIDEO_BYTES) {
            showError('Vídeo muito grande. Máx 35 MB.')
            return
        }
        if (editPreviews[id]) {
            const existing = editPreviews[id]
            if (existing && existing.startsWith('blob:')) URL.revokeObjectURL(existing)
        }
        const fileUrl = URL.createObjectURL(file)
        setEditPreviews(prev => ({ ...prev, [id]: fileUrl }))
        setEditDraft(prev => ({ ...prev, midia: file }))
    }

    // salvar edição inline (simulado) - envia apenas se houver alterações
    const handleSaveEdit = async (id) => {
        try {
            const draft = editDraft
            if (!draft) return

            // validação básica de campos textuais
            if (
                !draft.titulo?.trim() ||
                !draft.descricao?.trim() ||
                !draft.link?.trim() ||
                !draft.anuncioTipo
            ) {
                showError('Preencha todos os campos obrigatórios: título, descrição, link, tipo')
                return
            }

            if (!isValidUrl(draft.link.trim())) {
                showError('Informe um link válido que comece com http:// ou https://')
                return
            }

            // Se NÃO há arquivo novo (editDraft.midia) mas existe uma preview (URL) consideramos que já há mídia
            const preview = editPreviews[id]
            const arquivo = draft.midia

            // Se não existe arquivo novo e também não existe preview (usuário removeu ou nunca houve),
            // então obrigamos anexar a mídia.
            if (!arquivo && !preview) {
                showError('Anexe uma mídia para o anúncio')
                return
            }

            // Se há arquivo novo, valida tipo/tamanho
            if (arquivo) {
                const isImage = arquivo.type.startsWith('image/')
                const isVideo = arquivo.type.startsWith('video/')
                if (draft.anuncioTipo === 'imagem' && !isImage) {
                    showError('Selecione uma imagem para tipo imagem.')
                    return
                }
                if (draft.anuncioTipo === 'video' && !isVideo) {
                    showError('Selecione um vídeo para tipo vídeo.')
                    return
                }
                if (isImage && arquivo.size > MAX_IMAGE_BYTES) {
                    showError('Imagem muito grande. O tamanho máximo permitido é 1 MB.')
                    return
                }
                if (isVideo && arquivo.size > MAX_VIDEO_BYTES) {
                    showError('Vídeo muito grande. O tamanho máximo permitido é 35 MB.')
                    return
                }
            }

            // comparação com original
            const original = editOriginals[id] || null
            if (!original) {
                showError('Original não encontrado para comparação. Reabra o formulário.')
                return
            }

            // se não houve nenhuma alteração (texto/loc/local) E não há arquivo novo, aborta
            if (!hasDraftChanges(original, draft) && !arquivo) {
                showError('Nenhuma alteração detectada. Altere algum campo antes de enviar.')
                return
            }

            // Se existe arquivo novo -> FormData (envia midia)
            if (arquivo) {
                const formData = new FormData()
                formData.append('anuncioId', draft.anuncioId)

                const obj = {
                    titulo: draft.titulo,
                    descricao: draft.descricao,
                    link: draft.link,
                    anuncioTipo: draft.anuncioTipo,
                    countryCode: draft.countryCode,
                    countryName: draft.countryName,
                    state: draft.state,
                    city: draft.city,
                    userId: user._id,
                }
                for (const k in obj) {
                    const v = obj[k]
                    if (v !== undefined && v !== null && v !== '') formData.append(k, v)
                }
                formData.append('midia', draft.midia)

                console.log('EDIÇÃO INLINE (com mídia) - FormData resumido:')
                console.log(buildEditPayloadObject({ ...obj, anuncioId: draft.anuncioId }))
                console.log('midia:', { name: draft.midia.name, size: draft.midia.size, type: draft.midia.type })

                // aqui você enviaria a requisição real:
                const resp = await api.post('/editar-anuncio', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

                if (resp?.data?.success) {
                    showSuccess('Anúncio editado com sucesso')
                    await fetchAnuncios()
                    cancelEdit(id)
                    window.location.reload()
                }

                return
            }

            // Caso sem arquivo novo -> JSON payload (apenas campos alterados)
            const jsonPayload = buildEditPayloadObject({
                titulo: draft.titulo,
                descricao: draft.descricao,
                link: draft.link,
                anuncioTipo: draft.anuncioTipo,
                countryCode: draft.countryCode,
                countryName: draft.countryName,
                state: draft.state,
                city: draft.city,
                userId: user._id,
                anuncioId: draft.anuncioId
            })

            // req comentada
            const resp = await api.post('/editar-anuncio', jsonPayload)

            if (resp?.data?.success) {
                showSuccess('Anúncio editado com sucesso')
                await fetchAnuncios()
                cancelEdit(id)
                window.location.reload()
            }

            return

        } catch (err) {
            console.error(err)
            showError(err?.response?.data?.msg || 'Erro ao editar anúncio')
        }
    }


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header com gradiente e animação */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-700 dark:to-slate-600 rounded-2xl shadow-xl p-6 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Gerenciar Anúncios</h1>
                            <p className="text-slate-200">Crie, edite e monitore seus anúncios com analytics em tempo real</p>
                        </div>
                    </div>
                </div>

                {/* Seção de Saldo - Responsiva */}
                <motion.div
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-200 dark:border-slate-700"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
                        <div className="flex flex-col space-y-2">
                            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                                Saldo atual: {saldo ? formatarReais(saldo / 175) : 'R$ 0,00'}
                            </h3>
                            <h4 className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                Saldo de impressões: <span className="font-medium text-slate-900 dark:text-white">{saldo}</span>
                            </h4>
                        </div>

                        <div className="w-full lg:w-auto grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={valor}
                                onChange={handleValorChange}
                                placeholder="Valor (ex: 50)"
                                className="col-span-1 sm:col-span-2 rounded-lg p-2 sm:p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                            />
                            <motion.button
                                onClick={handleAdicionarSaldo}
                                disabled={isProcessing}
                                className="col-span-1 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 font-medium text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                                whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                            >
                                {isProcessing ? 'Processando...' : 'Adicionar'}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Layout Principal - Responsivo */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
                    {/* Formulário de Adicionar Anúncio - Responsivo */}
                    <motion.div
                        className="xl:col-span-3 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-slate-900 dark:text-white flex items-center gap-2">
                            <FaPlus className="text-blue-600 dark:text-blue-400" />
                            Adicionar Anúncio
                        </h2>
                        <form onSubmit={handleSubmitAnuncio} className="space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 sm:mb-2">Título</label>
                                    <input
                                        type="text"
                                        name="titulo"
                                        value={anuncio.titulo}
                                        onChange={handleAnuncioChange}
                                        placeholder="Título do anúncio"
                                        className="w-full rounded-lg p-2 sm:p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 sm:mb-2">Tipo de Mídia</label>
                                    <select
                                        name="anuncioTipo"
                                        value={anuncio.anuncioTipo}
                                        onChange={handleAnuncioChange}
                                        className="w-full rounded-lg p-2 sm:p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                                    >
                                        <option value="imagem">📷 Imagem</option>
                                        <option value="video">🎥 Vídeo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 sm:mb-2">Descrição</label>
                                <textarea
                                    name="descricao"
                                    value={anuncio.descricao}
                                    onChange={handleAnuncioChange}
                                    placeholder="Descrição do anúncio"
                                    rows="3"
                                    className="w-full rounded-lg p-2 sm:p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 sm:mb-2">Link</label>
                                <input
                                    type="url"
                                    name="link"
                                    value={anuncio.link}
                                    onChange={handleAnuncioChange}
                                    placeholder="https://exemplo.com"
                                    className="w-full rounded-lg p-2 sm:p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 sm:mb-2">País</label>
                                    <select
                                        name="countryCode"
                                        value={anuncio.countryCode ?? ''}
                                        onChange={handleAnuncioChange}
                                        className="w-full rounded-lg p-2 sm:p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                                    >
                                        <option value="">Selecione o país</option>
                                        {countryList.map(c => <option key={c.code || c.name} value={c.code || c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 sm:mb-2">Estado</label>
                                    <select
                                        name="state"
                                        value={anuncio.state ?? ''}
                                        onChange={handleAnuncioChange}
                                        className="w-full rounded-lg p-2 sm:p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base disabled:opacity-50"
                                        disabled={!getStatesForCountryCode(anuncio.countryCode).length}
                                    >
                                        <option value="">Selecione o estado</option>
                                        {getStatesForCountryCode(anuncio.countryCode).map((s, idx) => {
                                            const opt = mapOption(s)
                                            return <option key={opt.value + idx} value={opt.value}>{opt.label}</option>
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 sm:mb-2">Cidade</label>
                                    <select
                                        name="city"
                                        value={anuncio.city ?? ''}
                                        onChange={handleAnuncioChange}
                                        className="w-full rounded-lg p-2 sm:p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base disabled:opacity-50"
                                        disabled={!getCitiesForState(anuncio.countryCode, anuncio.state).length}
                                    >
                                        <option value="">Selecione a cidade</option>
                                        {getCitiesForState(anuncio.countryCode, anuncio.state).map((c, idx) => {
                                            const opt = mapOption(c)
                                            return <option key={opt.value + idx} value={opt.value}>{opt.label}</option>
                                        })}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mídia do Anúncio</label>
                                <label
                                    htmlFor="fileUpload"
                                    className="w-full rounded-lg p-4 sm:p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                                >
                                    <FaUpload className="text-2xl sm:text-3xl text-slate-400 dark:text-slate-500 mb-2" />
                                    <span className="text-sm sm:text-base text-slate-600 dark:text-slate-400 text-center">
                                        Clique para selecionar {anuncio.anuncioTipo === 'imagem' ? 'uma imagem' : 'um vídeo'}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                        {anuncio.anuncioTipo === 'imagem' ? 'Máx: 1MB' : 'Máx: 35MB'}
                                    </span>
                                </label>
                                <input
                                    type="file"
                                    id="fileUpload"
                                    accept={anuncio.anuncioTipo === 'imagem' ? 'image/*' : 'video/*'}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                            {previewUrl && (
                                <div className="mt-4">
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pré-visualização</label>
                                    {anuncio.anuncioTipo === 'imagem' ? (
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="max-h-32 sm:max-h-40 rounded-lg w-full object-contain bg-slate-100 dark:bg-slate-700"
                                        />
                                    ) : (
                                        <video
                                            src={previewUrl}
                                            controls
                                            className="max-h-40 sm:max-h-48 rounded-lg w-full object-contain bg-slate-100 dark:bg-slate-700"
                                        />
                                    )}
                                </div>
                            )}

                            <motion.button
                                type="submit"
                                className="w-full px-4 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 font-medium text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                disabled={isSubmittingAd}
                                whileHover={{ scale: isSubmittingAd ? 1 : 1.02 }}
                                whileTap={{ scale: isSubmittingAd ? 1 : 0.98 }}
                            >
                                {isSubmittingAd ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <FaPlus className="text-sm" />
                                        {anuncio.anuncioId ? 'Salvar Alterações' : 'Adicionar Anúncio'}
                                    </>
                                )}
                            </motion.button>
                        </form>
                    </motion.div>

                    {/* Lista de Anúncios - Responsiva */}
                    <motion.div
                        className="xl:col-span-2 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-slate-900 dark:text-white flex items-center gap-2">
                            <FaBullhorn className="text-green-600 dark:text-green-400" />
                            Seus Anúncios
                        </h2>

                        {loadingAds && (
                            <div className="space-y-3 sm:space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-20 sm:h-24 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        )}

                        {!loadingAds && anuncios.length === 0 && (
                            <div className="text-center py-8 sm:py-12">
                                <FaBullhorn className="text-4xl sm:text-5xl text-slate-300 dark:text-slate-600 mx-auto mb-3 sm:mb-4" />
                                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
                                    Nenhum anúncio encontrado.
                                </p>
                                <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1">
                                    Crie seu primeiro anúncio usando o formulário ao lado.
                                </p>
                            </div>
                        )}

                        <div className="space-y-3 sm:space-y-4">
                            {anuncios.map((ad) => {
                                const id = ad.anuncioId || ad._id || ad.id
                                const mediaUrl = ad.midiaUrl || ad.midia || ad.mediaUrl || ad.image
                                const isEditingThis = editingId === id
                                const estatisticas = ad.estatisticas || { impressoes: 0, cliques: 0 }

                                // Dados para os gráficos (simulados - você pode substituir pelos dados reais)
                                const chartData = [
                                    { name: 'Seg', impressoes: Math.floor(estatisticas.impressoes * 0.1), cliques: Math.floor(estatisticas.cliques * 0.1) },
                                    { name: 'Ter', impressoes: Math.floor(estatisticas.impressoes * 0.15), cliques: Math.floor(estatisticas.cliques * 0.15) },
                                    { name: 'Qua', impressoes: Math.floor(estatisticas.impressoes * 0.2), cliques: Math.floor(estatisticas.cliques * 0.2) },
                                    { name: 'Qui', impressoes: Math.floor(estatisticas.impressoes * 0.25), cliques: Math.floor(estatisticas.cliques * 0.25) },
                                    { name: 'Sex', impressoes: Math.floor(estatisticas.impressoes * 0.3), cliques: Math.floor(estatisticas.cliques * 0.3) },
                                ]

                                return (
                                    <motion.div
                                        key={id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border ${ad.status === 'ativo'
                                            ? 'border-emerald-200 dark:border-emerald-700'
                                            : 'border-red-200 dark:border-red-700'
                                            }`}
                                    >
                                        {/* Status Badge */}
                                        <div className={`px-4 py-2 ${ad.status === 'ativo'
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                                            : 'bg-gradient-to-r from-red-500 to-red-600'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-semibold text-sm">
                                                    {ad.status === 'ativo' ? '🟢 Ativo' : '🔴 Inativo'}
                                                </span>
                                                <span className="text-white/80 text-xs">
                                                    {ad.status === 'ativo' ? 'Em exibição' : 'Aguardando aprovação'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            {!isEditingThis ? (
                                                <>
                                                    {/* Mídia do anúncio */}
                                                    <div className="relative h-48 bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden mb-4">
                                                        {ad.anuncioTipo === 'video' && mediaUrl ? (
                                                            <video src={buildImageUrl(mediaUrl, 'video')} controls className="h-full w-full object-cover" />
                                                        ) : ad.anuncioTipo === 'imagem' && mediaUrl ? (
                                                            <img src={buildImageUrl(mediaUrl)} alt={ad.titulo} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center text-slate-400">
                                                                <FaImage className="text-4xl" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Informações do anúncio */}
                                                    <div className="space-y-3 mb-6">
                                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{ad.titulo}</h3>
                                                        <p className="text-slate-600 dark:text-slate-300 text-sm">{ad.descricao}</p>

                                                        {/* Localização */}
                                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                            <FaLocationPin className="text-red-500" />
                                                            <span>
                                                                {!ad.country ? 'Brasil e Portugal' :
                                                                    !ad.state ? ad.country :
                                                                        !ad.city ? `${ad.country} > ${ad.state}` :
                                                                            `${ad.country} > ${ad.state} > ${ad.city}`}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Analytics Cards */}
                                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <FaEye className="text-blue-600 dark:text-blue-400 text-lg" />
                                                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">IMPRESSÕES</span>
                                                            </div>
                                                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                                                {estatisticas.impressoes.toLocaleString()}
                                                            </div>
                                                        </div>

                                                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-700">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <FaHandPointer className="text-emerald-600 dark:text-emerald-400 text-lg" />
                                                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">CLIQUES</span>
                                                            </div>
                                                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                                                {estatisticas.cliques.toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Gráfico de Performance */}
                                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <FaChartLine className="text-slate-600 dark:text-slate-300" />
                                                            <h4 className="font-semibold text-slate-700 dark:text-slate-200">Performance Semanal</h4>
                                                        </div>
                                                        <div className="h-32">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={chartData}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                                                                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                                                                    <Tooltip
                                                                        contentStyle={{
                                                                            backgroundColor: '#1e293b',
                                                                            border: 'none',
                                                                            borderRadius: '8px',
                                                                            color: '#fff'
                                                                        }}
                                                                    />
                                                                    <Line
                                                                        type="monotone"
                                                                        dataKey="impressoes"
                                                                        stroke="#3b82f6"
                                                                        strokeWidth={2}
                                                                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                                                    />
                                                                    <Line
                                                                        type="monotone"
                                                                        dataKey="cliques"
                                                                        stroke="#10b981"
                                                                        strokeWidth={2}
                                                                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                                                                    />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>

                                                    {/* Ações */}
                                                    <div className="flex flex-wrap gap-3">
                                                        <a
                                                            href={ad.link || '#'}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium underline transition-colors"
                                                        >
                                                            Abrir link
                                                        </a>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                                            onClick={() => startEdit(ad)}
                                                        >
                                                            <FaEdit className="inline mr-2" />
                                                            Editar
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                                            onClick={() => handleDeletarAnuncio(ad.anuncioId)}
                                                        >
                                                            <FaTrash className="inline mr-2" />
                                                            Deletar
                                                        </motion.button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="space-y-6">
                                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Editando Anúncio</h3>

                                                    {/* Título e Tipo de Mídia */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                                Título
                                                            </label>
                                                            <input
                                                                name="titulo"
                                                                value={editDraft.titulo ?? ''}
                                                                onChange={(e) => handleEditChange(id, e)}
                                                                placeholder="Título"
                                                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                                Tipo de Mídia
                                                            </label>
                                                            <select
                                                                name="anuncioTipo"
                                                                value={editDraft.anuncioTipo ?? 'imagem'}
                                                                onChange={(e) => handleEditChange(id, e)}
                                                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                                                            >
                                                                <option value="imagem">Imagem</option>
                                                                <option value="video">Vídeo</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Descrição */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                            Descrição
                                                        </label>
                                                        <input
                                                            type='text'
                                                            name="descricao"
                                                            value={editDraft.descricao ?? ''}
                                                            onChange={(e) => handleEditChange(id, e)}
                                                            placeholder="Descrição"
                                                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                                                        />
                                                    </div>

                                                    {/* Link */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                            Link
                                                        </label>
                                                        <input
                                                            name="link"
                                                            type="text"
                                                            value={editDraft.link ?? ''}
                                                            onChange={(e) => handleEditChange(id, e)}
                                                            placeholder="Link"
                                                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                                                        />
                                                    </div>

                                                    {/* Localidade */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                            Localidade do Anúncio
                                                        </label>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <select
                                                                name="countryCode"
                                                                value={editDraft.countryCode ?? ''}
                                                                onChange={(e) => handleEditChange(id, e)}
                                                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200"
                                                            >
                                                                <option value="">Selecione o país</option>
                                                                {countryList.map(c => <option key={c.code || c.name} value={c.code || c.name}>{c.name}</option>)}
                                                            </select>
                                                            <select
                                                                name="state"
                                                                value={editDraft.state ?? ''}
                                                                onChange={(e) => handleEditChange(id, e)}
                                                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200 disabled:opacity-50"
                                                                disabled={!getStatesForCountryCode(editDraft.countryCode).length}
                                                            >
                                                                <option value="">Selecione o estado</option>
                                                                {getStatesForCountryCode(editDraft.countryCode).map((s, idx) => {
                                                                    const opt = mapOption(s)
                                                                    return <option key={opt.value + idx} value={opt.value}>{opt.label}</option>
                                                                })}
                                                            </select>
                                                            <select
                                                                name="city"
                                                                value={editDraft.city ?? ''}
                                                                onChange={(e) => handleEditChange(id, e)}
                                                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200 disabled:opacity-50"
                                                                disabled={!getCitiesForState(editDraft.countryCode, editDraft.state).length}
                                                            >
                                                                <option value="">Selecione a cidade</option>
                                                                {getCitiesForState(editDraft.countryCode, editDraft.state).map((c, idx) => {
                                                                    const opt = mapOption(c)
                                                                    return <option key={opt.value + idx} value={opt.value}>{opt.label}</option>
                                                                })}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Upload de Mídia */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                            Mídia do Anúncio
                                                        </label>
                                                        <label
                                                            htmlFor={`editFileUpload-${id}`}
                                                            className="w-full px-4 py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-all duration-200"
                                                        >
                                                            <FaCloudUploadAlt className="text-3xl text-slate-400 mb-2" />
                                                            <span className="text-slate-600 dark:text-slate-300">Selecione a mídia do anúncio</span>
                                                            <span className="text-xs text-slate-400 mt-1">
                                                                {editDraft.anuncioTipo === 'imagem' ? 'Imagens aceitas' : 'Vídeos aceitos'}
                                                            </span>
                                                        </label>
                                                        <input
                                                            type="file"
                                                            id={`editFileUpload-${id}`}
                                                            accept={editDraft.anuncioTipo === 'imagem' ? 'image/*' : 'video/*'}
                                                            onChange={(e) => handleEditFileChange(id, e)}
                                                            className='hidden'
                                                        />
                                                    </div>

                                                    {/* Preview da Mídia */}
                                                    {editPreviews[id] && (
                                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                                                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Preview</h4>
                                                            {editDraft.anuncioTipo === 'imagem' ? (
                                                                <img
                                                                    src={buildImageUrl(editPreviews[id]) || editPreviews[id]}
                                                                    alt="preview-edit"
                                                                    className="max-h-40 rounded-lg w-full object-contain"
                                                                />
                                                            ) : (
                                                                <video
                                                                    src={buildImageUrl(editPreviews[id], 'video') || editPreviews[id]}
                                                                    controls
                                                                    className="max-h-48 rounded-lg w-full object-contain"
                                                                />
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Ações */}
                                                    <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-slate-600">
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                                                            onClick={() => handleSaveEdit(id)}
                                                        >
                                                            <FaSave />
                                                            Salvar
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                                                            onClick={() => cancelEdit(id)}
                                                        >
                                                            <FaTimes />
                                                            Cancelar
                                                        </motion.button>
                                                    </div>

                                                    <div className="text-xs text-slate-400 mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                        ⚠️ A requisição de edição está comentada — verifique o payload no console ao clicar em Salvar.
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </motion.div>
                                )
                            })}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default AnunciosDash

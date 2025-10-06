import React, { useState, useEffect } from 'react'
import api from '../../../Api.js'
// Ajuste o caminho abaixo para onde você salvar seu JSON
import locations from '../../../data/locations.json'
import { FaLocationPin } from 'react-icons/fa6'
import { useToast } from '../../../components/Toast.jsx'
import { buildImageUrl } from '../../../utils/imageUtils.js'

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
            const res = await api.get('/anuncios', { params: { userId: user._id } })
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
        <div className={`p-6 rounded-lg shadow-md flex flex-col space-y-6 ${themeClasses.container}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className='flex flex-col space-y-1'>
                    <h3 className="text-xl font-semibold">Saldo atual (valor): {saldo ? formatarReais(saldo / 175) : 'R$ 0,00'}</h3>
                    <h4 className="text-sm text-gray-500">Saldo de impressões: <span className="font-medium">{saldo}</span></h4>
                </div>

                <div className="w-full grid grid-cols-3 flex-wrap items-center gap-2">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={valor}
                        onChange={handleValorChange}
                        placeholder="Valor a adicionar (ex: 50 - apenas números inteiros)"
                        className={`col-span-3 md:col-span-2 rounded-md p-2 border ${themeClasses.input} focus:ring-2 focus:ring-blue-500 outline-none`}
                    />
                    <button onClick={handleAdicionarSaldo} disabled={isProcessing} className={`${themeClasses.button} px-4 col-span-3 md:col-span-1 py-2 rounded-md transition-colors duration-200 ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        {isProcessing ? 'Processando...' : 'Adicionar Saldo'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-5 gap-6">
                <div className={`col-span-5 lg:col-span-3 p-4 rounded-lg border ${tema === 'dark' ? 'border-gray-700' : 'border-gray-200'} ${themeClasses.container}`}>
                    <h2 className="text-lg font-bold mb-3">Adicionar Anúncio</h2>
                    <form onSubmit={handleSubmitAnuncio} className="space-y-3">
                        <label className="block text-sm">Titulo</label>
                        <input type="text" name="titulo" value={anuncio.titulo} onChange={handleAnuncioChange} placeholder="Título" className={`w-full rounded-md p-2 border ${themeClasses.input}`} />
                        <label className="block text-sm mt-2">Descrição</label>
                        <input type='text' name="descricao" value={anuncio.descricao} onChange={handleAnuncioChange} placeholder="Descrição" className={`w-full rounded-md p-2 border ${themeClasses.input}`} />
                        <label className="block text-sm mt-2">Link</label>
                        <input type="text" name="link" value={anuncio.link} onChange={handleAnuncioChange} placeholder="Link" className={`w-full rounded-md p-2 border ${themeClasses.input}`} />

                        <label className="block text-sm mt-2">Tipo de midia</label>
                        <select name="anuncioTipo" value={anuncio.anuncioTipo} onChange={handleAnuncioChange} className={`w-full rounded-md p-2 border ${themeClasses.input}`}>
                            <option value="imagem">Imagem</option>
                            <option value="video">Vídeo</option>
                        </select>

                        <label className="block text-sm mt-2">País</label>
                        <select name="countryCode" value={anuncio.countryCode ?? ''} onChange={handleAnuncioChange} className={`w-full rounded-md p-2 border ${themeClasses.input}`}>
                            <option value="">Selecione o país</option>
                            {countryList.map(c => <option key={c.code || c.name} value={c.code || c.name}>{c.name}</option>)}
                        </select>

                        <label className="block text-sm mt-2">Estado</label>
                        <select name="state" value={anuncio.state ?? ''} onChange={handleAnuncioChange} className={`w-full rounded-md p-2 border ${themeClasses.input}`} disabled={!getStatesForCountryCode(anuncio.countryCode).length}>
                            <option value="">Selecione o estado</option>
                            {getStatesForCountryCode(anuncio.countryCode).map((s, idx) => {
                                const opt = mapOption(s)
                                return <option key={opt.value + idx} value={opt.value}>{opt.label}</option>
                            })}
                        </select>

                        <label className="block text-sm mt-2">Cidade</label>
                        <select name="city" value={anuncio.city ?? ''} onChange={handleAnuncioChange} className={`w-full rounded-md p-2 border ${themeClasses.input}`} disabled={!getCitiesForState(anuncio.countryCode, anuncio.state).length}>
                            <option value="">Selecione a cidade</option>
                            {getCitiesForState(anuncio.countryCode, anuncio.state).map((c, idx) => {
                                const opt = mapOption(c)
                                return <option key={opt.value + idx} value={opt.value}>{opt.label}</option>
                            })}
                        </select>

                        <label for="fileUpload" className={`w-full rounded-md p-2 border ${themeClasses.input} flex flex-col items-center justify-center cursor-pointer mt-2`}>
                            <span>Selecione a midia do anuncio.</span>
                        </label>
                        <input type="file" id='fileUpload' accept={anuncio.anuncioTipo === 'imagem' ? 'image/*' : 'video/*'} onChange={handleFileChange} className='hidden' />

                        {previewUrl && anuncio.anuncioTipo === 'imagem' && <img src={previewUrl} alt="preview" className="max-h-40 rounded-md mt-2 w-full object-contain" />}
                        {previewUrl && anuncio.anuncioTipo === 'video' && <video src={previewUrl} controls className="max-h-48 rounded-md mt-2 w-full object-contain" />}

                        <button type="submit" className={`${themeClasses.button} px-4 py-2 rounded-md transition-colors duration-200 w-full ${isSubmittingAd ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {isSubmittingAd ? 'Enviando...' : (anuncio.anuncioId ? 'Salvar Alterações' : 'Adicionar Anúncio')}
                        </button>
                    </form>
                </div>

                <div className={`col-span-5 lg:col-span-2 p-4 rounded-lg border ${tema === 'dark' ? 'border-gray-700' : 'border-gray-200'} ${themeClasses.container}`}>
                    <h2 className="text-lg font-bold mb-3">Seus Anúncios</h2>

                    {loadingAds && (
                        <div className="space-y-2">
                            <div className="h-24 bg-gray-100 rounded animate-pulse" />
                            <div className="h-24 bg-gray-100 rounded animate-pulse" />
                        </div>
                    )}

                    {!loadingAds && anuncios.length === 0 && <div className="text-sm text-gray-500">Nenhum anúncio encontrado. Crie o primeiro anúncio usando o formulário.</div>}

                    <div className="grid grid-cols-1 gap-4 mt-3">
                        {anuncios.map((ad) => {
                            const id = ad.anuncioId || ad._id || ad.id
                            const mediaUrl = ad.midiaUrl || ad.midia || ad.mediaUrl || ad.image
                            const isEditingThis = editingId === id
                            const estatisticas = ad.estatisticas || { impressoes: 0, cliques: 0 }

                            return (
                                <div id={`ad-card-${id}`} key={id} className={`rounded-lg overflow-hidden ${ad.status === 'ativo' ? 'bg-green-400/30 border-green-400' : 'bg-red-400/30 border-red-400'} border p-3 rounded-2xl shadow-sm`}>
                                    <div className="relative p-3">
                                        <h1 className='text-xl font-light mb-2'>Status: <span className='font-semibold'>{ad.status}</span></h1>
                                        <h1 className='text-xl font-light mb-2'>{ad.status === 'ativo' ? 'Anuncio em atividade.' : 'Anuncio desativado até o momento. (aguarde o processamento dos admins.)'}</h1>
                                        {!isEditingThis ? (
                                            <>
                                                <div className="relative h-40 flex items-center justify-center mb-3">
                                                    {ad.anuncioTipo === 'video' && mediaUrl ? (
                                                        <video src={buildImageUrl(mediaUrl)} controls className="h-full w-full object-cover" />
                                                    ) : ad.anuncioTipo === 'imagem' && mediaUrl ? (
                                                        <img src={buildImageUrl(mediaUrl)} alt={ad.titulo} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="text-sm text-gray-500">Sem mídia</div>
                                                    )}
                                                </div>

                                                <h3 className="font-light text-xl"><span className='font-semibold'>Titulo: </span> {ad.titulo}</h3>
                                                <p className="font-light text-sm"><span className='font-semibold'>Descrição: </span> {ad.descricao}</p>
                                                <p className="text-sm mt-3 font-semibold line-clamp-1 flex flex-row items-center gap-1">Localidade do anuncio <FaLocationPin color={'red'} /></p>
                                                <div className="text-xs mt-1 font-light">
                                                    Disponível {!ad.country ? 'em Brasil e Portugal' :
                                                        !ad.state ? `em ${ad.country}` :
                                                            !ad.city ? `em ${ad.country} > ${ad.state}` :
                                                                `em ${ad.country} > ${ad.state} > ${ad.city}`}
                                                </div>

                                                {/* Estatisticas */}
                                                <div className={`p-2 bg-green-300/20 rounded mt-3 border border-green-400 text-green-400 text-sm ${tema === 'dark' ? 'bg-green-900/30 border-green-700 text-green-300' : ''}`}>
                                                    <h1>Impressoes: {estatisticas.impressoes.impressoesTotais}</h1>
                                                    <h1>Cliques: {estatisticas.cliques.cliquesTotais}</h1>
                                                </div>

                                                <div className="mt-3 flex items-center gap-2">
                                                    <a href={ad.link || '#'} target="_blank" rel="noreferrer" className="text-sm underline">Abrir link</a>
                                                    <button className={`${themeClasses.button} px-4 py-2 rounded-md`} onClick={() => startEdit(ad)}>Editar Anúncio</button>
                                                    <button className='bg-red-500 text-white font-bolt cursor-pointer p-2 rounded-2xl' onClick={() => handleDeletarAnuncio(ad.anuncioId)}>Deletar Anúncio</button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-md">Titulo: </label>
                                                        <input name="titulo" value={editDraft.titulo ?? ''} onChange={(e) => handleEditChange(id, e)} placeholder="Título" className={`w-full rounded-md p-2 border ${themeClasses.input}`} />
                                                    </div>
                                                    <div>
                                                        <label className="text-md">Tipo de midia: </label>
                                                        <select name="anuncioTipo" value={editDraft.anuncioTipo ?? 'imagem'} onChange={(e) => handleEditChange(id, e)} className={`w-full rounded-md p-2 border ${themeClasses.input}`}>
                                                            <option value="imagem">Imagem</option>
                                                            <option value="video">Vídeo</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <label className="block text-sm mt-2">Descrição</label>
                                                <input type='text' name="descricao" value={editDraft.descricao ?? ''} onChange={(e) => handleEditChange(id, e)} placeholder="Descrição" className={`w-full rounded-md p-2 border ${themeClasses.input}`} />

                                                <label className="block text-sm mt-2">Link</label>
                                                <input name="link" type="text" value={editDraft.link ?? ''} onChange={(e) => handleEditChange(id, e)} placeholder="Link" className={`w-full rounded-md p-2 border ${themeClasses.input}`} />

                                                <label className="block text-sm mt-2">Localidade do anúncio:</label>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    <select name="countryCode" value={editDraft.countryCode ?? ''} onChange={(e) => handleEditChange(id, e)} className={`w-full rounded-md p-2 border ${themeClasses.input}`}>
                                                        <option value="">Selecione o país</option>
                                                        {countryList.map(c => <option key={c.code || c.name} value={c.code || c.name}>{c.name}</option>)}
                                                    </select>
                                                    <select name="state" value={editDraft.state ?? ''} onChange={(e) => handleEditChange(id, e)} className={`w-full rounded-md p-2 border ${themeClasses.input}`} disabled={!getStatesForCountryCode(editDraft.countryCode).length}>
                                                        <option value="">Selecione o estado</option>
                                                        {getStatesForCountryCode(editDraft.countryCode).map((s, idx) => {
                                                            const opt = mapOption(s)
                                                            return <option key={opt.value + idx} value={opt.value}>{opt.label}</option>
                                                        })}
                                                    </select>
                                                    <select name="city" value={editDraft.city ?? ''} onChange={(e) => handleEditChange(id, e)} className={`w-full rounded-md p-2 border ${themeClasses.input}`} disabled={!getCitiesForState(editDraft.countryCode, editDraft.state).length}>
                                                        <option value="">Selecione a cidade</option>
                                                        {getCitiesForState(editDraft.countryCode, editDraft.state).map((c, idx) => {
                                                            const opt = mapOption(c)
                                                            return <option key={opt.value + idx} value={opt.value}>{opt.label}</option>
                                                        })}
                                                    </select>
                                                </div>

                                                <label for={`editFileUpload-${id}`} className={`w-full rounded-md p-2 border ${themeClasses.input} flex flex-col items-center justify-center cursor-pointer mt-2`}>
                                                    <span>Selecione a midia do anuncio.</span>
                                                </label>
                                                <input type="file" id={`editFileUpload-${id}`} accept={editDraft.anuncioTipo === 'imagem' ? 'image/*' : 'video/*'} onChange={(e) => handleEditFileChange(id, e)} className='hidden' />

                                                {editPreviews[id] && editDraft.anuncioTipo === 'imagem' && <img src={editPreviews[id]} alt="preview-edit" className="max-h-40 rounded-md mt-2 w-full object-contain" />}
                                                {editPreviews[id] && editDraft.anuncioTipo === 'video' && <video src={editPreviews[id]} controls className="max-h-48 rounded-md mt-2 w-full object-contain" />}

                                                <div className="flex items-center gap-2 mt-2">
                                                    <button className={`${themeClasses.button} px-4 py-2 rounded-md`} onClick={() => handleSaveEdit(id)}>Salvar</button>
                                                    <button className='bg-gray-500 text-white px-4 py-2 rounded-md' onClick={() => cancelEdit(id)}>Cancelar</button>
                                                </div>

                                                <div className="text-xs text-gray-400 mt-1">A requisição de edição está comentada — verifique o payload no console ao clicar em Salvar.</div>

                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AnunciosDash

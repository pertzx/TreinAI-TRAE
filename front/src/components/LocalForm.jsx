import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LuMapPin, 
  LuImage, 
  LuX, 
  LuCheck,
  LuBuilding2,
  LuGlobe,
  LuLink,
  LuFileText,
  LuUpload
} from 'react-icons/lu';
import { FiLoader } from 'react-icons/fi';
import { FiAlertCircle } from 'react-icons/fi';
import locationsRaw from '../data/locations.json';
import { validateLocalData, sanitizeLocalData, validateImageFile } from '../utils/security';

const LocalForm = ({ 
  user, 
  tema = 'light', 
  onSubmit, 
  onCancel, 
  initialData = null,
  isLoading = false 
}) => {
  // Estados do formulario
  const [formData, setFormData] = useState({
    localName: '',
    localDescricao: '',
    link: '',
    localType: 'outro',
    country: '',
    countryCode: '',
    state: '',
    city: '',
    image: null
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Dados de localizacao
  const countries = useMemo(() => (locationsRaw?.countries || []), []);
  const states = useMemo(() => {
    if (!formData.country) return [];

    const byCountry = locationsRaw?.byCountry?.[formData.country];
    return byCountry?.states || [];
  }, [formData.country]);

  const cities = useMemo(() => {
    if (!formData.country || !formData.state) return [];
    const byCountry = locationsRaw?.byCountry?.[formData.country];
    const citiesByState = byCountry?.citiesByState?.[formData.state];
    return citiesByState || [];
  }, [formData.country, formData.state]);

  // Tipos de local
  const localTypes = [
    { value: 'academia', label: 'Academia', price: 'R$ 180/mês' },
    { value: 'consultorio-do-nutricionista', label: 'Consultório do Nutricionista', price: 'R$ 100/mês' },
    { value: 'clinica-de-fisioterapia', label: 'Clínica de Fisioterapia', price: 'R$ 100/mês' },
    { value: 'loja', label: 'Loja', price: 'R$ 180/mês' },
    { value: 'outro', label: 'Outro', price: 'R$ 50/mês' }
  ];

  // Inicializar dados se fornecidos
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      }
    }
  }, [initialData]);

  // Tema dinamico
  const theme = {
    bg: tema === 'dark' ? 'bg-gray-900' : 'bg-white',
    cardBg: tema === 'dark' ? 'bg-gray-800' : 'bg-white',
    text: tema === 'dark' ? 'text-white' : 'text-gray-900',
    textSecondary: tema === 'dark' ? 'text-gray-300' : 'text-gray-600',
    border: tema === 'dark' ? 'border-gray-700' : 'border-gray-200',
    input: tema === 'dark' 
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500',
    button: {
      primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white',
      secondary: tema === 'dark' 
        ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' 
        : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300'
    }
  };

  // Handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    if (field === 'country') {
      const countryObj = (locationsRaw?.countries || []).find((c) => c.name === value);
      const code = countryObj?.code || '';
      setFormData(prev => ({ ...prev, countryCode: code, state: '', city: '' }));
    } else if (field === 'state') {
      setFormData(prev => ({ ...prev, city: '' }));
    }
  };

  const handleImageChange = (file) => {
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, image: validation.error }));
      return;
    }

    setFormData(prev => ({ ...prev, image: file }));
    setErrors(prev => ({ ...prev, image: null }));

    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageChange(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar dados
    const validation = validateLocalData(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Sanitizar dados
    const sanitizedData = sanitizeLocalData(formData);
    
    // Chamar callback
    onSubmit(sanitizedData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`${theme.cardBg} rounded-2xl shadow-xl border ${theme.border} overflow-hidden`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <LuBuilding2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${theme.text}`}>
                {initialData ? 'Editar Local' : 'Adicionar Novo Local'}
              </h2>
              <p className={`text-sm ${theme.textSecondary}`}>
                Preencha as informacoes do seu estabelecimento
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${theme.textSecondary}`}
            >
              <LuX className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Tipo de Local */}
        <div>
          <label className={`block text-sm font-medium mb-3 ${theme.text}`}>
            <LuBuilding2 className="inline w-4 h-4 mr-2" />
            Tipo de Estabelecimento
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {localTypes.map((type) => (
              <motion.div
                key={type.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  formData.localType === type.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : `${theme.border} hover:border-blue-300`
                }`}
                onClick={() => handleInputChange('localType', type.value)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium text-sm ${theme.text}`}>{type.label}</p>
                    <p className={`text-xs ${theme.textSecondary}`}>{type.price}</p>
                  </div>
                  {formData.localType === type.value && (
                    <LuCheck className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          {errors.localType && (
            <p className="mt-2 text-sm text-red-500 flex items-center">
              <FiAlertCircle className="w-4 h-4 mr-1" />
              {errors.localType}
            </p>
          )}
        </div>

        {/* Nome do Local */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
            <LuBuilding2 className="inline w-4 h-4 mr-2" />
            Nome do Estabelecimento *
          </label>
          <input
            type="text"
            value={formData.localName}
            onChange={(e) => handleInputChange('localName', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${theme.input}`}
            placeholder="Ex: Academia Fitness Pro"
            maxLength={100}
          />
          {errors.localName && (
            <p className="mt-2 text-sm text-red-500 flex items-center">
              <FiAlertCircle className="w-4 h-4 mr-1" />
              {errors.localName}
            </p>
          )}
        </div>

        {/* Descricao */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
            <LuFileText className="inline w-4 h-4 mr-2" />
            Descricao *
          </label>
          <textarea
            value={formData.localDescricao}
            onChange={(e) => handleInputChange('localDescricao', e.target.value)}
            rows={4}
            className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none ${theme.input}`}
            placeholder="Descreva seu estabelecimento, servicos oferecidos, diferenciais..."
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-2">
            {errors.localDescricao && (
              <p className="text-sm text-red-500 flex items-center">
                <FiAlertCircle className="w-4 h-4 mr-1" />
                {errors.localDescricao}
              </p>
            )}
            <p className={`text-xs ${theme.textSecondary}`}>
              {formData.localDescricao.length}/500
            </p>
          </div>
        </div>

        {/* Link/Website */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
            <LuLink className="inline w-4 h-4 mr-2" />
            Website ou Link *
          </label>
          <input
            type="url"
            value={formData.link}
            onChange={(e) => handleInputChange('link', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${theme.input}`}
            placeholder="https://www.seusite.com.br"
          />
          {errors.link && (
            <p className="mt-2 text-sm text-red-500 flex items-center">
              <FiAlertCircle className="w-4 h-4 mr-1" />
              {errors.link}
            </p>
          )}
        </div>

        {/* Localizacao */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pais */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
              <LuGlobe className="inline w-4 h-4 mr-2" />
              Pais *
            </label>
            <select
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${theme.input}`}
            >
              <option value="">Selecione o pais</option>
              {countries.map((country) => (
                <option key={country.code} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.country && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <FiAlertCircle className="w-4 h-4 mr-1" />
                {errors.country}
              </p>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
              <LuMapPin className="inline w-4 h-4 mr-2" />
              Estado *
            </label>
            <select
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              disabled={!formData.country}
              className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${theme.input} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">Selecione o estado</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <FiAlertCircle className="w-4 h-4 mr-1" />
                {errors.state}
              </p>
            )}
          </div>

          {/* Cidade */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
              <LuMapPin className="inline w-4 h-4 mr-2" />
              Cidade *
            </label>
            <select
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              disabled={!formData.state}
              className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${theme.input} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">Selecione a cidade</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            {errors.city && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <FiAlertCircle className="w-4 h-4 mr-1" />
                {errors.city}
              </p>
            )}
          </div>
        </div>

        {/* Upload de Imagem */}
        <div>
          <label className={`block text-sm font-medium mb-3 ${theme.text}`}>
            <LuImage className="inline w-4 h-4 mr-2" />
            Imagem do Estabelecimento
          </label>
          
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : `${theme.border} hover:border-blue-300`
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <LuUpload className={`w-12 h-12 mx-auto mb-4 ${theme.textSecondary}`} />
              <p className={`text-lg font-medium mb-2 ${theme.text}`}>
                Clique ou arraste uma imagem
              </p>
              <p className={`text-sm ${theme.textSecondary}`}>
                PNG, JPG ou WEBP ate 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e.target.files[0])}
                className="hidden"
              />
            </div>
          )}
          
          {errors.image && (
            <p className="mt-2 text-sm text-red-500 flex items-center">
              <FiAlertCircle className="w-4 h-4 mr-1" />
              {errors.image}
            </p>
          )}
        </div>

        {/* Botoes */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className={`px-6 py-3 rounded-xl font-medium transition-colors border ${theme.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancelar
            </button>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] ${theme.button.primary} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <FiLoader className="w-5 h-5 mr-2 animate-spin" />
                Processando...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <LuCheck className="w-5 h-5 mr-2" />
                {initialData ? 'Atualizar Local' : 'Criar Local'}
              </div>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default LocalForm;

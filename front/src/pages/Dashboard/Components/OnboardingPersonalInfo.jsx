import React, { useState, useEffect } from 'react';
import api from '../../../Api';
import locationsData from '../../../data/locations.json';

const OnboardingPersonalInfo = ({ user, setUser, onComplete, tema = 'light' }) => {
  const [formData, setFormData] = useState({
    name: user?.username || '',
    idade: '',
    country: '',
    state: '',
    city: ''
  });

  const [availableStates, setAvailableStates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  // Classes CSS baseadas no tema
  const getThemeClasses = () => {
    const isDark = tema === 'dark';
    
    return {
      container: isDark 
        ? 'min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4'
        : 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4',
      
      card: isDark 
        ? 'bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-700'
        : 'bg-white rounded-2xl shadow-xl p-8 w-full max-w-md',
      
      title: isDark 
        ? 'text-3xl font-bold text-white mb-2'
        : 'text-3xl font-bold text-gray-800 mb-2',
      
      subtitle: isDark 
        ? 'text-gray-300'
        : 'text-gray-600',
      
      label: isDark 
        ? 'block text-sm font-medium text-gray-300 mb-2'
        : 'block text-sm font-medium text-gray-700 mb-2',
      
      input: (hasError) => isDark 
        ? `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-gray-700 text-white placeholder-gray-400 ${
            hasError ? 'border-red-500 bg-red-900/20' : 'border-gray-600'
          }`
        : `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
          }`,
      
      select: (hasError, disabled) => isDark 
        ? `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-gray-700 text-white ${
            hasError ? 'border-red-500 bg-red-900/20' : 'border-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
        : `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
      
      errorContainer: isDark 
        ? 'bg-red-900/20 border border-red-800 rounded-lg p-4'
        : 'bg-red-50 border border-red-200 rounded-lg p-4',
      
      errorText: isDark 
        ? 'text-red-400 text-sm'
        : 'text-red-600 text-sm',
      
      button: isDark 
        ? 'w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center'
        : 'w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center',
      
      stepIndicator: isDark 
        ? 'text-sm text-gray-400'
        : 'text-sm text-gray-500'
    };
  };

  const themeClasses = getThemeClasses();
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Atualizar estados disponíveis quando o país mudar
  useEffect(() => {
    if (formData.country && locationsData.byCountry[formData.country]) {
      setAvailableStates(locationsData.byCountry[formData.country].states);
      setFormData(prev => ({ ...prev, state: '', city: '' }));
      setAvailableCities([]);
    } else {
      setAvailableStates([]);
      setAvailableCities([]);
    }
  }, [formData.country]);

  // Atualizar cidades disponíveis quando o estado mudar
  useEffect(() => {
    if (formData.country && formData.state && locationsData.byCountry[formData.country]?.citiesByState[formData.state]) {
      setAvailableCities(locationsData.byCountry[formData.country].citiesByState[formData.state]);
      setFormData(prev => ({ ...prev, city: '' }));
    } else {
      setAvailableCities([]);
    }
  }, [formData.country, formData.state]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.idade || formData.idade < 13 || formData.idade > 120) {
      newErrors.idade = 'Idade deve estar entre 13 e 120 anos';
    }

    if (!formData.country) {
      newErrors.country = 'País é obrigatório';
    }

    if (!formData.state) {
      newErrors.state = 'Estado é obrigatório';
    }

    if (!formData.city) {
      newErrors.city = 'Cidade é obrigatória';
    }

    // Validar se os valores selecionados existem nos dados
    if (formData.country && !locationsData.byCountry[formData.country]) {
      newErrors.country = 'País inválido';
    }

    if (formData.country && formData.state && !locationsData.byCountry[formData.country]?.states.includes(formData.state)) {
      newErrors.state = 'Estado inválido para o país selecionado';
    }

    if (formData.country && formData.state && formData.city && 
        !locationsData.byCountry[formData.country]?.citiesByState[formData.state]?.includes(formData.city)) {
      newErrors.city = 'Cidade inválida para o estado selecionado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        email: user?.email,
        username: formData.name.trim(),
        idade: parseInt(formData.idade),
        city: formData.city,
        state: formData.state,
        country: formData.country
      };

      const res = await api.post('/atualizar-perfil', payload);
      
      if (res.data?.user) {
        setUser(res.data.user);
        onComplete();
      }
    } catch (error) {
      console.error('Erro ao salvar dados pessoais:', error);
      setErrors({ submit: 'Erro ao salvar dados. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={themeClasses.container}>
      <div className={themeClasses.card}>
        <div className="text-center mb-8">
          <h2 className={themeClasses.title}>
            Bem-vindo ao TreinAI! 👋
          </h2>
          <p className={themeClasses.subtitle}>
            Vamos começar coletando algumas informações básicas sobre você
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className={themeClasses.label}>
              Nome Completo *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={themeClasses.input(errors.name)}
              placeholder="Digite seu nome completo"
            />
            {errors.name && <p className={themeClasses.errorText}>{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="idade" className={themeClasses.label}>
              Idade *
            </label>
            <input
              type="number"
              id="idade"
              value={formData.idade}
              onChange={(e) => handleInputChange('idade', e.target.value)}
              className={themeClasses.input(errors.idade)}
              placeholder="Digite sua idade"
              min="13"
              max="120"
            />
            {errors.idade && <p className={themeClasses.errorText}>{errors.idade}</p>}
          </div>

          <div>
            <label htmlFor="country" className={themeClasses.label}>
              País *
            </label>
            <select
              id="country"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className={themeClasses.select(errors.country, false)}
            >
              <option value="">Selecione um país</option>
              {locationsData.countries.map((country) => (
                <option key={country.code} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.country && <p className={themeClasses.errorText}>{errors.country}</p>}
          </div>

          <div>
            <label htmlFor="state" className={themeClasses.label}>
              Estado/Região *
            </label>
            <select
              id="state"
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className={themeClasses.select(errors.state, !formData.country || availableStates.length === 0)}
              disabled={!formData.country || availableStates.length === 0}
            >
              <option value="">Selecione um estado</option>
              {availableStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {errors.state && <p className={themeClasses.errorText}>{errors.state}</p>}
          </div>

          <div>
            <label htmlFor="city" className={themeClasses.label}>
              Cidade *
            </label>
            <select
              id="city"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className={themeClasses.select(errors.city, !formData.state || availableCities.length === 0)}
              disabled={!formData.state || availableCities.length === 0}
            >
              <option value="">Selecione uma cidade</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            {errors.city && <p className={themeClasses.errorText}>{errors.city}</p>}
          </div>

          {errors.submit && (
            <div className={themeClasses.errorContainer}>
              <p className={themeClasses.errorText}>{errors.submit}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={themeClasses.button}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </>
            ) : (
              'Continuar'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className={themeClasses.stepIndicator}>
            Etapa 1 de 2 - Informações Pessoais
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPersonalInfo;
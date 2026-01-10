import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { FiPlus, FiTrash, FiEdit, FiEye, FiCheck, FiX, FiCode, FiPlay } from 'react-icons/fi';
import api from '../../../../Api';
import { useToast } from '../../../../components/Toast';

const EventPreview = ({ code, themeClasses }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !code) return;

    const container = containerRef.current;
    
    // Limpar container e executar scripts
    container.innerHTML = '';
    
    // Criar um wrapper temporário para separar scripts do HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = code;

    // 1. Mover elementos não-script para o container
    Array.from(tempDiv.childNodes).forEach(node => {
      if (node.tagName !== 'SCRIPT') {
        container.appendChild(node.cloneNode(true));
      }
    });

    // 2. Executar scripts manualmente
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      
      // Copiar atributos (src, type, async, etc)
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copiar conteúdo
      if (oldScript.innerHTML) {
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      }
      
      container.appendChild(newScript);
    });

    return () => {
      container.innerHTML = '';
    };
  }, [code]);

  return (
    <div 
      ref={containerRef} 
      className="bg-white text-black p-4 rounded-md border border-gray-300 min-h-[100px] relative"
    >
      {/* O conteúdo será injetado aqui */}
    </div>
  );
};

const AdminEventos = ({ tema, user }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewCode, setPreviewCode] = useState(''); // Código específico para execução no preview
  
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    active: false,
    startDate: '',
    endDate: ''
  });

  const { showSuccess, showError } = useToast();

  const isDark = tema === 'dark';
  const themeClasses = {
    bg: isDark ? 'bg-gray-800' : 'bg-white',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    input: isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900',
    border: isDark ? 'border-gray-700' : 'border-gray-200'
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/events', { params: { adminId: user._id } });
      setEvents(res.data);
    } catch (error) {
      console.error(error);
      showError('Erro ao buscar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.code || !formData.code.trim()) {
      showError('O código do evento é obrigatório');
      return;
    }

    try {
      const payload = { ...formData, adminId: user._id };
      
      if (editingEvent) {
        await api.put(`/events/${editingEvent._id}`, payload);
        showSuccess('Evento atualizado com sucesso');
      } else {
        await api.post('/events', payload);
        showSuccess('Evento criado com sucesso');
      }
      
      closeModal();
      fetchEvents();
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar evento');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
    try {
      await api.delete(`/events/${id}`, { params: { adminId: user._id } }); // DELETE with body or query? Controller expects query/body check. Axios delete with params sends query.
      // Wait, my controller checks `req.query.adminId || req.body.adminId`. Axios `delete` config `params` sends query strings.
      // However, usually DELETE bodies are discouraged. I'll rely on query.
      showSuccess('Evento removido');
      fetchEvents();
    } catch (error) {
      console.error(error);
      showError('Erro ao remover evento');
    }
  };

  const openModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        code: event.code,
        active: event.active,
        startDate: event.startDate ? event.startDate.split('T')[0] : '',
        endDate: event.endDate ? event.endDate.split('T')[0] : ''
      });
      setPreviewCode(event.code);
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        code: '',
        active: false,
        startDate: '',
        endDate: ''
      });
      setPreviewCode('');
    }
    setShowModal(true);
    setPreviewMode(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setPreviewMode(false);
  };

  return (
    <div className={`p-4 rounded-lg ${themeClasses.bg} ${themeClasses.text} shadow-sm`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FiCode /> Gestão de Eventos (Scripts/HTML)
        </h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          <FiPlus /> Novo Evento
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${themeClasses.border}`}>
                <th className="p-3">Título</th>
                <th className="p-3">Status</th>
                <th className="p-3">Início</th>
                <th className="p-3">Fim</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => (
                <tr key={evt._id} className={`border-b ${themeClasses.border} hover:bg-opacity-50 hover:bg-gray-700`}>
                  <td className="p-3 font-medium">{evt.title}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${evt.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {evt.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{evt.startDate ? new Date(evt.startDate).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-sm">{evt.endDate ? new Date(evt.endDate).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => openModal(evt)} className="p-2 text-blue-400 hover:text-blue-300 transition-colors" title="Editar">
                      <FiEdit />
                    </button>
                    <button onClick={() => handleDelete(evt._id)} className="p-2 text-red-400 hover:text-red-300 transition-colors" title="Excluir">
                      <FiTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">Nenhum evento criado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${themeClasses.bg} border ${themeClasses.border}`}>
            <div className={`flex justify-between items-center p-4 border-b ${themeClasses.border}`}>
              <h3 className="text-lg font-bold">{editingEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-200"><FiX size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full p-2 rounded-md border ${themeClasses.input}`}
                    placeholder="Ex: Promoção de Natal"
                  />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={e => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">Ativo</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data Início (Opcional)</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full p-2 rounded-md border ${themeClasses.input}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data Fim (Opcional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full p-2 rounded-md border ${themeClasses.input}`}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Código HTML / Script (Renderizado no Body)</label>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setPreviewCode(formData.code)}
                      className="text-xs flex items-center gap-1 text-green-400 hover:text-green-300 border border-green-500/30 px-2 py-1 rounded"
                    >
                      <FiPlay /> Atualizar/Rodar
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPreviewMode(!previewMode)}
                      className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 border border-blue-500/30 px-2 py-1 rounded"
                    >
                      <FiEye /> {previewMode ? 'Ocultar Preview' : 'Ver Preview'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-yellow-500 mb-2">
                  ⚠️ Cuidado: Scripts maliciosos podem comprometer a segurança. Use com responsabilidade.
                </p>
                <div className={`border rounded-md overflow-hidden ${themeClasses.border}`} style={{ height: '400px' }}>
                  <Editor
                    height="100%"
                    defaultLanguage="html"
                    value={formData.code}
                    theme={isDark ? 'vs-dark' : 'light'}
                    onChange={(value) => setFormData({ ...formData, code: value || '' })}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: 'on',
                      formatOnType: true,
                      formatOnPaste: true,
                      autoClosingTags: true,
                      autoClosingBrackets: true,
                      suggest: {
                        showWords: false
                      }
                    }}
                  />
                </div>
              </div>

              {previewMode && (
                <div className="mt-4 border-t pt-4 border-dashed border-gray-600">
                  <h4 className="text-sm font-bold mb-2 text-gray-400">Preview (Scripts são executados aqui)</h4>
                  <EventPreview code={previewCode} />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-2"
                >
                  <FiCheck /> Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEventos;

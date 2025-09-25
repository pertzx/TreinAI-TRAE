import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook personalizado para gerenciar conexões WebSocket com fallback para polling
 * 
 * @param {string} url - URL do WebSocket
 * @param {Object} options - Opções de configuração
 * @param {number} options.reconnectInterval - Intervalo de reconexão em ms (padrão: 3000)
 * @param {number} options.maxReconnectAttempts - Máximo de tentativas de reconexão (padrão: 5)
 * @param {number} options.pollingInterval - Intervalo de polling em ms quando WebSocket não disponível (padrão: 10000)
 * @param {Function} options.onMessage - Callback para mensagens recebidas
 * @param {Function} options.onError - Callback para erros
 * @param {Function} options.onConnect - Callback para conexão estabelecida
 * @param {Function} options.onDisconnect - Callback para desconexão
 * @param {Function} options.pollingFallback - Função de fallback para polling
 * @param {boolean} options.enabled - Se a conexão deve estar ativa (padrão: true)
 */
const useWebSocket = (url, options = {}) => {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    pollingInterval = 10000,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    pollingFallback,
    enabled = true
  } = options;

  const [connectionState, setConnectionState] = useState('disconnected'); // 'connecting', 'connected', 'disconnected', 'error', 'polling'
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const mountedRef = useRef(true);

  // Função para limpar timeouts e intervalos
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Função para iniciar polling como fallback
  const startPolling = useCallback(() => {
    if (!pollingFallback || !enabled) return;
    
    cleanup();
    setConnectionState('polling');
    
    // Executar polling imediatamente
    pollingFallback();
    
    // Configurar intervalo de polling
    pollingIntervalRef.current = setInterval(() => {
      if (mountedRef.current && enabled) {
        pollingFallback();
      }
    }, pollingInterval);
  }, [pollingFallback, enabled, pollingInterval, cleanup]);

  // Função para conectar WebSocket
  const connect = useCallback(() => {
    if (!enabled || !url) return;

    cleanup();
    setConnectionState('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        setConnectionState('connected');
        setReconnectAttempts(0);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (error) {
          console.warn('Erro ao parsear mensagem WebSocket:', error);
          onError?.(error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        setConnectionState('disconnected');
        onDisconnect?.(event);

        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts && enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setReconnectAttempts(prev => prev + 1);
              connect();
            }
          }, reconnectInterval);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          // Fallback para polling após esgotar tentativas de reconexão
          console.warn('WebSocket: Máximo de tentativas de reconexão atingido. Usando polling como fallback.');
          startPolling();
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        
        setConnectionState('error');
        onError?.(error);
        
        // Se falhar na primeira conexão, usar polling imediatamente
        if (reconnectAttempts === 0) {
          console.warn('WebSocket: Falha na conexão inicial. Usando polling como fallback.');
          startPolling();
        }
      };

    } catch (error) {
      console.warn('WebSocket: Erro ao criar conexão. Usando polling como fallback.', error);
      startPolling();
    }
  }, [url, enabled, reconnectAttempts, maxReconnectAttempts, reconnectInterval, onConnect, onMessage, onError, onDisconnect, startPolling, cleanup]);

  // Função para desconectar
  const disconnect = useCallback(() => {
    cleanup();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Desconexão intencional');
      wsRef.current = null;
    }
    
    setConnectionState('disconnected');
    setReconnectAttempts(0);
  }, [cleanup]);

  // Função para enviar mensagem
  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Erro ao enviar mensagem WebSocket:', error);
        onError?.(error);
        return false;
      }
    }
    return false;
  }, [onError]);

  // Efeito principal para gerenciar conexão
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && url) {
      // Tentar WebSocket primeiro, com fallback automático para polling
      connect();
    } else {
      disconnect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled, url, connect, disconnect]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Componente desmontado');
      }
    };
  }, [cleanup]);

  return {
    connectionState,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isPolling: connectionState === 'polling',
    reconnectAttempts
  };
};

export default useWebSocket;
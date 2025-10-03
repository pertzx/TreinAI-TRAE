import { useState, useEffect, useRef } from 'react';

const useSpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  console.log('useSpeechToText hook inicializado');

  useEffect(() => {
    console.log('useEffect do useSpeechToText executado');
    // Verificar se o navegador suporta Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.log('Navegador suporta Web Speech API');
      setIsSupported(true);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      console.log('SpeechRecognition criado:', recognitionRef.current);
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript = transcript.trim().toLowerCase();
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setSpeechError(`Erro no reconhecimento de voz: ${event.error}`);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.log('Navegador NÃO suporta Web Speech API');
      setIsSupported(false);
      setSpeechError('Seu navegador não suporta reconhecimento de voz');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const toggleListening = async () => {
    console.log('toggleListening chamado. isSupported:', isSupported, 'isListening:', isListening);
    
    if (!isSupported) {
      console.log('Reconhecimento de voz não suportado');
      setSpeechError('Reconhecimento de voz não suportado');
      return;
    }

    if (isListening) {
      console.log('Parando reconhecimento de voz');
      recognitionRef.current?.stop();
      setIsListening(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      console.log('Iniciando reconhecimento de voz');
      
      // Solicitar permissão do microfone
      try {
        console.log('Solicitando permissão do microfone...');
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Permissão do microfone concedida');
        
        setSpeechError('');
        setIsListening(true);
        recognitionRef.current?.start();
      
        // Timeout de 30 segundos
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
          setIsListening(false);
        }, 30000);
        
      } catch (error) {
        console.error('Erro ao solicitar permissão do microfone:', error);
        setSpeechError('Permissão do microfone negada ou não disponível');
        setIsListening(false);
      }
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setSpeechError('');
  };

  return {
    isListening,
    transcript,
    speechError,
    isSupported,
    toggleListening,
    resetTranscript
  };
};

export default useSpeechToText;
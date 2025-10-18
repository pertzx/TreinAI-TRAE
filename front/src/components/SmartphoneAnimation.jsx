import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuSmartphone, LuPlay, LuPause } from 'react-icons/lu';

function SmartphoneAnimation() {
    // Corrigindo os caminhos das imagens para funcionar corretamente
    const images = Array.from({ length: 8 }, (_, i) => `./public/${i + 1}.png`);
    const [current, setCurrent] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [imageError, setImageError] = useState(false);
    const timeoutRef = useRef(null);

    // Troca automática a cada 3s (aumentado para melhor visualização)
    useEffect(() => {
        if (!isPlaying) return;
        
        const next = () => setCurrent((prev) => (prev + 1) % images.length);
        timeoutRef.current = setTimeout(next, 3000);
        return () => clearTimeout(timeoutRef.current);
    }, [current, isPlaying, images.length]);

    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleImageError = () => {
        setImageError(true);
    };

    // Se houver erro nas imagens, mostrar uma alternativa visual
    if (imageError) {
        return (
            <motion.div 
                className="w-full max-w-sm mx-auto"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
            >
                <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-green-500 p-1 rounded-3xl shadow-2xl">
                    <div className="bg-gray-900 rounded-3xl p-8 aspect-[9/16] flex flex-col items-center justify-center text-center">
                        <motion.div
                            animate={{ 
                                rotate: [0, 10, -10, 0],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{ 
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="mb-6"
                        >
                            <LuSmartphone className="w-16 h-16 text-blue-400" />
                        </motion.div>
                        
                        <motion.h3 
                            className="text-2xl font-bold text-white mb-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            TreinAI App
                        </motion.h3>
                        
                        <motion.p 
                            className="text-gray-300 text-sm leading-relaxed"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            Sua academia inteligente no bolso. Treinos personalizados com IA.
                        </motion.p>
                        
                        <motion.div 
                            className="mt-6 flex gap-2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-2 h-2 bg-green-400 rounded-full"
                                    animate={{ 
                                        scale: [1, 1.5, 1],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{ 
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: i * 0.2
                                    }}
                                />
                            ))}
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            className="w-full max-w-sm mx-auto"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
        >
            {/* Container do smartphone com gradiente */}
            <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-green-500 p-1 rounded-3xl shadow-2xl">
                {/* Tela do smartphone */}
                <div className="bg-black rounded-3xl overflow-hidden aspect-[9/16] relative">
                    {/* Notch do smartphone */}
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-black rounded-full z-20 border-2 border-gray-800"></div>
                    
                    {/* Área das imagens */}
                    <div className="relative w-full h-full overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.img
                                key={current}
                                src={images[current]}
                                alt={`App Screenshot ${current + 1}`}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={handleImageError}
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                            />
                        </AnimatePresence>
                        
                        {/* Overlay com gradiente sutil */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none"></div>
                    </div>
                    
                    {/* Controles de reprodução */}
                    <motion.button
                        onClick={togglePlayPause}
                        className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full p-3 text-white hover:bg-white/30 transition-all duration-300 z-10"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        {isPlaying ? (
                            <LuPause className="w-4 h-4" />
                        ) : (
                            <LuPlay className="w-4 h-4 ml-0.5" />
                        )}
                    </motion.button>
                    
                    {/* Indicadores de slide */}
                    <div className="absolute bottom-4 left-4 flex gap-1.5 z-10">
                        {images.map((_, index) => (
                            <motion.button
                                key={index}
                                onClick={() => setCurrent(index)}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                    index === current 
                                        ? 'bg-white scale-125' 
                                        : 'bg-white/50 hover:bg-white/70'
                                }`}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                            />
                        ))}
                    </div>
                </div>
                
                {/* Reflexo do smartphone */}
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-full h-8 bg-gradient-to-b from-white/10 to-transparent rounded-full blur-sm opacity-50"></div>
            </div>
            
            {/* Texto descritivo */}
            <motion.div 
                className="text-center mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h3 className="text-xl font-semibold text-white mb-2">
                    Experiência Mobile Completa
                </h3>
                <p className="text-gray-300 text-sm">
                    Interface intuitiva e responsiva para todos os dispositivos
                </p>
            </motion.div>
        </motion.div>
    );
}

export default SmartphoneAnimation;

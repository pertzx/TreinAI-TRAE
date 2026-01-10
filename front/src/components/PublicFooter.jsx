import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { FaInstagram } from 'react-icons/fa';
import Logo from './Logo';

const PublicFooter = ({ initialMinimized = false }) => {
  const [minimized, setMinimized] = useState(initialMinimized);

  return (
    <footer className="bg-gray-900 text-white transition-all duration-300">
        <div 
          className="w-full flex justify-center items-center gap-2 py-2 bg-gray-800 cursor-pointer hover:bg-gray-700 transition-colors border-t border-gray-700"
          onClick={() => setMinimized(!minimized)}
          title={minimized ? "Expandir Rodapé" : "Minimizar Rodapé"}
        >
          {minimized && <span className="text-xs text-gray-400">&copy; {new Date().getFullYear()} TreinAI</span>}
          {minimized ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
        </div>

        <div className={`transition-all duration-300 overflow-hidden ${minimized ? 'h-0 opacity-0' : 'py-12 px-4 opacity-100'}`}>
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <Logo scale={1} />
                  </div>
                  <h3 className="text-2xl font-bold">TreinAI</h3>
                </div>
                <p className="text-gray-400 mb-4">
                  Muito além do Personal Trainer IA. Transformando vidas através da tecnologia e do fitness.
                </p>
                <div className="flex space-x-4">
                  <a
                    href="https://instagram.com/treinai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Instagram da TreinAI"
                  >
                    <FaInstagram className="w-6 h-6" />
                  </a>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Links Rápidos</h4>
                <ul className="space-y-2">
                  <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
                  <li><Link to="/sobre" className="text-gray-400 hover:text-white transition-colors">Sobre</Link></li>
                  <li><Link to="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link></li>
                  <li><Link to="/termos" className="text-gray-400 hover:text-white transition-colors">Termos</Link></li>
                  <li><Link to="/politica-de-privacidade" className="text-gray-400 hover:text-white transition-colors">Privacidade</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; {new Date().getFullYear()} TreinAI. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
    </footer>
  );
};

export default PublicFooter;

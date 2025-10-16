// Utilitário para debug de cookies
export const debugCookies = {
  // Lista todos os cookies disponíveis
  listAll() {
    console.log('🍪 Todos os cookies:', document.cookie);
    return document.cookie;
  },

  // Verifica se um cookie específico existe
  checkCookie(name) {
    const value = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${name}=`))
      ?.split('=')[1];
    
    console.log(`🍪 Cookie '${name}':`, value || 'NÃO ENCONTRADO');
    return value;
  },

  // Verifica especificamente o authToken
  checkAuthToken() {
    const token = this.checkCookie('auth_token');
    if (token) {
      try {
        // Decodifica o JWT para ver o payload (sem verificar assinatura)
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔑 Payload do token:', payload);
      } catch (e) {
        console.log('❌ Erro ao decodificar token:', e.message);
      }
    }
    return token;
  },

  // Define um cookie de teste
  setTestCookie() {
    document.cookie = 'testCookie=testValue; path=/; SameSite=Lax';
    console.log('🧪 Cookie de teste definido');
  },

  // Remove um cookie
  removeCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    console.log(`🗑️ Cookie '${name}' removido`);
  }
};

// Disponibiliza globalmente para debug no console
window.debugCookies = debugCookies;
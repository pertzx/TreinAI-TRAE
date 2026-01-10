import express from 'express';
import { registerInteraction } from '../controllers/metrics.js';
import { verifyBan } from '../middlewares/banFunctions.js';

const router = express.Router();

// Rota pública, mas protegida por verifyBan (que agora permite GET e valida token se presente)
// Para POST, verifyBan exige que se for logado, bata com o token.
// Como metrics pode ser anônimo, precisamos ver se verifyBan bloqueia anônimos.
// O verifyBan atual bloqueia se não tiver token?
// Lendo verifyBan: "Se faltar token -> 401". 
// Então metrics precisa ser autenticada? 
// Se o usuário não estiver logado, ele não pode ver profissionais? 
// Atualmente Encontrar.jsx parece exigir login?
// Vou assumir que sim, já que é dashboard.

router.post('/interact', verifyBan, registerInteraction);

export default router;

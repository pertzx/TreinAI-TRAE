import Ranking from "../models/Gamification/Ranking";

export const finalizarTreino = async (req, res) => {
  try {
    const { userId } = req.user;
    const { duration, exercises } = req.body;

    // Atualizar estatísticas do usuário no ranking e no userGamification
    // encontrar um ranking que ainda não acabou
    const ranking = await Ranking.findOne({ endDate: null });
    if (!ranking) {
      return res.status(404).json({ success: false, msg: 'Ranking não encontrado' });
    }

    res.status(200).json({ success: true, msg: 'Treino finalizado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, msg: 'Erro ao finalizar treino', error: error.message });
  }
};
/**
 * Avalia os gatilhos de conquista contra o estado da gamificação após um treino.
 *
 * @param {Object} state  - estado ATUAL: { streak, workouts, duration, points }
 * @param {Object} prev   - estado ANTES deste treino (mesmos campos), p/ detectar cruzamento
 * @param {Array}  triggers - lista de MilestoneTrigger ativos
 * @returns {Array} marcos disparados: [{ key, type, value, title, message, emoji }]
 */
export const evaluateMilestones = (state = {}, prev = {}, triggers = []) => {
  const cur = {
    streak: Number(state.streak) || 0,
    workouts: Number(state.workouts) || 0,
    duration: Number(state.duration) || 0,
    points: Number(state.points) || 0,
  };
  const before = {
    workouts: Number(prev.workouts) || 0,
    duration: Number(prev.duration) || 0,
    points: Number(prev.points) || 0,
  };

  const crossed = (field, value) => before[field] < value && cur[field] >= value;

  const fired = [];
  for (const t of triggers) {
    const value = Number(t.value) || 0;
    let hit = false;
    switch (t.type) {
      case 'streak-every':
        hit = value > 0 && cur.streak > 0 && cur.streak % value === 0;
        break;
      case 'streak-exact':
        hit = cur.streak === value;
        break;
      case 'workouts':
        hit = crossed('workouts', value);
        break;
      case 'duration-total':
        hit = crossed('duration', value);
        break;
      case 'points':
        hit = crossed('points', value);
        break;
      case 'record':
        // Requer fonte de recorde pessoal — plugável (por ora não dispara).
        hit = false;
        break;
      default:
        hit = false;
    }
    if (hit) {
      fired.push({ key: t.key, type: t.type, value, title: t.title, message: t.message, emoji: t.emoji });
    }
  }
  return fired;
};

export default evaluateMilestones;

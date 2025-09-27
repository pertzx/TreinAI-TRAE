import { UserGamification } from '../models/Gamification.js';
import { getBrazilDate } from '../helpers/getBrazilDate.js';

// Obter notificações do usuário
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0, unreadOnly = false } = req.query;

    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      return res.status(404).json({
        success: false,
        message: 'Gamification não encontrada para este usuário'
      });
    }

    let notifications = gamification.notifications || [];

    // Filtrar apenas não lidas se solicitado
    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.read);
    }

    // Ordenar por data (mais recentes primeiro)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Aplicar paginação
    const paginatedNotifications = notifications.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        hasMore: (parseInt(offset) + parseInt(limit)) < notifications.length
      }
    });

  } catch (error) {
    console.error('Erro ao obter notificações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Marcar notificação como lida
export const markNotificationAsRead = async (req, res) => {
  try {
    const { userId, notificationId } = req.params;

    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      return res.status(404).json({
        success: false,
        message: 'Gamification não encontrada'
      });
    }

    const notification = gamification.notifications.id(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }

    notification.read = true;
    notification.readAt = getBrazilDate();
    
    await gamification.save();

    res.json({
      success: true,
      message: 'Notificação marcada como lida'
    });

  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Marcar todas as notificações como lidas
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      return res.status(404).json({
        success: false,
        message: 'Gamification não encontrada'
      });
    }

    const now = getBrazilDate();
    gamification.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = now;
      }
    });

    await gamification.save();

    res.json({
      success: true,
      message: 'Todas as notificações foram marcadas como lidas'
    });

  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Criar notificação personalizada (para admins)
export const createNotification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, title, message, data = {} } = req.body;

    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      return res.status(404).json({
        success: false,
        message: 'Gamification não encontrada'
      });
    }

    if (!gamification.notifications) {
      gamification.notifications = [];
    }

    const notification = {
      type: type || 'custom',
      title,
      message,
      data,
      read: false,
      createdAt: getBrazilDate()
    };

    gamification.notifications.push(notification);
    await gamification.save();

    res.json({
      success: true,
      message: 'Notificação criada com sucesso',
      data: notification
    });

  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Limpar notificações antigas (mais de 30 dias)
export const cleanOldNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const daysToKeep = req.query.days || 30;

    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      return res.status(404).json({
        success: false,
        message: 'Gamification não encontrada'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysToKeep));

    const originalCount = gamification.notifications.length;
    gamification.notifications = gamification.notifications.filter(
      notification => new Date(notification.createdAt) > cutoffDate
    );

    const removedCount = originalCount - gamification.notifications.length;
    await gamification.save();

    res.json({
      success: true,
      message: `${removedCount} notificações antigas foram removidas`,
      data: {
        removed: removedCount,
        remaining: gamification.notifications.length
      }
    });

  } catch (error) {
    console.error('Erro ao limpar notificações antigas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Função utilitária para criar notificações automáticas
export const createAutoNotification = async (userId, type, title, message, data = {}) => {
  try {
    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) return false;

    if (!gamification.notifications) {
      gamification.notifications = [];
    }

    // Verificar se o usuário quer receber notificações
    if (!gamification.preferences.notifications) return false;

    const notification = {
      type,
      title,
      message,
      data,
      read: false,
      createdAt: getBrazilDate()
    };

    gamification.notifications.push(notification);
    await gamification.save();

    return true;
  } catch (error) {
    console.error('Erro ao criar notificação automática:', error);
    return false;
  }
};

// Obter estatísticas de notificações
export const getNotificationStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const gamification = await UserGamification.findOne({ userId });
    if (!gamification) {
      return res.status(404).json({
        success: false,
        message: 'Gamification não encontrada'
      });
    }

    const notifications = gamification.notifications || [];
    const now = getBrazilDate();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      last7Days: notifications.filter(n => new Date(n.createdAt) > last7Days).length,
      last30Days: notifications.filter(n => new Date(n.createdAt) > last30Days).length,
      byType: {}
    };

    // Contar por tipo
    notifications.forEach(notification => {
      const type = notification.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas de notificações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
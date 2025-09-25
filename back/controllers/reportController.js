import { Report, ReportTemplate } from '../models/Report.js';
import UserAnalytics from '../models/Analytics.js';
import User from '../models/User.js';
import Profissional from '../models/Profissional.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Gerar relatório para cliente
export const generateReport = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { 
      title, 
      type, 
      dateRange, 
      settings = {},
      templateId 
    } = req.body;
    const professionalId = req.user.id;

    // Verificar se o profissional tem acesso ao cliente
    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    // Buscar dados do cliente no período especificado
    const analytics = await UserAnalytics.findOne({ userId: clientId });
    if (!analytics) {
      return res.status(404).json({ message: 'Dados de analytics não encontrados para o cliente' });
    }

    // Filtrar dados por período
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    const filteredData = {
      workoutMetrics: analytics.workoutMetrics.filter(metric => 
        metric.date >= startDate && metric.date <= endDate
      ),
      bodyMetrics: analytics.bodyMetrics.filter(metric => 
        metric.date >= startDate && metric.date <= endDate
      ),
      performanceMetrics: analytics.performanceMetrics.filter(metric => 
        metric.date >= startDate && metric.date <= endDate
      ),
      nutritionData: analytics.nutritionMetrics.filter(metric => 
        metric.date >= startDate && metric.date <= endDate
      )
    };

    // Calcular estatísticas
    const statistics = calculateReportStatistics(filteredData);
    
    // Gerar insights
    const insights = generateInsights(filteredData, statistics);

    // Criar relatório
    const report = new Report({
      title,
      type,
      professionalId,
      clientId,
      dateRange,
      data: {
        ...filteredData,
        insights,
        statistics
      },
      settings: {
        includeCharts: settings.includeCharts !== false,
        includePhotos: settings.includePhotos || false,
        includeNutrition: settings.includeNutrition !== false,
        includeRecommendations: settings.includeRecommendations !== false,
        format: settings.format || 'pdf'
      }
    });

    await report.save();

    // Gerar arquivo do relatório
    if (settings.format === 'pdf' || !settings.format) {
      const fileUrl = await generatePDFReport(report);
      report.fileUrl = fileUrl;
      report.status = 'completed';
      await report.save();
    }

    res.status(201).json({
      message: 'Relatório gerado com sucesso',
      report: {
        id: report._id,
        title: report.title,
        type: report.type,
        status: report.status,
        fileUrl: report.fileUrl,
        generatedAt: report.generatedAt
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Listar relatórios do profissional
export const getReports = async (req, res) => {
  try {
    const professionalId = req.user.id;
    const { page = 1, limit = 10, type, status, clientId } = req.query;

    const filter = { professionalId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;

    const reports = await Report.find(filter)
      .populate('clientId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Report.countDocuments(filter);

    res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Erro ao buscar relatórios:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Obter relatório específico
export const getReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const professionalId = req.user.id;

    const report = await Report.findOne({ 
      _id: reportId, 
      professionalId 
    }).populate('clientId', 'username email avatar');

    if (!report) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    res.json(report);

  } catch (error) {
    console.error('Erro ao buscar relatório:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Compartilhar relatório
export const shareReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { userId, permissions = 'view' } = req.body;
    const professionalId = req.user.id;

    const report = await Report.findOne({ 
      _id: reportId, 
      professionalId 
    });

    if (!report) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    // Verificar se já foi compartilhado com este usuário
    const existingShare = report.sharedWith.find(
      share => share.userId.toString() === userId
    );

    if (existingShare) {
      existingShare.permissions = permissions;
      existingShare.sharedAt = new Date();
    } else {
      report.sharedWith.push({
        userId,
        permissions,
        sharedAt: new Date()
      });
    }

    await report.save();

    res.json({ message: 'Relatório compartilhado com sucesso' });

  } catch (error) {
    console.error('Erro ao compartilhar relatório:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Criar template de relatório
export const createReportTemplate = async (req, res) => {
  try {
    const { name, description, type, config } = req.body;
    const professionalId = req.user.id;

    const template = new ReportTemplate({
      name,
      description,
      type,
      professionalId,
      config
    });

    await template.save();

    res.status(201).json({
      message: 'Template criado com sucesso',
      template
    });

  } catch (error) {
    console.error('Erro ao criar template:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Listar templates
export const getReportTemplates = async (req, res) => {
  try {
    const professionalId = req.user.id;
    const { type } = req.query;

    const filter = { professionalId, isActive: true };
    if (type) filter.type = type;

    const templates = await ReportTemplate.find(filter)
      .sort({ isDefault: -1, createdAt: -1 });

    res.json(templates);

  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Funções auxiliares
const calculateReportStatistics = (data) => {
  const { workoutMetrics, bodyMetrics, performanceMetrics } = data;

  const totalWorkouts = workoutMetrics.length;
  const averageIntensity = workoutMetrics.length > 0 
    ? workoutMetrics.reduce((sum, w) => sum + (w.intensity || 0), 0) / workoutMetrics.length 
    : 0;
  
  const totalCaloriesBurned = workoutMetrics.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  
  const weightChange = bodyMetrics.length >= 2 
    ? bodyMetrics[bodyMetrics.length - 1].weight - bodyMetrics[0].weight 
    : 0;
  
  const bodyFatChange = bodyMetrics.length >= 2 
    ? bodyMetrics[bodyMetrics.length - 1].bodyFat - bodyMetrics[0].bodyFat 
    : 0;

  const strengthImprovement = performanceMetrics.length >= 2 
    ? performanceMetrics[performanceMetrics.length - 1].strength - performanceMetrics[0].strength 
    : 0;

  // Calcular score de consistência baseado na frequência de treinos
  const consistencyScore = calculateConsistencyScore(workoutMetrics);
  
  // Taxa de aderência (assumindo meta de 4 treinos por semana)
  const expectedWorkouts = Math.ceil((Date.now() - new Date(workoutMetrics[0]?.date || Date.now())) / (1000 * 60 * 60 * 24 * 7)) * 4;
  const adherenceRate = expectedWorkouts > 0 ? (totalWorkouts / expectedWorkouts) * 100 : 0;

  return {
    totalWorkouts,
    averageIntensity: Math.round(averageIntensity),
    totalCaloriesBurned,
    weightChange: Math.round(weightChange * 10) / 10,
    bodyFatChange: Math.round(bodyFatChange * 10) / 10,
    strengthImprovement: Math.round(strengthImprovement),
    consistencyScore: Math.round(consistencyScore),
    adherenceRate: Math.min(Math.round(adherenceRate), 100)
  };
};

const calculateConsistencyScore = (workoutMetrics) => {
  if (workoutMetrics.length < 2) return 0;

  const dates = workoutMetrics.map(w => new Date(w.date)).sort();
  const intervals = [];
  
  for (let i = 1; i < dates.length; i++) {
    const interval = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24); // dias
    intervals.push(interval);
  }

  const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const idealInterval = 2; // 2 dias entre treinos idealmente
  
  const score = Math.max(0, 100 - Math.abs(averageInterval - idealInterval) * 10);
  return score;
};

const generateInsights = (data, statistics) => {
  const insights = [];

  // Insight sobre consistência
  if (statistics.consistencyScore < 60) {
    insights.push({
      category: 'Consistência',
      title: 'Melhore a regularidade dos treinos',
      description: 'A consistência dos treinos está abaixo do ideal.',
      recommendation: 'Tente manter intervalos regulares entre os treinos, idealmente de 1-2 dias.',
      priority: 'high'
    });
  }

  // Insight sobre progresso de peso
  if (Math.abs(statistics.weightChange) > 2) {
    insights.push({
      category: 'Composição Corporal',
      title: statistics.weightChange > 0 ? 'Ganho de peso significativo' : 'Perda de peso significativa',
      description: `Mudança de ${Math.abs(statistics.weightChange)}kg no período analisado.`,
      recommendation: statistics.weightChange > 0 
        ? 'Monitore se o ganho está sendo principalmente massa muscular.'
        : 'Certifique-se de que a perda não está afetando a massa muscular.',
      priority: 'medium'
    });
  }

  // Insight sobre intensidade
  if (statistics.averageIntensity < 60) {
    insights.push({
      category: 'Performance',
      title: 'Intensidade dos treinos pode ser aumentada',
      description: 'A intensidade média dos treinos está relativamente baixa.',
      recommendation: 'Considere aumentar gradualmente a intensidade dos exercícios.',
      priority: 'medium'
    });
  }

  return insights;
};

const generatePDFReport = async (report) => {
  try {
    const doc = new PDFDocument();
    const fileName = `report_${report._id}_${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'uploads', 'reports', fileName);

    // Criar diretório se não existir
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Cabeçalho
    doc.fontSize(20).text(report.title, 50, 50);
    doc.fontSize(12).text(`Gerado em: ${new Date(report.generatedAt).toLocaleDateString('pt-BR')}`, 50, 80);
    doc.text(`Período: ${new Date(report.dateRange.startDate).toLocaleDateString('pt-BR')} - ${new Date(report.dateRange.endDate).toLocaleDateString('pt-BR')}`, 50, 100);

    // Estatísticas
    doc.fontSize(16).text('Resumo Estatístico', 50, 140);
    let yPosition = 170;

    const stats = report.data.statistics;
    doc.fontSize(12);
    doc.text(`Total de Treinos: ${stats.totalWorkouts}`, 50, yPosition);
    doc.text(`Intensidade Média: ${stats.averageIntensity}%`, 50, yPosition + 20);
    doc.text(`Calorias Queimadas: ${stats.totalCaloriesBurned}`, 50, yPosition + 40);
    doc.text(`Mudança de Peso: ${stats.weightChange}kg`, 50, yPosition + 60);
    doc.text(`Score de Consistência: ${stats.consistencyScore}%`, 50, yPosition + 80);

    // Insights
    if (report.data.insights && report.data.insights.length > 0) {
      doc.fontSize(16).text('Insights e Recomendações', 50, yPosition + 120);
      yPosition += 150;

      report.data.insights.forEach((insight, index) => {
        doc.fontSize(14).text(insight.title, 50, yPosition);
        doc.fontSize(10).text(insight.description, 50, yPosition + 20);
        doc.text(`Recomendação: ${insight.recommendation}`, 50, yPosition + 35);
        yPosition += 70;

        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve(`/uploads/reports/${fileName}`);
      });
      stream.on('error', reject);
    });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
};
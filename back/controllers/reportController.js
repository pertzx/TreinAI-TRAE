import { Report, ReportTemplate } from '../models/Report.js';
import User from '../models/User.js';
import Profissional from '../models/Profissional.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { getBrazilDate } from '../helpers/getBrazilDate.js';
import { uploadToCloudinary } from '../config/cloudinaryConfig.js';

// Gerar relatório simples para cliente
export const generateReport = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { 
      title, 
      type, 
      dateRange, 
      settings = {},
      templateId,
      professionalId 
    } = req.body;

    // Verificar se o profissional tem acesso ao cliente
    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    // Dados simplificados do relatório (sem analytics complexas)
    const reportData = {
      client: {
        name: client.username,
        email: client.email
      },
      period: {
        start: new Date(dateRange.startDate),
        end: new Date(dateRange.endDate)
      },
      basicStats: {
        totalDays: Math.ceil((new Date(dateRange.endDate) - new Date(dateRange.startDate)) / (1000 * 60 * 60 * 24)),
        reportType: type
      }
    };

    // Criar relatório simplificado
    const report = new Report({
      title,
      type,
      professionalId,
      clientId,
      dateRange,
      data: reportData,
      settings: {
        format: settings.format || 'pdf'
      }
    });

    await report.save();

    // Gerar arquivo do relatório se necessário
    if (settings.format === 'pdf' || !settings.format) {
      const fileUrl = await generateSimplePDFReport(report);
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
    const { page = 1, limit = 10, type, status, clientId, professionalId } = req.query;

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
    const { professionalId } = req.query;

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

// Compartilhar relatório (simplificado)
export const shareReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { userId, permissions = 'view', professionalId } = req.body;

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

// Criar template básico de relatório
export const createReportTemplate = async (req, res) => {
  try {
    const { name, description, type, config, professionalId } = req.body;

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
    const { type, professionalId } = req.query;

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

// Função auxiliar para gerar PDF e fazer upload para Cloudinary
const generateSimplePDFReport = async (report) => {
  try {
    const doc = new PDFDocument();
    const chunks = [];

    // Coletar os chunks do PDF em memória
    doc.on('data', (chunk) => chunks.push(chunk));

    // Cabeçalho simples
    doc.fontSize(20).text(report.title || 'Relatório de Acompanhamento', 50, 50);
    doc.fontSize(12).text(`Gerado em: ${new Date(report.generatedAt).toLocaleDateString('pt-BR')}`, 50, 80);
    if (report.dateRange) {
      doc.text(`Período: ${new Date(report.dateRange.startDate).toLocaleDateString('pt-BR')} - ${new Date(report.dateRange.endDate).toLocaleDateString('pt-BR')}`, 50, 100);
    }

    // Informações básicas do cliente
    doc.fontSize(16).text('Informações do Cliente', 50, 140);
    doc.fontSize(12);
    if (report.data && report.data.client) {
      doc.text(`Nome: ${report.data.client.name}`, 50, 170);
      doc.text(`Email: ${report.data.client.email}`, 50, 190);
    }
    
    if (report.data && report.data.basicStats) {
      doc.text(`Período do relatório: ${report.data.basicStats.totalDays} dias`, 50, 210);
      doc.text(`Tipo: ${report.data.basicStats.reportType}`, 50, 230);
    }

    // Nota sobre simplificação
    doc.fontSize(10).text('Nota: Este é um relatório gerado pelo sistema TreinAI.', 50, 280);

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const fileName = `report_${report._id}_${Date.now()}`;
          
          // Upload para Cloudinary como resource_type: 'raw' (para PDFs)
          const result = await uploadToCloudinary(buffer, 'reports', 'raw');
          
          // O Cloudinary retorna a URL segura
          resolve(result.secure_url || result.path);
        } catch (uploadError) {
          console.error('Erro no upload do PDF para Cloudinary:', uploadError);
          reject(uploadError);
        }
      });
      doc.on('error', (err) => {
        console.error('Erro na geração do PDF:', err);
        reject(err);
      });
    });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
};
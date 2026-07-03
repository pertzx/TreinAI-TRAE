import OpenAI from "openai";
import User from "../models/User.js";
import { v4 as uuidv4 } from "uuid";
import { getBrazilDate } from "../helpers/getBrazilDate.js";
import Profissional from "../models/Profissional.js";
import { registerAiUsage } from "../middlewares/tokenLimitMiddleware.js";
import { hasFeature } from "../helpers/planAccess.js";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

/* -------------------------------------------------------------------------- */
/* criarTreinoIA                                                               */
/* -------------------------------------------------------------------------- */

export const conversarNutri = async (req, res) => {
  try {
    const { email, conteudo, profissionalId } = req.body || {};

    if (!email) return res.status(400).json({ msg: '!email', success: false });
    if (!conteudo) return res.status(400).json({ msg: '!conteudo', success: false });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'Não conseguimos encontrar o seu usuário.', success: false });

    if (!profissionalId) {
      if (!hasFeature(user, 'nutriAI')) return res.json({ msg: 'Seu plano não inclui o NutriAI. Faça upgrade para um plano com acesso ao NutriAI.', success: false })
    }

    // Atualiza ultimoUpdate do profissional se aplicável (não bloqueante)
    if (profissionalId) {
      try {
        const profissional = await Profissional.findOne({
          $or: [{ profissionalId }, { userId: profissionalId }]
        });
        if (profissional) {
          const aluno = (profissional.alunos || []).find(a => String(a.userId) === String(user._id));
          if (aluno) {
            aluno.ultimoUpdate = getBrazilDate();
            await profissional.save().catch(err => console.warn('Falha ao salvar profissional ultimoUpdate:', err));
          }
        }
      } catch (err) {
        console.warn('Erro buscando profissional (não crítico):', err);
      }
    }

    if (!openai) {
      console.error('OpenAI client não configurado.');
      return res.status(500).json({ msg: 'OpenAI client não configurado.', success: false });
    }

    // System prompt estrito — pede JSON puro e instrui a NUNCA alterar userId.
    const systemPrompt = `
Você é um nutricionista virtual. O usuário envia um JSON (campo "conteudo") que contém o plano nutricional.
RESPONDA APENAS COM UM JSON VÁLIDO (NADA FORA DO JSON).
Formato da resposta:
{
  "success": true|false,
  "msg": "campo da sua fala com o usuario",
  "nutriInfos": {
    "restricoes": type String (aqui voce especifica oque o cliente deve evitar.),
    "planoNutricional": [ { "horaDoDia": "HH:MM", "conteudo": " refeição principal | outras opçoes... (explique o motivo dessa escolha) " }, ... ]
  }
}

Regras:
- O campo msg é a mensagem que voce retorna, falando com o cliente.
- Só modifique o array planoNutricional se o usuário pediu explicitamente mudanças. em 
- Analise especificamente a mensagem do cliente no campo 'Mensagem do cliente:' e cumpra oque ele diz, se ele fez uma pergunta, responda-o, se ele pediu algo faça, mas se ele nao fala sobre algo relacionado a nutricionista, explique que ele so deve falar sobre informaçoes nutricionais.
- Se não puder gerar um plano válido, retorne { "success": false, "msg": "motivo curto" }.
- Não inclua propriedades extras.
- Responda com JSON puro (sem texto adicional).
- Caso o plano nutricional estiver vazio crie um com base no cliente.
- Crie um plano especifico com base nas informaçoes do cliente.
- Sempre que você criar o conteudo, coloque outras opçoes de refeiçao ou diga qual o objetivo dessa refeicao. exemplos: bastante proteina; bastante carboidratos; peixe frito ou peixe assado ou frango frito. isso porque as vezes o cliente nao tem disponivel essa refeiçao no dia a dia.
- Responda sempre com simpatia e gentil no campo msg, utilize emojis para demonstar isso.
- No campo de conteudo utilize emojis tambem para deixar claro a refeiçao e mais atraente.
- Assim deve ser o formato de conteudo >> refeição principal | outras opçoes... (explique o motivo dessas escolhas) 
`;

    // Monta um contexto enxuto e seguro (sem senha/tokens/etc.) para a IA.
    const ultimo = (arr) => (Array.isArray(arr) && arr.length ? arr[arr.length - 1]?.valor : null);
    const perfilCliente = {
      objetivo: user?.perfil?.objetivo ?? null,
      idade: user?.perfil?.idade ?? null,
      genero: user?.perfil?.genero ?? null,
      nivelExperiencia: user?.perfil?.nivelExperiencia ?? null,
      pesoAtualKg: ultimo(user?.perfil?.pesoAtual),
      alturaCm: ultimo(user?.perfil?.altura),
    };
    const anamnese = {
      objetivos: user?.anamnese?.objetivos || '',
      lesoes: user?.anamnese?.lesoes || '',
      restricoes: user?.anamnese?.restricoes || '',
      medicamentos: user?.anamnese?.medicamentos || '',
      experiencia: user?.anamnese?.experiencia || '',
      observacoes: user?.anamnese?.observacoes || '',
    };
    const planoAtual = {
      restricoes: user?.nutriInfos?.restricoes ?? null,
      planoNutricional: user?.nutriInfos?.planoNutricional ?? [],
    };

    const userContent = [
      'Mensagem do cliente: ' + String(conteudo),
      'Plano nutricional atual do cliente: ' + JSON.stringify(planoAtual),
      'Perfil do cliente: ' + JSON.stringify(perfilCliente),
      'Anamnese do cliente: ' + JSON.stringify(anamnese),
    ].join('\n');



    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.2
    });

    // Registrar uso de IA pelo custo (R$)
    const _usage = resp?.usage || {};
    const _reg = await registerAiUsage(email, {
      model: OPENAI_MODEL,
      promptTokens: Number(_usage.prompt_tokens || 0),
      completionTokens: Number(_usage.completion_tokens || 0),
      profissionalId,
    });

    const text = resp?.choices?.[0]?.message?.content || null;

    // console.log(text);

    if (!text) return res.status(500).json({ msg: 'Resposta vazia da IA', success: false });

    // Extrair JSON tolerante (procura o primeiro {...})
    let parsed = null;
    try {
      const begin = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (begin === -1 || end === -1) throw new Error('JSON não encontrado na resposta da IA');
      const jsonText = text.slice(begin, end + 1);
      parsed = JSON.parse(jsonText);
    } catch (err) {
      console.error('Erro ao parsear JSON da IA:', err, 'raw:', text);
      return res.status(500).json({ msg: 'Erro ao processar resposta da IA', raw: text, success: false });
    }

    // Validações iniciais
    if (typeof parsed !== 'object' || parsed === null) {
      return res.status(400).json({ msg: 'Resposta da IA não é um objeto JSON válido', success: false });
    }
    if (parsed.success === false) {
      return res.status(200).json({ msg: parsed.msg || 'IA retornou success=false', success: false });
    }

    const nutriInfos = parsed.nutriInfos || null;
    if (!nutriInfos || !Array.isArray(nutriInfos.planoNutricional)) {
      return res.status(400).json({ msg: 'IA não retornou planoNutricional válido', success: false, raw: parsed });
    }

    // Sanitizar plano: aceitar apenas objetos com horaDoDia/conteudo como strings
    const sanitizedPlano = nutriInfos.planoNutricional.map((it, idx) => {
      const hora = (it && typeof it.horaDoDia === 'string') ? it.horaDoDia.trim() : '';
      const conteudoStr = (it && typeof it.conteudo === 'string') ? it.conteudo.trim() : '';
      return { horaDoDia: hora, conteudo: conteudoStr || `Item ${idx + 1}` };
    }).filter(item => typeof item.conteudo === 'string' && item.conteudo.length > 0);

    // Se sanitizedPlano estiver vazio -> erro (IA não gerou conteúdo útil)
    if (!Array.isArray(sanitizedPlano) || sanitizedPlano.length === 0) {
      return res.status(400).json({ msg: 'IA retornou plano vazio ou inválido', success: false, raw: parsed });
    }

    // Atualizar user.nutriInfos garantindo userId correto.
    // Usamos updateOne atômico (e não user.save()) porque registerAiUsage já
    // salvou o mesmo documento acima, deixando este `user` em memória com __v
    // desatualizado — user.save() dispararia VersionError.
    try {
      const atualizadoEm = getBrazilDate();
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'nutriInfos.planoNutricional': sanitizedPlano,
            'nutriInfos.restricoes': String(nutriInfos.restricoes),
            'nutriInfos.atualizadoEm': atualizadoEm,
          },
        }
      );
      user.nutriInfos = { ...(user.nutriInfos || {}), planoNutricional: sanitizedPlano, restricoes: String(nutriInfos.restricoes), atualizadoEm };

      // Broadcast via WebSocket para sincronização em tempo real
      const nutriMessage = {
        type: 'nutri_message',
        userId: String(user._id),
        profissionalId: profissionalId || null,
        message: parsed.msg || 'Plano nutricional atualizado',
        timestamp: new Date().toISOString()
      };

      const nutriUpdate = {
        type: 'nutri_update',
        userId: String(user._id),
        profissionalId: profissionalId || null,
        nutriInfos: {
          userId: String(user._id),
          restricoes: String(nutriInfos.restricoes),
          planoNutricional: sanitizedPlano,
          atualizadoEm: user.nutriInfos.atualizadoEm
        },
        timestamp: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        msg: parsed.msg || 'Plano nutricional criado/atualizado com sucesso',
        nutriInfos: {
          userId: String(user._id),
          restricoes: String(nutriInfos.restricoes),
          planoNutricional: sanitizedPlano
        }
        // Custo em R$ NÃO é exposto ao cliente (uso mostrado só em %).
      });
    } catch (err) {
      console.error('Erro ao salvar nutriInfos no user:', err);
      return res.status(500).json({ success: false, msg: 'Erro ao salvar dados no servidor' });
    }
  } catch (error) {
    console.error('conversarNutri error:', error);
    return res.status(500).json({ msg: 'Erro interno', success: false, error: error.message });
  }
};


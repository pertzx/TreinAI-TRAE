# TreinAI — Sugestões de Features

Roadmap de funcionalidades que podem ser adicionadas ao sistema, organizado por
área e priorizado por **impacto x esforço**. Baseado nos módulos que já existem:
IA com limite de tokens por plano, profissionais (personal / nutri / fisio) e
alunos, chat 1:1, locais com pagamento Stripe, gamificação, reports e LGPD.

Legenda de esforço: 🟢 baixo · 🟡 médio · 🔴 alto

---

## 1. Profissionais & Alunos

- **🟢 Plano de reabilitação para fisioterapeutas** — *(já iniciado)* o painel do
  fisio agora reaproveita a prescrição de exercícios (`MeusTreinos`). Evoluir para
  campos próprios de fisio: queixa principal, escala de dor (EVA 0–10) por sessão,
  metas de ADM (amplitude de movimento) e marcos de recuperação.
- **🟡 Anamnese / ficha de avaliação inicial** — formulário estruturado que o aluno
  preenche ao ser aceito (lesões, restrições, objetivos, medicamentos). Fica
  disponível para o profissional antes de montar o plano.
- **🟡 Modelos (templates) de treino/dieta** — profissional salva planos reutilizáveis
  e aplica em vários alunos com 1 clique, em vez de montar do zero.
- **🟡 Agenda de sessões / consultas** — agendamento com lembretes (push/email),
  reaproveitando o `sendNotificationEmail` já existente.
- **🟢 Notas privadas do profissional** — observações por aluno, visíveis só para o
  profissional (não para o aluno).
- **🟡 Avaliações e nota dos profissionais** — alunos avaliam o profissional após X
  dias; nota média aparece em "Encontrar". Já existe base de `reports`.

## 2. IA (NutriAI / TreinoAI)

- **🟡 Histórico de conversas com a IA** — persistir e permitir retomar/contexto
  contínuo, hoje cada interação é isolada.
- **🟢 Medidor de uso de tokens no front** — *(componente `TokenUsageBar` já criado)*
  garantir que ele apareça nas telas de chat com a IA e mostre "X de Y tokens hoje".
- **🟡 Sugestões proativas da IA** — com base no histórico de treinos/dieta, a IA
  sugere ajustes semanais automaticamente.
- **🟡 Geração de plano completo por IA** — a partir da anamnese, gerar rascunho de
  treino + dieta que o profissional revisa e aprova (human-in-the-loop).
- **🟢 Limites e upsell inteligente** — quando o usuário FREE esgota tokens, mostrar
  CTA de upgrade contextual (já há o code `FREE_TOKENS_EXHAUSTED` no backend).

> Para qualquer evolução de IA, usar os modelos Claude mais recentes (Opus 4.8 /
> Sonnet 4.6 / Haiku 4.5) conforme custo x qualidade de cada caso.

## 3. Chat & Comunicação

- **🟢 Indicador de não lidas global** — badge no menu usando `useUnreadChats` que já
  existe.
- **🟡 Anexos no chat** — o schema `Chat.mensagens.anexos` já prevê arquivos/imagens;
  falta a UI de upload e o endpoint de armazenamento (Cloudinary já é usado).
- **🟡 Notificações push** — avisar nova mensagem/aceite de aluno mesmo com app fechado.
- **🟢 Mensagens rápidas / respostas prontas** — atalhos para o profissional responder
  dúvidas comuns.

## 4. Locais (Gyms / Clínicas)

- **🟡 Mapa interativo** — já existe índice geoespacial (`location: 2dsphere`) no model;
  exibir locais próximos em mapa com filtro por raio.
- **🟢 Página pública do local** — landing com fotos, horário, avaliações e botão de
  contato.
- **🟡 Check-in / frequência** — usuário registra presença; vira dado de gamificação.

## 5. Gamificação & Engajamento

- **🟡 Sequência (streak) de treinos** — dias consecutivos, com recompensas.
- **🟢 Conquistas / badges** — marcos (primeiro treino, 30 dias, meta atingida).
- **🟡 Ranking entre alunos do mesmo profissional** — opcional e anonimizável.
- **🟢 Resumo semanal por email** — progresso + motivação, reusando o serviço de email.

## 6. Monetização

- **🟡 Trial do plano pago** — X dias grátis de PRO/MAX para converter usuários FREE.
- **🟡 Planos anuais com desconto** — novos price IDs no Stripe.
- **🟢 Página de comparação de planos** — tabela clara FREE / PRO / MAX / COACH com
  os limites de tokens já definidos em `TOKEN_LIMITS`.
- **🟡 Cupons / indicação (referral)** — usuário ganha tokens/dias ao indicar.

## 7. Confiabilidade, Segurança & LGPD

- **🟢 Finalizar suíte de autorização** — os middlewares `isSelf`, `canAccessAluno`,
  `isChatParticipant` foram corrigidos; aplicar a mesma proteção nas demais rotas que
  acessam dados de terceiros (treinos, perfil, locais).
- **🟢 Concluir fluxo LGPD** — `PrivacyPolicy`, `LgpdCookieBanner`, `LgpdDataExport` e
  `useLgpdStorage` já existem; ligar exportação/exclusão de dados ao backend.
- **🟡 Logs de auditoria** — registrar ações sensíveis (aceite de aluno, exclusão de
  dados, mudança de plano).
- **🟡 Testes automatizados** — cobrir middlewares de autorização e limites de token
  para evitar regressões como a que bloqueava alunos no chat.
- **🟢 Rate limiting nas rotas de IA** — proteger contra abuso/custos (já há
  `rateLimitMiddleware` para login).

## 8. Experiência do Usuário

- **🟢 Onboarding guiado** — tour inicial para aluno e para profissional.
- **🟡 Dashboard de progresso visual** — gráficos de peso, medidas e cargas
  (reaproveitar `HistoricoChart`).
- **🟢 Modo offline / PWA** — instalar como app e acessar treinos sem internet.
- **🟢 Acessibilidade** — contraste, navegação por teclado e leitores de tela.

---

## Sugestão de priorização (próximos passos)

1. **Fechar fundações** — autorização nas rotas restantes + fluxo LGPD + `TokenUsageBar`
   visível. Baixo esforço, alto valor de confiança.
2. **Anamnese + templates de treino/dieta** — multiplica a produtividade do profissional.
3. **Histórico de conversas com IA + anexos no chat** — aumenta retenção.
4. **Gamificação (streak/badges) + resumo semanal** — engajamento de longo prazo.
5. **Trial e planos anuais** — conversão e receita.

> Documento vivo — atualize conforme as features forem entregues.

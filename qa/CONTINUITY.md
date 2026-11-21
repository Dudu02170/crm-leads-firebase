# Próximos contatos — entrega e continuidade

## Comportamento e critérios de aceitação
- Campo opcional `proximoContato` em formato AAAA-MM-DD no registro existente do lead. Criar/editar grava somente o lead escolhido e a atividade normal já existente.
- Leads sem o campo aparecem sem agendamento. A tabela mostra a data completa com Hoje, Atrasado ou Agendado; o funil mostra a mesma informação quando há data válida.
- Hoje usa o calendário local do navegador. Datas anteriores são atrasadas; posteriores são futuras. Não altera a data do último contato nem aplica restrição implícita por status: um lead Fechado também pode ter um próximo contato.
- Filtros Hoje ou atrasados, Futuros e Sem próximo contato combinam com status, segmento e busca. Consultar não faz gravações.
- Ordenação opcional por próximo contato: datas válidas crescentes, sem agenda válida ao final, desempate por nome e id. Atualizados recentemente permanece como padrão. A seleção se mantém ao voltar do funil e ao editar; reagendar reposiciona o lead sem mudar os demais.
- Cancelar a edição preserva a agenda; limpar e salvar remove somente a data. Novo lead abre com o campo vazio.
- Registrar Contato feito hoje exige confirmação e altera apenas data/updatedAt do lead escolhido; preserva proximoContato, owner, status, notas, campos desconhecidos e demais leads. Cancelar não grava; erro no update libera nova tentativa. O botão bloqueia submissões locais durante o envio e quando o último contato já é hoje, sem garantir deduplicação entre clientes concorrentes.
- Editar um lead com segmento legado fora das opções fixas preserva esse valor. Voltar à tabela após editar no funil mostra o valor atualizado.

## Como testar
`cd qa && npm install && npm test` com Node.js 22+ e Chrome. Vinte cenários Selenium, mantendo os onze anteriores. Resultado e logs finais no PR da funcionalidade. Verificações locais: sintaxe do script, sintaxe dos testes, diff --check e helpers reais de validação de calendário.

## Dependência e limites
Parte da branch `qa/test-automation`, do PR #1 ainda aberto. Revisar/integrar a suíte antes de retargetar a funcionalidade para main, sem duplicar commits, merge automático ou force-push. Não há AGENTS.md no checkout nem nos diretórios ancestrais consultados.
Interface real com Firebase em memória e dados fictícios. Não executa autenticação, regras, concorrência ou durabilidade reais. Não existe back-end Java neste produto; não foi criado um serviço artificial. O agendamento organiza o trabalho da equipe, sem notificações ou mensagens externas. Datas inválidas já presentes no campo são tratadas como sem agendamento na consulta; não há migração de registros.

## Próximos passos
1. Fila por data e registro explícito de contato realizado entregues. Avaliar uma decisão explícita de reagendar/remover um contato vencido após registrar o realizado, sem apagar a data silenciosamente.
2. Validar persistência e regras com Firebase Emulator antes de afirmar integração real; conferir o controle de data em outros navegadores.

## Limites do registro de contato
As operações de atualizar o lead e registrar a atividade são separadas, como no fluxo de edição existente; não há garantia de atomicidade entre elas. A regressão de falha simula somente rejeição do update do lead. O bloqueio é local à página; concorrência real e falha exclusiva do log exigem validação própria com Firebase Emulator.

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
`cd qa && npm install && npm test` com Node.js 22+ e Chrome. Vinte e quatro cenários Selenium, mantendo os onze anteriores. Resultado e logs finais no PR da funcionalidade. Verificações locais: sintaxe do script, sintaxe dos testes, diff --check e helpers reais de validação de calendário.

## Dependência e limites
Parte da branch `qa/test-automation`, do PR #1 ainda aberto. Revisar/integrar a suíte antes de retargetar a funcionalidade para main, sem duplicar commits, merge automático ou force-push. Não há AGENTS.md no checkout nem nos diretórios ancestrais consultados.
Interface real com Firebase em memória e dados fictícios. Não executa autenticação, regras, concorrência ou durabilidade reais. Não existe back-end Java neste produto; não foi criado um serviço artificial. O agendamento organiza o trabalho da equipe, sem notificações ou mensagens externas. Datas inválidas já presentes no campo são tratadas como sem agendamento na consulta; não há migração de registros.

## Próximos passos
1. Fila, registro realizado e conclusão explícita de agenda vencida entregues. Reagendamento continua disponível no editor, sem apagar datas silenciosamente.
2. Validar persistência e regras com Firebase Emulator antes de afirmar integração real; conferir o controle de data em outros navegadores.

## QA-CRM-001 — Data alterada quando a atividade falha
Na versão 0d7108f, a atualização do lead era concluída antes da atividade. A reprodução da função real isolada com adaptadores confirmou a data alterada mesmo quando o log falhava; não era uma integração de navegador/Firebase.

Correção: a ação usa uma única atualização multipath com data/updatedAt do lead e o registro da atividade. A chave da atividade é reservada antes, sem gravação. Critérios: rejeição de qualquer parte preserva todo o estado no adaptador; a UI informa erro, libera o botão e permite nova tentativa; sucesso envia exatamente três caminhos sem substituir outros campos ou leads; os bloqueios/cancelamentos anteriores permanecem.

O contrato multipath é documentado pelo Firebase (https://firebase.google.com/docs/database/web/read-and-write). A suíte verifica a ação real com um adaptador que simula esse contrato, incluindo falha exclusiva da atividade. Não executa SDK, regras, eventos otimistas ou persistência reais. O bloqueio continua local à página e não deduplica clientes concorrentes. A correção se limita ao registro de contato: criação/edição/exclusão mantêm os fluxos anteriores. Próxima validação necessária: permissões e rejeição do lote com Firebase Emulator.

## Concluir agendamento após o contato
Na tabela, Concluir agendamento aparece somente quando o último contato é hoje e o próximo contato é hoje ou atrasado. A confirmação informa que apenas a agenda será removida; não altera data do contato, responsável, status, notas, campos desconhecidos ou outros leads. Agenda futura, inválida ou ausente não oferece a ação; registrar contato continua preservando a agenda por padrão.

Aceitação: cancelar não grava; envio bloqueia repetição local; sucesso limpa proximoContato e envia updatedAt/atividade na mesma atualização multipath, sem substituir o lead. Rejeição de lead ou atividade mantém todo o estado e libera nova tentativa no adaptador. Três cenários Selenium adicionais cobrem elegibilidade, confirmação/cancelamento, espera, preservação, falhas e recuperação. Usam os hooks existentes, sem modificar o adaptador ou relaxar as 21 regressões anteriores. Resultado final no PR #2/Actions.

Limites: a atomicidade é o contrato simulado do Firebase em memória; não valida SDK, regras, concorrência ou durabilidade reais. A condição usa o dia local e o estado observado na página; não há deduplicação entre clientes nem transação condicional no servidor. Não remove agenda automaticamente nem realiza contato externo. Próxima validação: Firebase Emulator para regras e rejeições do lote; reagendamento permanece pelo editor.

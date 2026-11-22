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
`cd qa && npm install && npm test` com Node.js 22+ e Chrome. Trinta cenários Selenium, mantendo os onze anteriores. Resultado e logs finais no PR da funcionalidade. Verificações locais: sintaxe do script, sintaxe dos testes, diff --check e helpers reais de validação de calendário.

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

## QA-CRM-002 — Texto do lead era interpretado como HTML
Inspeção em 9a066a3: tabela/funil interpolam nome, interesse, notas, segmento e outros textos diretamente em innerHTML; o filtro cria opções por HTML; atividades interpolam autor e ação sem separar texto da formatação. Um nome como <span id="qa-name-mark">Ana & QA</span> cria um elemento em vez de mostrar o valor literal, e aspas no segmento podem alterar o valor do filtro.

Entregue: escape dos campos apresentados, incluindo rótulos/atributos dos links; opções de segmento criadas com Option para preservar valor/seleção. Atividades novas escapam nomes/status interpolados; na apresentação do histórico, somente strong é reconstruído, sem atributos. Outros elementos são mostrados como texto, e o autor é texto. Não migra nem regrava leads/atividades antigos para consultar. Valores dos campos do lead continuam originais no formulário e no adaptador.

Critérios: dois cenários Selenium adicionais preservam a marcação como texto na tabela/funil/filtro/atividade, mantêm valores ao reabrir editor, não criam os elementos/atributos fornecidos e preservam outro lead; atividade legada mantém negrito sem atributos nem inserir outros elementos. Consultar não grava e não altera dados. Mantém os 24 cenários anteriores e o adaptador de Firebase. Total: 26 Selenium, resultado final no PR #2/Actions.

Limites: correção de apresentação dos textos e formato de atividade, não auditoria completa ou validação de URLs/identificadores externos. O parse do histórico usa template inerte e reconstrói apenas strong/texto; não reutiliza os elementos recebidos. Persistência/regras reais continuam fora da suíte; validar no Emulator antes de afirmar integração. Executar: cd qa && npm install && npm test, com Node 22 e Chrome.

## QA-CRM-003 — Salvamento de lead sem atividade e sem tratamento de erro
Reconfirmado em cf555ea: saveLead grava o lead, chama logActivity sem aguardar o resultado e fecha o modal. Uma falha de atividade deixa criação/edição sem histórico. A função anterior isolada com adaptador mínimo que não persiste a atividade confirmou lead alterado e modal fechado; não foi integração Firebase real.

Entregue: criação/edição e atividade em uma única atualização multipath. Criação reserva chave sem escrita e envia o novo lead/atividade; edição envia os doze campos existentes por caminho, preservando campos desconhecidos e createdAt. Nomes/status continuam escapados nas atividades. Falha mantém modal aberto, rascunho intacto e apresenta erro; nova tentativa é liberada. Enquanto salva, campos e botões do modal ficam desabilitados, com Salvando...; fechamento/troca de lead são bloqueados e só sucesso fecha o formulário.

Aceitação: dois cenários Selenium novos (total 28) cobrem rejeição da atividade no cadastro sem criar lead parcial, preservação do rascunho, espera/repetição/cancelamento bloqueados, retry criando exatamente um lead/atividade; edição com falhas de lead/atividade conserva todo o estado e rascunho, depois salva campos específicos e mantém campo legado/createdAt/outro lead. O adaptador de Firebase não foi alterado. As 26 regressões anteriores continuam; quatro asserções de caminhos/contagem passam a medir os campos e o lote próprios da ação, sem remover verificações de dados.

Limites: contrato atômico simulado em memória, não valida regras/SDK/eventos otimistas/concorrência reais. Não deduplica clientes e não oferece transação condicional em servidor. A exclusão foi tratada separadamente em QA-CRM-004 abaixo. Próxima validação: Firebase Emulator para permissões e rejeições do lote. Executar cd qa && npm install && npm test, com Node 22 e Chrome; resultado final no PR #2/Actions.

## QA-CRM-004 — Exclusão parcial sem atividade e sem tratamento de falha
Reconfirmado por inspeção em 425ada3: deleteLead aguarda remove do lead, depois chama o histórico sem aguardar; falha de atividade pode deixar o lead removido sem registro, e rejeição da remoção não apresenta recuperação na UI. Exclusão passa a enviar leads/id=null e atividade na mesma atualização multipath, reservando a chave antes de gravar.

Aceitação: manter confirmação/cancelamento existente; rejeição de lead ou atividade preserva todos os dados e permite nova tentativa. Durante espera, Removendo... bloqueia repetição e ações sobre o mesmo lead; funil não abre editor desse lead. Outros leads/atividades permanecem iguais. Sucesso remove exatamente o escolhido e acrescenta uma atividade no mesmo lote de dois caminhos. Dois novos cenários Selenium, total vigente 30, com hooks existentes e adaptador inalterado. As 28 regressões anteriores permanecem sem alteração. Erro apresenta mensagem e reabilita ações.

Limites: atomização do contrato simulado em memória, não teste de Firebase real, regras, concorrência entre clientes ou exclusão condicional em servidor. O bloqueio é local. Não apaga histórico anterior nem realiza mensagens externas. Próxima validação continua sendo Firebase Emulator para regras/rejeições do lote e persistência real. Como testar: cd qa && npm install && npm test (Node 22 e Chrome); evidência final no PR #2/Actions.

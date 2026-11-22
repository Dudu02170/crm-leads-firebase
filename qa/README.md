# Regressão CRM
Node.js 22+, Chrome, JavaScript e Selenium.
```sh
cd qa
npm install
npm test
```
Vinte e um cenários: credencial inválida, busca/filtros combinados, criação sem sobrescrever leads existentes, duplicata de Instagram, edição/funil, exclusão/cancelamento e quatro regressões de próximo contato.
O servidor local substitui os scripts externos do Firebase por um adaptador em memória. As telas, validações e renderização continuam sendo as reais do index.html.
Apenas no sandbox: qa@example.test / SenhaQA123!. Todos os dados são fictícios.
Não mede regras de segurança, autenticação real, durabilidade ou concorrência do Firebase. Para esses casos é necessária uma suíte posterior com Firebase Emulator.
Evidências nas falhas e JUnit ficam em reports/. CI executa em PRs. Não usa credenciais reais.

## Próximo contato
Editar um lead permite informar uma data opcional. A tabela e o funil distinguem Hoje, Atrasado e Agendado usando o dia local do navegador. A consulta por agenda combina com busca/status/segmento, sem gravar dados ou atividade. Leads antigos sem o campo continuam sem agendamento; não há migração. Limpar o campo e salvar remove a data; cancelar descarta o rascunho.

As quatro regressões novas verificam cadastro com data, edição e retorno do funil à tabela, hoje/atrasados/futuros/sem data com filtros combinados, preservação dos leads preexistentes, cancelamento e remoção da data. Um segmento legado fora das opções fixas deve permanecer preservado ao editar.

Os campos de data recebem valores ISO por DOM e eventos input/change; a suíte não valida o calendário visual do navegador. Datas relativas são calculadas pelo relógio local do Chrome, sem congelar o relógio ou invocar funções internas. Salvar e reabrir verifica o estado do adaptador em memória, não durabilidade do Firebase real após recarga.

## Fila de próximos contatos
Selecionar Próximo contato (mais antigo primeiro) ordena a tabela pelas datas válidas em ordem crescente. Sem agenda válida, o lead fica ao final. Empates usam nome (pt-BR, sem diferenciar caixa) e identificador; a opção Atualizados recentemente mantém o comportamento anterior e é o padrão. Ordenar combina com os filtros e não grava dados. A opção permanece selecionada ao voltar do funil e ao salvar uma edição, que reposiciona o lead na fila.

Duas regressões adicionais verificam a ordem exata de atrasado/hoje/futuro/sem agenda, a combinação com filtros e o retorno à ordem recente sem gravações; e o desempate por nome/id com reposicionamento após reagendar ou limpar uma data. Todos os leads e agendamentos desses cenários são preparados pelo formulário real, usando o adaptador de persistência já documentado.

## Registrar contato realizado
Na tabela, Contato feito hoje pede confirmação e atualiza somente a data do último contato e updatedAt. Preserva a agenda, responsável, status, notas e os outros leads; registra a atividade da pessoa conectada. O botão fica bloqueado durante a gravação e quando o último contato já é hoje. Cancelar não grava. Falha na gravação do lead apresenta erro e libera nova tentativa. Não realiza contato externo.

Três novas regressões cobrem confirmação com agenda preservada, bloqueio durante envio, cancelamento, lead sem agenda e falha seguida de recuperação. No adaptador QA, __qaHoldNextLeadWrite e __qaReleaseLeadWrite permitem segurar/liberar uma gravação sem sleep fixo; __qaFailNextLeadWrite rejeita a próxima atualização de lead. Não alteram a implementação da ação nem são integração Firebase. A injeção de erro cobre o caminho do lead e, com __qaFailNextActivityWrite, o caminho de atividade. Na ação de contato, os dois são enviados em uma única atualização multipath.

## Atualização conjunta do contato e da atividade
QA-CRM-001: a versão 0d7108f atualizava a data antes de gravar a atividade; uma falha nesta segunda etapa deixava contato sem atividade. A ação agora reserva a chave da atividade sem gravar e envia três caminhos no mesmo `db.ref().update`: data e updatedAt do lead, mais o novo registro de atividade. Não substitui o lead inteiro nem altera outras coleções.

O adaptador QA prepara todas as alterações em uma cópia e só publica após verificar as falhas injetadas. `__qaAtomicUpdates` registra cada chamada multipath aceita; `__qaWrites` lista seus caminhos, não o número de requisições de rede. A nova regressão rejeita o caminho da atividade, exige dados/atividade intactos, verifica nova tentativa bem-sucedida e confere os três caminhos em uma única chamada. As vinte regressões anteriores continuam ativas, com as asserções de caminhos atualizadas para o novo formato de escrita.

Contrato da API consultado: https://firebase.google.com/docs/database/web/read-and-write#update_specific_fields (atualização simultânea de vários caminhos). Essa documentação não substitui execução com SDK/Emulator real: regras, eventos otimistas e persistência/concorrência reais continuam fora da suíte. Criar/editar/excluir lead ainda usa os fluxos anteriores; esta correção se limita a Contato feito hoje.

## Concluir agendamento vencido explicitamente
Após registrar contato hoje, a tabela oferece Concluir agendamento se a agenda é de hoje ou atrasada. Confirmação limpa somente proximoContato, atualiza updatedAt e registra a atividade numa atualização multipath. Preserva o contato realizado e demais dados. Agenda futura não é removida; cancelar não grava. Durante o envio o botão bloqueia repetição, e falhas liberam nova tentativa.

Três cenários adicionais (total: 24 Selenium) percorrem a UI real com Firebase em memória: cancelamento/sucesso com espera e preservação, rejeição de lead/atividade seguida de recuperação e condições de exibição para agenda ausente/futura/vencida/hoje. O adaptador e os 21 cenários anteriores foram preservados. O calendário é o local do Chrome. Não valida Firebase real, concorrência ou durabilidade e não há backend Java neste produto. Evidência final no Actions do PR #2. Execução local do navegador permanece limitada pelo ambiente; sintaxe e diff --check podem ser verificados localmente.

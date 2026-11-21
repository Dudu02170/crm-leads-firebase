# Regressão CRM
Node.js 22+, Chrome, JavaScript e Selenium.
```sh
cd qa
npm install
npm test
```
Dezessete cenários: credencial inválida, busca/filtros combinados, criação sem sobrescrever leads existentes, duplicata de Instagram, edição/funil, exclusão/cancelamento e quatro regressões de próximo contato.
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

# Regressão CRM
Node.js 22+, Chrome, JavaScript e Selenium.
```sh
cd qa
npm install
npm test
```
Quinze cenários: credencial inválida, busca/filtros combinados, criação sem sobrescrever leads existentes, duplicata de Instagram, edição/funil, exclusão/cancelamento e quatro regressões de próximo contato.
O servidor local substitui os scripts externos do Firebase por um adaptador em memória. As telas, validações e renderização continuam sendo as reais do index.html.
Apenas no sandbox: qa@example.test / SenhaQA123!. Todos os dados são fictícios.
Não mede regras de segurança, autenticação real, durabilidade ou concorrência do Firebase. Para esses casos é necessária uma suíte posterior com Firebase Emulator.
Evidências nas falhas e JUnit ficam em reports/. CI executa em PRs. Não usa credenciais reais.

## Próximo contato
Editar um lead permite informar uma data opcional. A tabela e o funil distinguem Hoje, Atrasado e Agendado usando o dia local do navegador. A consulta por agenda combina com busca/status/segmento, sem gravar dados ou atividade. Leads antigos sem o campo continuam sem agendamento; não há migração. Limpar o campo e salvar remove a data; cancelar descarta o rascunho.

As quatro regressões novas verificam cadastro com data, edição e retorno do funil à tabela, hoje/atrasados/futuros/sem data com filtros combinados, preservação dos leads preexistentes, cancelamento e remoção da data. Um segmento legado fora das opções fixas deve permanecer preservado ao editar.

Os campos de data recebem valores ISO por DOM e eventos input/change; a suíte não valida o calendário visual do navegador. Datas relativas são calculadas pelo relógio local do Chrome, sem congelar o relógio ou invocar funções internas. Salvar e reabrir verifica o estado do adaptador em memória, não durabilidade do Firebase real após recarga.

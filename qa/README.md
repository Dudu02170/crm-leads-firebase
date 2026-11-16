# Regressão CRM
Node.js 22+, Chrome, JavaScript e Selenium.
```sh
cd qa
npm install
npm test
```
Sete cenários: credencial inválida, busca, filtro, criação, duplicata de Instagram, edição/funil e exclusão/cancelamento.
O servidor local substitui os scripts externos do Firebase por um adaptador em memória. As telas, validações e renderização continuam sendo as reais do index.html.
Apenas no sandbox: qa@example.test / SenhaQA123!. Todos os dados são fictícios.
Não mede regras de segurança, autenticação real, durabilidade ou concorrência do Firebase. Para esses casos é necessária uma suíte posterior com Firebase Emulator.
Evidências nas falhas e JUnit ficam em reports/. CI executa em PRs. Não usa credenciais reais.

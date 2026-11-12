# CRM de Leads com Firebase

CRM web para uma equipe comercial organizar a prospecção de clientes pelo Instagram e pelo WhatsApp. Substituiu uma ferramenta paga e atualiza em tempo real para toda a equipe.

> Versão de portfólio: o nome da empresa e as credenciais do Firebase foram removidos.

## Funcionalidades

- **Leads** em tabela com busca e filtros por status e por segmento, mostrando responsável, interesse, data do último contato e **dias parado** (com alerta de cor quando o lead esfria).
- **Funil Kanban:** Prospect → Primeiro contato → Em contato → Catálogo enviado → Em fechamento → Fechado / Perdido.
- **Atalhos de contato:** links diretos para o WhatsApp (`wa.me`) e para o perfil do Instagram do lead.
- **Atividade da equipe:** registro em tempo real de quem criou, editou ou moveu cada lead.
- **Estratégia:** roteiro de captação no Instagram em 5 etapas (encontrar, engajar, abordar, cadência de follow-up e segmentos-alvo), para padronizar o trabalho do time.
- **Login e cadastro** de usuários com Firebase Authentication.

## Como rodar

1. Crie um projeto no [Firebase](https://console.firebase.google.com) com **Authentication (e-mail e senha)** e **Realtime Database**.
2. No `index.html`, preencha o objeto `firebaseConfig` com os dados do seu app da Web.
3. Configure as regras do Realtime Database para permitir leitura e escrita só para usuários logados.
4. Abra com um servidor estático (`npx serve .`) ou publique com `firebase deploy --only hosting`.

## Tecnologias

JavaScript · HTML · CSS · Firebase Authentication · Firebase Realtime Database · Firebase Hosting

## Autor

**Eduardo Consul** · [LinkedIn](https://www.linkedin.com/in/eduardo-consul/) · [GitHub](https://github.com/Dudu02170)

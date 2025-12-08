# Hoje É Onde?

Projeto da disciplina INF 321 - Projeto e Desenvolvimento de Sistemas Para a Web (UFV) com dados ilustrativos.

Trabalho por Maryana Costa do Vale (105820) e Alice Silva Mendonça (112705).

O **Hoje É Onde?** é uma aplicação web focada na divulgação centralizada de eventos, festas e promoções na cidade de Viçosa. O objetivo é facilitar a socialização, conectando organizadores e público através de uma interface intuitiva e cronológica.

## Funcionalidades

### Visitantes
- **Navegação cronológica:** visualização de eventos por dia com navegação fácil e calendário completo.
- **Filtros e ordenação:** filtragem por tipo de evento e ordenação por horário ou popularidade.
- **Detalhes do evento:** visualização expandida de banners, localização, horário e descrição completa.

### Usuários Cadastrados
- **Interatividade:** botão de "Gosto" (like) e opção de "Salvar" eventos em uma lista pessoal.
- **Submissão de eventos:** formulário para envio de novos eventos com upload de imagem e validação de dados.
- **Área do usuário:** painel para gerenciar eventos submetidos (ver status de aprovação) e visualizar eventos salvos.

### Administração
- **Painel administrativo:** área restrita para moderação.
- **Aprovação/Recusa:** O administrador pode aprovar (publicar) ou recusar (excluir) eventos submetidos pelos usuários.
- **Gestão de equipe:** Cadastro de novos administradores com segurança.

## Tecnologias Utilizadas

**Frontend:**
- HTML5, CSS3 e JavaScript
- **Bootstrap 5** para layout responsivo e componentes visuais.
- **SweetAlert2** para feedbacks visuais e popups.

**Backend:**
- **Node.js** & **Express** para servidor e gerenciamento de rotas.
- **EJS (Embedded JavaScript)** como motor de visualização (View Engine).
- **SQLite3** como banco de dados relacional leve e eficiente.

**Segurança e utilitários:**
- **Bcrypt** para criptografia de senhas dos usuários.
- **Multer** para gerenciamento de upload de imagens (banners).
- **Express-Session** para gerenciamento de sessões de login.

## Como rodar o projeto

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/maryanacosta/hoje_e_onde.git](https://github.com/maryanacosta/hoje_e_onde.git)

2. **Entre na pasta do projeto:**
   ```bash
   cd hoje_e_onde

3. **Instale as dependências:**
   ```bash
   npm install

4. **Inicie o servidor:**
   ```bash
   node app.js

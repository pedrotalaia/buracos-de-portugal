
# Contribuir para o Portugal Road Watch

Obrigado pelo teu interesse em contribuir! Este guia vai ajudar-te a começar e garantir um processo de contribuição simples e eficaz.

## Pré-requisitos

- **Docker** (recomendado para garantir um ambiente de desenvolvimento consistente)
- **Git**
- **Node.js 18+** (opcional, caso queiras correr a aplicação sem Docker)

## Como começar

1. **Faz fork do repositório** no GitHub.
2. **Clona o teu fork**:
   ```sh
   git clone https://github.com/<o-teu-utilizador>/buracos-de-portugal.git
   cd buracos-de-portugal
   ```
3. **Copia o ficheiro de variáveis de ambiente de exemplo** e preenche os valores necessários:
   ```sh
   cp .env.example .env
   # Edita o .env e adiciona as tuas credenciais do Neon
   ```
4. **Inicia a aplicação localmente**:
   - Com Docker (recomendado):
     ```sh
     docker compose up --build
     ```
   - Ou com Node.js:
     ```sh
     npm install
     npm run dev
     ```

## Fluxo de desenvolvimento

- **Nomenclatura de branches**: Usa os prefixos `feature/`, `fix/` ou `chore/` (ex: `feature/adicionar-filtro-mapa`).
- **Commits**: Segue o padrão [Conventional Commits](https://www.conventionalcommits.org/) (ex: `feat: adicionar diálogo de reporte de buraco`).
- **Executa testes e linter** antes de fazer push:
  ```sh
  npm run lint
  npm run test
  ```

## Submeter um Pull Request

1. **Faz push da tua branch** para o teu fork.
2. **Abre um pull request** para a branch `main` deste repositório.
3. **Associa o PR ao issue relevante** (se aplicável).
4. **Inclui uma descrição clara** das tuas alterações.
5. **Checklist antes de submeter:**
   - [ ] O código compila e corre localmente
   - [ ] Os testes e o linter passam
   - [ ] Segue o estilo e convenções do projeto
   - [ ] Documentação/comentários atualizados se necessário

## Estilo de código

- **TypeScript**: Usa tipagem estrita e interfaces.
- **Tailwind CSS**: Prefere classes utilitárias para estilos.
- **Componentes**: Usa componentes funcionais e hooks. Organiza a UI em `src/components` e a lógica em `src/hooks`.

## Arquitetura do projeto

- **pages/**: Páginas/rotas principais (ex: `Index.tsx`, `Sobre.tsx`).
- **components/**: Componentes reutilizáveis, organizados por funcionalidade (ex: `Map/`, `ui/`).
- **hooks/**: Hooks React personalizados para dados e lógica (ex: `usePotholes.ts`).
- **contexts/**: Providers de contexto React (ex: `AuthContext.tsx`).
- **lib/**: Funções utilitárias e integrações com APIs.
- **Integração com Supabase**: Gerida por variáveis de ambiente e usada para autenticação e armazenamento de dados.

---

Se tiveres dúvidas, abre um issue ou pergunta nas discussões. Boas contribuições!

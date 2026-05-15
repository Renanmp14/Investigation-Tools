# Investigation Tools

Ferramenta desktop para **investigação e análise de código** armazenado em tabelas de banco de dados PostgreSQL ou SQL Server. Permite pesquisar, visualizar e explorar registros com colunas JSON de forma rápida, sem precisar escrever SQL manualmente.

---

## Para que serve

Investigation Tools é voltada para desenvolvedores e analistas que precisam **inspecionar configurações e regras de negócio** armazenadas em tabelas como `workflowdatastudio`, `actionsstudio`, `formstudio` e `liststudio`. 

Funcionalidades principais:
- Conexão com PostgreSQL e SQL Server (configurações salvas)
- Pesquisa por palavras-chave com filtros (contém, começa com, termina com, igual a)
- Visualização de colunas JSON com expansão individual
- **Investigação dentro do JSON**: pesquisa com realce e navegação por ocorrências
- Exportação de campos JSON para arquivo
- Editor SQL avançado com execução direta
- Suporte a tabelas customizadas (além das padrão)
- Pesquisas salvas com exportação/importação

---

## Como usar

### 1. Conectar ao banco de dados

1. Ao abrir a aplicação, a tela de conexão é exibida
2. Preencha os campos: **Tipo** (PostgreSQL ou SQL Server), **Host**, **Porta**, **Usuário**, **Senha**
3. Clique em **⟳ List** ao lado do campo Banco para listar os bancos disponíveis no servidor, ou digite o nome manualmente
4. Clique em **Connect**
5. Para salvar a configuração, clique em **💾 Save** e dê um nome à conexão
6. Conexões salvas aparecem no painel esquerdo — clique para reconectar rapidamente

---

### 2. Investigar tabelas padrão

As quatro tabelas mapeadas aparecem automaticamente na barra lateral:

| Tabela | Colunas pesquisáveis | Colunas JSON |
|---|---|---|
| **Workflow Data Studio** | `nodes`, `edges`, `workflow` | nodes, edges, workflow |
| **Actions Studio** | `precommand`, `poscommand` | precommand, poscommand, rules |
| **Form Studio** | `precommand`, `poscommand` | precommand, poscommand |
| **List Studio** | `filter`, `posfilter` | filter, posfilter |

**Para pesquisar:**
1. Clique na tabela desejada na barra lateral
2. Selecione a coluna a pesquisar
3. Escolha o tipo de filtro (Contém, Igual a, Começa com, Termina com)
4. Digite o termo e clique em **Search**
5. Os resultados aparecem em formato tabular com nome de referência principal

**Para expandir um resultado:**
1. Clique no botão **▼** na linha desejada
2. Todos os campos são exibidos em uma grade
3. Campos JSON aparecem **colapsados por padrão** com um preview
4. Clique em **Expand ▼** no campo JSON para abrir o visualizador
5. Use **Copy** ou **Export** para copiar/baixar o conteúdo JSON

**Para investigar o conteúdo de um campo JSON expandido:**
1. Digite o termo na barra de busca do campo JSON
2. Selecione o tipo de filtro
3. Os resultados aparecem como lista de pares `caminho = valor` com o termo **grifado**
4. Use **↑ ↓** ou **Enter / Shift+Enter** para navegar entre ocorrências
5. Quando não há busca ativa, o JSON é exibido como árvore interativa

---

### 3. Criar investigações para tabelas personalizadas

Para investigar tabelas que não estão mapeadas por padrão:

1. Clique em **⚙ Manage Tables** no rodapé da barra lateral
2. Clique em **+ New Table**
3. Preencha:
   - **Table Name (SQL)**: nome exato da tabela no banco (ex: `mytable`)
   - **Schema**: schema SQL (ex: `public` para PostgreSQL, `dbo` para SQL Server)
   - **Display Label**: nome de exibição na interface
   - **Name Column**: coluna usada como referência principal nos resultados
   - **Primary Key**: coluna de chave primária
   - **Order By**: coluna para ordenação
   - **JSON Columns**: colunas que contêm JSON, separadas por vírgula
   - **Search Columns**: colunas disponíveis para pesquisa (adicione quantas quiser)
4. Clique em **Create Table**
5. A tabela aparece na barra lateral com badge `custom`

As tabelas personalizadas são salvas localmente no navegador (localStorage).

---

### 4. Salvar e reutilizar pesquisas

**Para salvar uma pesquisa:**
1. Configure a pesquisa (tabela, coluna, filtro, termo)
2. Clique em **★ Saved** na área de pesquisa
3. Clique em **+ Save** e dê um nome à pesquisa
4. A pesquisa fica salva para uso futuro

**Para carregar uma pesquisa salva:**
1. Clique em **★ Saved**
2. Clique em uma pesquisa da lista
3. Os filtros são preenchidos automaticamente — clique em Search para executar

**Exportar/Importar pesquisas:**
- **↓ Export**: baixa todas as pesquisas salvas como arquivo JSON
- **↑ Import**: carrega pesquisas de um arquivo JSON exportado anteriormente
- Ideal para compartilhar configurações com a equipe

---

### 5. Editor SQL avançado

1. Clique na aba **SQL Editor** no topo
2. Digite qualquer query SQL na área de texto
3. Pressione **Ctrl+Enter** ou clique em **▶ Execute**
4. Os resultados aparecem em formato tabular com contador de linhas e tempo de execução
5. Clique em **Load Example** para carregar um exemplo de query para a tabela selecionada

#### Exemplos de queries

**Buscar por termo em workflowdatastudio (PostgreSQL):**
```sql
SELECT wds.workflowdatastudioid, ws.name, wds.workflow
FROM public.workflowdatastudio wds
LEFT JOIN public.workflowstudio ws
  ON wds.workflowstudioid = ws.workflowstudioid
WHERE wds.workflow::text ILIKE '%sendEmail%'
ORDER BY ws.name
LIMIT 50;
```

**Buscar em múltiplas colunas JSON ao mesmo tempo:**
```sql
SELECT name, caption, type, precommand, poscommand
FROM public.actionsstudio
WHERE precommand::text  ILIKE '%sendEmail%'
   OR poscommand::text  ILIKE '%sendEmail%'
ORDER BY name
LIMIT 50;
```

**Buscar em formstudio e trazer apenas linhas com precommand preenchido:**
```sql
SELECT formstudioid, name, caption, type, precommand
FROM public.formstudio
WHERE precommand IS NOT NULL
  AND precommand::text ILIKE '%http%'
ORDER BY name
LIMIT 100;
```

**Buscar em liststudio por filtros que referenciam uma entidade:**
```sql
SELECT liststudioid, name, caption, filter, posfilter
FROM public.liststudio
WHERE filter::text    ILIKE '%ClienteId%'
   OR posfilter::text ILIKE '%ClienteId%'
ORDER BY name;
```

**Inspecionar todos os workflows de uma plataforma específica:**
```sql
SELECT wds.workflowdatastudioid,
       ws.name        AS workflow_name,
       ws.caption,
       ws.type,
       ws.platformid,
       wds.workflow
FROM public.workflowdatastudio wds
JOIN public.workflowstudio ws
  ON wds.workflowstudioid = ws.workflowstudioid
WHERE ws.platformid = 'sua-plataforma-aqui'
ORDER BY ws.name;
```

**Contar registros por tipo em actionsstudio:**
```sql
SELECT type, COUNT(*) AS total
FROM public.actionsstudio
GROUP BY type
ORDER BY total DESC;
```

**Listar actions que não possuem precommand configurado:**
```sql
SELECT actionstudioid, name, caption, type
FROM public.actionsstudio
WHERE precommand IS NULL
   OR precommand::text = 'null'
   OR precommand::text = '{}'
ORDER BY name;
```

**SQL Server — mesma busca adaptada (troque `public` por `dbo` e `ILIKE` por `LIKE`):**
```sql
SELECT wds.workflowdatastudioid, ws.name, wds.workflow
FROM dbo.workflowdatastudio wds
LEFT JOIN dbo.workflowstudio ws
  ON wds.workflowstudioid = ws.workflowstudioid
WHERE CAST(wds.workflow AS NVARCHAR(MAX)) LIKE '%sendEmail%'
ORDER BY ws.name
OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;
```

> **Dica:** os scripts do diretório `scripts/example.sql` contêm as queries acima prontas para copiar.

---

## Como rodar em ambiente de desenvolvimento

### Pré-requisitos

- [Node.js 18+](https://nodejs.org/) instalado
- PostgreSQL ou SQL Server acessível na rede

### Instalação (primeira vez)

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Executar

Abra **dois terminais**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Servidor rodando em http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Interface em http://localhost:3000
```

Acesse **http://localhost:3000** no navegador.

> O Vite já está configurado para redirecionar chamadas `/api` para o backend na porta 3001.

---

## Como compilar e gerar o executável

O build gera um arquivo `.exe` que **não requer Node.js instalado** na máquina do usuário.

### Pré-requisitos para o build

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Executar o build

Na raiz do projeto:
```bash
node build.js
```

O processo:
1. Compila o frontend React (`npm run build` no Vite)
2. Copia os arquivos estáticos para `backend/public/`
3. Compila o backend com `pkg` (empacota Node.js + código dentro do `.exe`)

### Resultado

```
dist-app/
├── InvestigationTools.exe   (~60 MB — backend + Node.js runtime)
└── public/                  (interface web compilada)
    ├── index.html
    └── assets/
```

### Distribuição

Copie a pasta `dist-app/` completa para a máquina do usuário e execute `InvestigationTools.exe`.

- O servidor inicia na porta **3001**
- O **navegador abre automaticamente** em `http://localhost:3001`
- Nenhuma instalação adicional necessária

> **Atenção:** os arquivos `InvestigationTools.exe` e a pasta `public/` precisam ficar **na mesma pasta** para a interface funcionar corretamente.

---

## Estrutura de código

```
Investigation Tools/
│
├── backend/                     # API Node.js / Express
│   ├── src/
│   │   ├── server.js            # Entrada do servidor; configura Express e rotas
│   │   ├── db/
│   │   │   ├── index.js         # Gerenciador de conexão (singleton)
│   │   │   ├── postgres.js      # Driver PostgreSQL (pg)
│   │   │   └── sqlserver.js     # Driver SQL Server (mssql/tedious)
│   │   ├── config/
│   │   │   └── tables.js        # Metadados das 4 tabelas padrão
│   │   │                        # (colunas, JSON cols, queries, ordenação)
│   │   └── routes/
│   │       ├── connection.js    # POST /api/connection/test, /disconnect, /status
│   │       ├── databases.js     # POST /api/databases/list (lista DBs do servidor)
│   │       ├── tables.js        # GET /api/tables, POST /search, POST /search-dynamic
│   │       └── query.js         # POST /api/query/execute (SQL livre)
│   └── package.json             # Dependências + configuração pkg para build
│
├── frontend/                    # Interface React / Vite
│   ├── src/
│   │   ├── App.jsx              # Layout principal (header + sidebar + conteúdo)
│   │   ├── App.css              # Tema dark + todos os estilos
│   │   ├── main.jsx             # Ponto de entrada React
│   │   ├── api/
│   │   │   └── index.js         # Funções fetch para todas as rotas da API
│   │   ├── context/
│   │   │   └── AppContext.jsx   # Estado global (conexão, tabelas, pesquisas, SQL)
│   │   ├── utils/
│   │   │   └── persistence.js   # Helpers para localStorage (conexões, pesquisas)
│   │   └── components/
│   │       ├── ConnectionForm.jsx   # Formulário de conexão + painel de conexões salvas
│   │       ├── Sidebar.jsx          # Barra lateral com lista de tabelas
│   │       ├── SearchPanel.jsx      # Painel de pesquisa + paginação
│   │       ├── ResultsTable.jsx     # Tabela de resultados com expansão de linha
│   │       ├── JsonSearch.jsx       # Investigação dentro de campos JSON
│   │       │                        # (pesquisa, filtros, navegação, realce)
│   │       ├── JsonViewer.jsx       # Árvore JSON colapsável com coloração
│   │       ├── SqlEditor.jsx        # Editor SQL com Ctrl+Enter
│   │       ├── SavedSearches.jsx    # Painel de pesquisas salvas (save/load/export)
│   │       └── TableManager.jsx     # Modal CRUD para tabelas personalizadas
│   └── package.json
│
├── config/
│   └── db.example.json          # Exemplo de configuração de conexão
│
├── scripts/
│   └── example.sql              # Queries SQL de exemplo para as 4 tabelas
│
├── build.js                     # Script de build → gera dist-app/
├── .gitignore
└── README.md
```

### Fluxo de dados

```
Usuário
  │
  ├─ [ConnectionForm] ──► POST /api/connection/test ──► db/index.js ──► postgres.js / sqlserver.js
  │
  ├─ [SearchPanel] ──────► POST /api/tables/search ──────────────► TABLE_CONFIG → query SQL paramétrica
  │                    └─► POST /api/tables/search-dynamic ──────► query SQL com identificadores sanitizados
  │
  ├─ [SqlEditor] ─────────► POST /api/query/execute ──────────────► query SQL direta
  │
  └─ [ConnectionForm] ──► POST /api/databases/list ──────────────► conexão temporária → lista de bancos
```

### Persistência local (localStorage)

| Chave | Conteúdo |
|---|---|
| `it_connections` | Configurações de conexão salvas (host, user, db...) |
| `it_custom_tables` | Tabelas personalizadas criadas pelo usuário |
| `it_saved_searches` | Pesquisas salvas (tabela + coluna + filtro + termo) |

---

## Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Backend | Node.js 18, Express 4, CORS |
| Banco de dados | `pg` (PostgreSQL), `mssql` / `tedious` (SQL Server) |
| Frontend | React 18, Vite 5 |
| Build | `pkg` 5 (empacota Node.js + app em .exe) |
| Persistência local | localStorage (browser) |

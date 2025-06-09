# Sistema de Monitoramento de Perdas de Água

**Acesse a aplicação online: [https://squad17-compesa.vercel.app/](https://squad17-compesa.vercel.app/)**

Este projeto é uma aplicação frontend desenvolvida com React.js e TypeScript, com o objetivo de fornecer uma interface visual para colaboradores da COMPESA analisarem perdas hídricas, consumo e volume de produção de água por município.

A ferramenta permite importação de arquivos CSV, visualização de gráficos e geração de relatórios.

## Tecnologias Utilizadas

- React.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- jsPDF
- PapaParse
- Vite

## Funcionalidades

- Upload de arquivos CSV com dados por município
- Visualização de gráficos com indicadores de desempenho
- Geração de relatórios em PDF e CSV
- Filtros interativos por município, valor e ordenação
- Evolução mensal dos dados por município ou total (COMPESA)
- Tela de login simulado e navegação entre Dashboard e Planilha

## Funcionalidades Futuras

- Autenticação com backend
- Armazenamento dos dados em banco
- Suporte a múltiplos usuários
- Integração com APIs externas
- Alertas automáticos com base nos dados

## Como Executar Localmente

1. Clone o repositório:

```bash
git clone [https://github.com/FSPNathaly/Squad17-Compesa.git](https://github.com/FSPNathaly/Squad17-Compesa.git)
cd Squad17-Compesa
```

2. Instale as dependências:

```bash
npm install
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

4. Acesse a aplicação no navegador:

```
http://localhost:5173
```

## Observações

- O login é simulado, qualquer usuário e senha funcionam.
- Os arquivos CSV devem conter as seguintes colunas:

```
Id, Municipios, VD, Perda, IPD, Volume Produzido, Volume Consumido
```

## Desenvolvido por

Squad 17 – Projeto COMPESA


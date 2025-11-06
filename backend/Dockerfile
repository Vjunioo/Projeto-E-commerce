# Estágio 1: Build da Aplicação
# Usamos uma imagem Node.js completa para instalar dependências e compilar o projeto
FROM node:18-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package*.json ./
RUN npm install

# Copia o resto do código da aplicação
COPY . .

# Compila o código TypeScript para JavaScript
RUN npm run build

# Estágio 2: Produção
# Usamos uma imagem menor para rodar a aplicação, tornando-a mais leve e segura
FROM node:18-alpine

WORKDIR /app

# Copia apenas os arquivos necessários do estágio de build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# O comando que será executado quando o container iniciar
CMD ["node", "dist/main"]
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc
EXPOSE 10000
ENV PORT=10000
CMD ["node", "dist/index.js"]

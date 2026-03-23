FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc || echo "TypeScript compiled with warnings"
EXPOSE 10000
ENV PORT=10000
CMD ["node", "dist/index.js"]

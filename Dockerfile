FROM node:20-alpine

# Устанавливаем необходимые системные пакеты
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем остальные файлы проекта
COPY . .

# Expose порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]

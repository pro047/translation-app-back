FROM node:18

RUN apt-get update && apt-get install -y \
    python3-pip python3-setuptools python3-wheel ffmpeg curl \
    python3-dev build-essential libffi-dev libxml2-dev libxslt-dev \
    chromium \
    libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 \
    libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 \
    libasound2 xdg-utils fonts-liberation \
    && apt-get clean && rm -rf /var/lib/apt/lists/*


WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=10000
EXPOSE 10000

CMD ["node", "index.js"]

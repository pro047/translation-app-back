FROM node:18

RUN mkdir -p /app/config
RUN apt-get update 
RUN   apt-get install -y python3-pip python3-setuptools python3-wheel ffmpeg curl \
    python3-dev build-essential libffi-dev libxml2-dev libxslt-dev
RUN    apt-get clean && rm -rf /var/lib/apt/lists/*
RUN    pip3 install --no-cache-dir --break-system-packages streamlink yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=10000
EXPOSE 10000

CMD ["node", "index.js"]

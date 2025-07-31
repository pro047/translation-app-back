FROM node:18

RUN apt-get update 
RUN   apt-get install -y python3-pip python3-setuptools python3-wheel ffmpeg \
    python3-dev build-essential libffi-dev libxml2-dev libxslt-dev
RUN    pip3 install --break-system-packages streamlink yt-dlp
RUN    apt-get clean

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=10000
EXPOSE 10000

CMD ["node", "index.js"]

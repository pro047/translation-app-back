FROM node:18

RUN apt-get update && \
    apt-get install -y python3-pip ffmpeg && \
    pip3 install streamlink && \
    apt-get clean

WORKDIR /app

COPY packgat*.json ./
RUN npm install

COPY . .

ENV PORT=10000
EXPOSE 10000

CMD [ "node", "index.js" ]
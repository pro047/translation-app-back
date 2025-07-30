FROM node:18

RUN apt-get update
RUN apt-get install -y python3-pip python3-setuptools python3-wheel ffmpeg
RUN  pip3 install --upgrade pip
RUN  pip3 install streamlink
RUN  apt-get clean

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=10000
EXPOSE 10000

CMD [ "node", "index.js" ]
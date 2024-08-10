FROM node


COPY . /app
COPY ./data /data

WORKDIR /app

RUN npm install

CMD ["node", "actors.js"]

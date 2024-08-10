FROM node


COPY . /app
COPY ./data /data

WORKDIR /app
RUN npm install -g @mermaid-js/mermaid-cli
RUN npm install

CMD ["node", "actors.js"]

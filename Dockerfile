# create a file named Dockerfile
FROM node:latest
RUN mkdir /usr/src/pol
WORKDIR /usr/src/pol
COPY package*.json ./
COPY dist ./dist
RUN npm install

CMD ["npm", "start"]
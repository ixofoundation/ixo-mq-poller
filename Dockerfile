# create a file named Dockerfile
FROM node:latest
RUN mkdir /usr/src/pol
WORKDIR /usr/src/pol
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
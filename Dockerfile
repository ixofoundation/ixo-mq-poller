FROM node:12

# Create app directory
RUN mkdir /usr/src/pol
WORKDIR /usr/src/pol

# Copy files
COPY package*.json ./
COPY dist ./dist

# Install app dependencies
RUN npm install

# Start
CMD [ "npm", "start" ]

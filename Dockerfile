FROM node:18-alpine

# Install MongoDB Dump
RUN apk add --update mongodb-tools

# Set Workdir
WORKDIR /app

# Create NodeJS
COPY package*.json /app/
RUN npm install

# Copy App Data
COPY . /app/

# Container Port
EXPOSE 8080

# Start Command
CMD ["npm", "start"]
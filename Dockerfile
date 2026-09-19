FROM node:22-slim

# The ping npm package shells out to the system ping binary, which the slim image lacks.
RUN apt-get update \
    && apt-get install -y --no-install-recommends iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

RUN mkdir /usr/src/app/database

# Install app dependencies from the lockfile, without dev dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Bundle app source
COPY . .

#EXPOSE 8080

CMD [ "node", "." ]

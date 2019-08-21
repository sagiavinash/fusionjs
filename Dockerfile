FROM uber/web-base-image:10.15.2

RUN mkdir /monorepo
WORKDIR /monorepo
COPY . /monorepo/

RUN yarn global add jazelle@0.0.0-canary.aa5bec0.0

# tweet-translate

Help me translate my tweets! I'm working on translating my
tweets to Español, but I've surely made some mistakes along the
way, so I made this to allow people (maybe you?) to help me figure
which of my translations are good/bad and why.

## Development

Install the dependencies

```
npm install
```

If you haven't already, you'll need to [install
MongoDB](https://docs.mongodb.com/v3.2/administration/install-community/).

Once you've installed it, start up a mongo server with `mongod` on port `27017`.

```
mongod --dbpath=<dbdatapath> --port 27017
```

Run it

```
npm start
```

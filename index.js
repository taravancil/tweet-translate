#!/usr/bin/env node

const OAuth = require('oauth').OAuth
const express = require('express')
const app = express()

const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN
const TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET

app.set('view engine', 'pug')
app.set('views', './views')

// set up oauth
const oauth = new OAuth(
  'https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  TWITTER_API_KEY,
  TWITTER_API_SECRET,
  '1.0A',
  null,
  'HMAC-SHA1'
)

app.get('/', (req, res) => {
  res.render('layout', {message: 'hi'})
})

const port = 3000

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

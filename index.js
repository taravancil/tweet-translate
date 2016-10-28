#!/usr/bin/env node

import cookieSession from 'cookie-session'
import express from 'express'
import {OAuth} from 'oauth'

const app = express()

const API_KEY = process.env.TWITTER_API_KEY
const API_SECRET = process.env.TWITTER_API_SECRET
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET

const oauth = new OAuth(
  'https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  API_KEY,
  API_SECRET,
  '1.0A,
  null,
  'HMAC-SHA1'
)

app.set('view engine', 'pug')
app.set('views', './views')

app.get('/', (req, res) => {
  res.render('layout', {message: 'hi'})
})

let maxTweetId

function fetchTweets () {
  const username = 'taravancil'

  let ids = []
}

const port = 3000

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

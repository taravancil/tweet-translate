#!/usr/bin/env node

import express from 'express'
import {OAuth} from 'oauth'

const app = express()

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

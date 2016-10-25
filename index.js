#!/usr/bin/env node

const oauth = require('oauth')
const express = require('express')
const app = express()

app.set('view engine', 'pug')
app.set('views', './views')

app.get('/', (req, res) => {
  res.render('layout', {message: 'hi'})
})

const port = 3000

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

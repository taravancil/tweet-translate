#!/usr/bin/env node

import cookieSession from 'cookie-session'
import crypto from 'crypto'
import express from 'express'
import {OAuth} from 'oauth'
import {addUser, getTweets} from './db'

const app = express()

const API_KEY = process.env.TWITTER_API_KEY
const API_SECRET = process.env.TWITTER_API_SECRET
const TWITTER_API = 'https://api.twitter.com'
const OAUTH_API = `${TWITTER_API}/oauth`

const oauth = new OAuth(
  `${OAUTH_API}/request_token`,
  `${OAUTH_API}/access_token`,
  API_KEY,
  API_SECRET,
  '1.0A',
  'http://localhost:3000/login-success',
  'HMAC-SHA1'
)

let oAuthTokenSecret

const cookieSigningKeys = [crypto.randomBytes(16), crypto.randomBytes(16)]
app.use(cookieSession({
  name: 'session',
  keys: cookieSigningKeys
}))

app.use(express.static('dist'))
app.set('view engine', 'pug')
app.set('views', './views')

app.get('/login-success', (req, res) => {
  const {oauth_token, oauth_verifier} = req.query

  oauth.getOAuthAccessToken(oauth_token, oAuthTokenSecret, oauth_verifier,
    (err, oAuthAccessToken, oAuthAccessTokenSecret) => {
      if (err) {
        console.error(err)
        res.redirect(302, '/')
      }

      // Login was successful, get the user's identity
      oauth.get(
        `${TWITTER_API}/1.1/account/verify_credentials.json`,
        oAuthAccessToken,
        oAuthAccessTokenSecret,
        (err, data) => {
          if (err) {
            console.error(err)
            res.redirect(302, '/')
          }

          const userData = JSON.parse(data)

          // Add the user to the database
          addUser(userData.screen_name)
            .then(() => {
              // Update the session
              req.session.user = {
                screenName: userData.screen_name,
                avatar: userData.profile_image_url_https,
                linkColor: userData.profile_link_color,
                textColor: userData.profile_text_color,
                headerBg: userData.profile_link_color,
                avatarBorder: userData.profile_sidebar_border_color
              }

              res.redirect(302, '/')
            })
            .catch(err => {
              console.error(err)
              res.status(500).send('Sorry, we messed up :(')
            })
        })
  })
})

app.get('/', (req, res) => {
  getTweets(5, 0)
    .then(tweets => {
      res.render('layout', {
        user: req.session.user,
        content: `<ul id='tweets'
  class='tweets'>${renderTweetsListItems(tweets)}</ul><button
  id='fetch-more-tweets' class='btn btn-action'>Get more
  tweets</button>`
      })
    })
    .catch(err => {
      console.error(err)
    })
})

app.get('/fetch-tweets', (req, res) => {
  getTweets(5, req.query.offset)
    .then(tweets => {
      res.send(renderTweetsListItems(tweets))
    })
    .catch(err => {
      console.error(err)
      res.send('')
    })
})

app.get('/login', (req, res) => {
  oauth.getOAuthRequestToken((err, oAuthToken, oAuthTokenSecret) => {
    oAuthTokenSecret = oAuthTokenSecret
    res.redirect(302, `${OAUTH_API}/authenticate?oauth_token=${oAuthToken}`)
  })
})

app.get('/logout', (req, res) => {
  req.session = null
  res.redirect(302, '/')
})

const port = 3000

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

function renderTweetsListItems (tweets) {
  let tweetsListItems

  const addTranslationBtn = '<button class="btn btn-link">Suggest Translation</button>'
  const addCommentBtn = '<button class="btn btn-link">Add Comment</button>'

  for (const tweet of tweets) {
    const link = `<a href=/${tweet.tweet_id} class='btn btn-link'>Comments</a>`
    tweetsListItems += `<li
    class='tweet'>${tweet.html}${addTranslationBtn}${addCommentBtn}${link}</li>`
  }

  return tweetsListItems
}

#!/usr/bin/env node

import bodyParser from 'body-parser'
import cookieSession from 'cookie-session'
import crypto from 'crypto'
import express from 'express'
import xss from 'xss'
import {OAuth} from 'oauth'
import {addUser, getTweets, addComment, getTweetByTweetID} from './db'

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
  keys: cookieSigningKeys,
  maxAge: 8.64e5
}))

app.use(express.static('dist'))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
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
            .then((id) => {
              // Update the session
              req.session.user = {
                id: id,
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

app.get('/tweet/:tweetID', (req, res) => {
  getTweetByTweetID(req.params.tweetID)
    .then(tweet => {
      const content = renderTweet(tweet)
      const scripts = ['../listeners.js']

      res.render('layout',
                 {user: req.session.user,
                  content: content,
                  scripts: scripts
                 })
    })
    .catch(err => res.status(404).send('Page Not Found'))
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

app.post('/add-comment', (req, res) => {
  // check that the user is logged in
  if (!req.session.user) {
    res.redirect(302, '/prompt-login')
  }

  const escaped = xss(req.body.comment)

  addComment(escaped, req.session.user.id, 'translation', 1)
    .then(() => res.redirect(302, '/'))
    // TODO redirect to parent permalink
    // .then(() => res.redirect(302, '/comments/${parent}')
    .catch(err => console.error(err))
})

app.get('/prompt-login', (req, res) => {
  res.render('login')
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

  for (const tweet of tweets) {
    const links = renderTweetActions(tweet)
    tweetsListItems += `<li id='tweet-${tweet.id}' class='tweet'>${tweet.html}` +
                       `${links}</li>`
  }

  return tweetsListItems
}

function renderTweetActions (tweet) {
  const addTranslationBtn = `<button name="add-comment" class="btn btn-link"` +
                            `data-id='${tweet.id}' data-type='translation'>` +
                            `Suggest Translation</button>`
  const addCommentBtn = `<button name="add-comment" class="btn btn-link"` +
                        `data-id='${tweet.id}' data-type='comment'>` +
                        `Add Comment</button>`
  const link = `<a href=/${tweet.tweet_id} class='btn btn-link'>Comments</a>`

  return `<div id='tweet-links-${tweet.id} class='tweet-links'>` +
         `${addTranslationBtn}${addCommentBtn}${link}</div>`
}

function renderTweet (tweet) {
  const links = renderTweetActions(tweet)
  return `<div class='tweet'>${tweet.html}</div>`
}

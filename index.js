#!/usr/bin/env node

import bodyParser from 'body-parser'
import cookieSession from 'cookie-session'
import crypto from 'crypto'
import express from 'express'
import xss from 'xss'
import {OAuth} from 'oauth'
import {
  addUser,
  getTweets,
  addTranslation,
  removeTranslation,
  getRecentTranslations,
  getTranslations,
  getTweetByTweetID,
  getScreenNameByID,
  getTranslationAuthorID,
  addVote,
  getVoteCount
} from './db'
import {renderTranslation} from './components/translation'

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

app.get('/', async (req, res) => {
  try {
    const tweets = await getTweets(5, 0)
    const tweetListItems = await renderTweetsListItems(tweets, req.session.user)

    const content = `<ul id='tweets' class='tweets'>${tweetListItems}</ul>` +
          `<button id='fetch-more-tweets' class='btn btn-action'>` +
          `Get more tweets</button>`

    res.render('layout', {
      user: req.session.user,
      content: content,
      scripts: ['client/home.js', 'client/tweet.js']
    })
  } catch (err) {
    res.status(500).send('Internal Server Error')
  }
})

app.get('/translations', async (req, res) => {
  try {
    const {user} = req.session.user
    const translations = await getRecentTranslations()
    const translationEls = await renderTranslations(translations, user)
    const content = `<h2>Recent Translations</h2><ul id='translations' class='translations'>${translationEls}</ul>`

    res.render('layout', {user: user, content: content})
  } catch (err) {
    res.status(500).send('Internal Server Error'))
  }
})

app.get('/tweet/:tweetID', async (req, res) => {
  try {
    // check that the tweet exists
    const tweet = await getTweetByTweetID(req.params.tweetID)
    if (!tweet) {
      res.status(404).send('Page Not Found')
      return
    }

    const {user} = req.session
    const translations = await getTranslations(tweet.tweet_id)
    const translationsCount = translations.length || 0

    let content = await renderTweet(tweet, user, translationsCount)

    if (translationsCount < 1) {
      content += '<ul class="translations"><p>No translations</p></ul>'
    } else {
      const translationEls = await renderTranslations(translations, user)
      content += `<h3>Translations</h3><ul class='translations'>${translationEls}</ul>`
    }

    res.render('layout', {
      user: user,
      content: content,
      scripts: ['../client/tweet.js', '../client/translations.js']
    })
  } catch (err) {
    res.status(500).send('Internal Server Error')
  }
})

app.get('/fetch-tweets', (req, res) => {
  getTweets(5, req.query.offset)
    .then(tweets => {
      res.send(renderTweetsListItems(tweets, req.session.user))
    })
    .catch(err => {
      console.error(err)
      res.status(500).send('Internal Server Error')
    })
})

app.post('/add-translation', (req, res) => {
  // check that the user is logged in
  if (!req.session.user) {
    res.redirect(302, '/prompt-login')
  }

  const escaped = xss(req.body.translation)

  const {id, screenName} = req.session.user

  addTranslation(escaped, id, screenName, req.body.type, req.body.parent)
    .then(() => res.redirect(302, '/'))
    .catch(err => console.error(err))
})

app.post('/remove-translation', (req, res) => {
  if (!req.session.user) {
    res.status(401).send('Unathorized')
  }

  getTranslationAuthorID(req.body.id)
    .then(authorID => {
      if (authorID === req.session.user.id) {
        removeTranslation(req.body.id)
          .then(() => res.redirect('/'))
          .catch(err => res.status(500, 'Internal Server Error'))
      } else {
        res.status(401).send('Unauthorized')
      }
    })
    .catch(err => res.status(500, 'Internal Server Error'))
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

app.post('/vote', (req, res) => {
  if (!req.session.user) {
    res.status(401).send('Unauthorized')
    return
  }

  const {id, delta} = req.body

  // Only allow vote count delta to have a magnitude of 1
  if (Math.abs(delta) !== 1) {
    res.status(400).send('Invalid Request')
    return
  }

  addVote(id, req.session.user.id, delta)
    .then(() => {})
    .catch(err => console.error(err))
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
  let tweetsListItems = ''

  for (const tweet of tweets) {
    const links = renderTweetActions(tweet)
    tweetsListItems += `<li id='tweet-${tweet.id}' class='tweet'>${tweet.html}` +
                       `${links}</li>`
  }

  return tweetsListItems
}

function renderTweetActions (tweet) {
  const addTranslationBtn = `<button name="add-translation" class="btn btn--link"` +
                            `data-id='${tweet.id}'
  data-parent='${tweet.tweet_id}' data-type='translation'>` +
                            `Add Translation</button>`
  const link = `<a href=/tweet/${tweet.tweet_id} class='btn
  btn--link'>Translations</a>`

  return `<div id='tweet-links-${tweet.id}' class='tweet-links'>` +
         `${addTranslationBtn}${link}</div>`
}

function renderTweet (tweet) {
  const links = renderTweetActions(tweet)
  return `<div id='tweet-${tweet.id}' class='tweet'>${tweet.html}${links}</div>`
}

function renderTranslations (translations, user) {
  let translationsList = ''

  for (const t of translations) {
    translationsList += renderTranslation(t, user)
  }

  return `<ul class='translations'>${translationsList}</ul>`
}

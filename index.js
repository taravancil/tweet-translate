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
  getTranslationsByUserID,
  getTranslationCount,
  getUserIDByScreenName,
  addVote,
  getVoteCount
} from './db'
import {renderTranslation} from './components/translation'
import {renderTweet} from './components/tweet'

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
    const tweetEls = await renderTweets(tweets, req.session.user, true)

    const content = `<div id='tweets' class='tweets'>${tweetEls}</div>` +
                    `<button id='fetch-more-tweets' class='btn btn-action'>` +
                    `Get more tweets</button>`

    res.render('layout', {
      user: req.session.user,
      content: content,
      scripts: ['home.js', 'tweet.js']
    })
  } catch (err) {
    res.status(500).send('Internal Server Error')
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

    let content = renderTweet(tweet, user, translationsCount, false)

    if (translationsCount < 1) {
      content += '<ul class="translations"><p>No translations</p></ul>'
    } else {
      let translationEls = ''

      for (const t of translations) {
        const voteCounts = await getVoteCount(t.id)
        translationEls += renderTranslation(t, voteCounts, user)
      }

      content += `<h3>Translations</h3><ul class='translations'>${translationEls}</ul>`
    }

    res.render('layout', {
      user: user,
      content: content,
      scripts: ['../tweet.js', '../translations.js']
    })
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal Server Error')
  }
})

app.get('/user/:screenName', async (req, res) => {
  // check that the user exists
  const screenName = req.params.screenName
  const uid = await getUserIDByScreenName(screenName)
  if (uid === undefined) res.status(404).send('Page Not Found')

  let content = `<h2>${screenName}'s Translations</h2>`

  try {
    const translations = await getTranslationsByUserID(uid)
    if (!translations.length) {
      content += '<p>No translations</p>'
    } else {
      let translationEls = ''
      for (const t of translations) {
        const voteCount = await getVoteCount(t.id)
        translationEls += renderTranslation(t, voteCount, req.session.user)
      }
      content += `<ul class='translations'>${translationEls}</ul>`
    }

    res.render('layout', {content: content, user: req.session.user})
  } catch (err) {
    res.status(500).send('Internal Server Error')
  }
})

app.get('/fetch-tweets', async (req, res) => {
  try {
    const tweets = await getTweets(5, req.query.offset)
    res.send(await renderTweets(tweets, req.session.user, true))
  } catch (err) {
    res.status(500).send('Internal ServerE')
  }
})

app.post('/add-translation', (req, res) => {
  // check that the user is logged in
  if (!req.session.user) {
    res.redirect(302, '/prompt-login')
  }

  if (!req.body.translation) {
    res.status(400).send('Bad Request')
    return
  }

  const escapedTranslation = xss(req.body.translation)
  const escapedComment = xss(req.body.comment)
  const {id, screenName} = req.session.user

  try {
    addTranslation(id, screenName, escapedTranslation, escapedComment, req.body.parent)
  } catch (err) {
    res.status(500).send('Internal Server Error')
  }
})

app.post('/remove-translation', async (req, res) => {
  if (!req.session.user) {
    res.status(401).send('Unauthorized')
    return
  }

  try {
    const authorID = await getTranslationAuthorID(req.body.id)

    // check that the user is authorized to delete this translation
    if (authorID !== req.session.user.id) {
      res.status(401).send('Unauthorized')
      return
    }

    removeTranslation(req.body.id)
    res.redirect(302, `/tweet/${req.body.parent}`)
  } catch (err) {
    res.status(500).send('Internal Server Error')
  }
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
})

app.get('/logout', (req, res) => {
  req.session = null
  res.redirect(302, '/')
})

const port = 3000

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

async function renderTweets (tweets, user, showLink) {
  let els = ''

  for (const tweet of tweets) {
    const translationCount = await getTranslationCount(tweet.tweet_id)
    els += renderTweet(tweet, user, translationCount, showLink)
  }
  return els
}

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
const OAUTH_CALLBACK_URL = process.env.NODE_ENV === 'production' ?
      'https://tweets.taravancil.com/login-success' :
      'http://localhost:3000/login-success'

const oauth = new OAuth(
  `${OAUTH_API}/request_token`,
  `${OAUTH_API}/access_token`,
  API_KEY,
  API_SECRET,
  '1.0A',
  OAUTH_CALLBACK_URL,
  'HMAC-SHA1'
)

let oAuthTokenSecret

const cookieSigningKeys = [crypto.randomBytes(16), crypto.randomBytes(16)]
app.use(cookieSession({
  name: 'session',
  keys: cookieSigningKeys,
  maxAge: 8.64e5
}))

const INITIAL_TWEETS = [
  { _id: '582907c3680c4cda0612ff66',
    tweetId: '791094504019210240',
    html: '<blockquote class="twitter-tweet" data-cards="hidden" data-width="400"><p lang="en" dir="ltr">I made a little tool for collecting the tweet IDs of all tweets (or a subset of tweets) for a given Twitter user <a href="https://t.co/3u3txkd9YW">https://t.co/3u3txkd9YW</a></p>&mdash; Tara Vancil (@taravancil) <a href="https://twitter.com/taravancil/status/791094504019210240">October 26, 2016</a></blockquote>\n' },
  { _id: '582907c3680c4cda0612ff67',
    tweetId: '789108553315344384',
    html: '<blockquote class="twitter-tweet" data-cards="hidden" data-width="400"><p lang="en" dir="ltr">This is the cherry on top of an already fantastic piece of software. <a href="https://t.co/gf3d3ucIcc">https://t.co/gf3d3ucIcc</a></p>&mdash; Tara Vancil (@taravancil) <a href="https://twitter.com/taravancil/status/789108553315344384">October 20, 2016</a></blockquote>\n' },
  { _id: '582907c3680c4cda0612ff68',
    tweetId: '788429920821137408',
    html: '<blockquote class="twitter-tweet" data-cards="hidden" data-width="400"><p lang="en" dir="ltr">Practical Performance by <a href="https://twitter.com/samccone">@samccone</a> and <a href="https://twitter.com/paul_irish">@paul_irish</a> <a href="https://t.co/XiqGwDHfzH">https://t.co/XiqGwDHfzH</a></p>&mdash; Tara Vancil (@taravancil) <a href="https://twitter.com/taravancil/status/788429920821137408">October 18, 2016</a></blockquote>\n' },
  { _id: '582907c3680c4cda0612ff69',
    tweetId: '788420696074575873',
    html: '<blockquote class="twitter-tweet" data-cards="hidden" data-width="400"><p lang="en" dir="ltr">Slowly, but surely being at the <a href="https://twitter.com/recursecenter">@recursecenter</a> is conditioning me to not be embarrassed to ask for help.</p>&mdash; Tara Vancil (@taravancil) <a href="https://twitter.com/taravancil/status/788420696074575873">October 18, 2016</a></blockquote>\n' },
  { _id: '582907c3680c4cda0612ff6a',
    tweetId: '787797966966906880',
    html: '<blockquote class="twitter-tweet" data-cards="hidden" data-width="400"><p lang="en" dir="ltr">I&#39;m exploring what&#39;s next for me after RC. I&#39;m interested in Node, JS, cloud, crypto. Plz share opportunities you think may be a good fit!</p>&mdash; Tara Vancil (@taravancil) <a href="https://twitter.com/taravancil/status/787797966966906880">October 16, 2016</a></blockquote>\n' }]

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
              res.status(500).send('Internal Server Error')
            })
        })
  })
})

app.get('/', async (req, res) => {
  try {
    const tweetEls = await renderTweets(INITIAL_TWEETS, req.session.user, true)

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
    const translations = await getTranslations(tweet.tweetId)
    const translationsCount = translations.length || 0

    let content = renderTweet(tweet, user, false)

    if (translationsCount < 1) {
      content += '<ul class="translations"><p>No translations</p></ul>'
    } else {
      let translationEls = ''

      for (const t of translations) {
        const voteCounts = await getVoteCount(t._id)
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
        const voteCount = await getVoteCount(t._id)
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
    const tweets = await getTweets(5, Number(req.query.offset))
    res.send(await renderTweets(tweets, req.session.user, true))
  } catch (err) {
    res.status(500).send('Internal ServerE')
  }
})

app.post('/add-translation', async (req, res) => {
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
    await addTranslation(id, screenName, escapedTranslation, escapedComment, req.body.parent)

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

  addVote(id, req.session.user.id, Number(delta))
  res.status(200).send()
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
    els += renderTweet(tweet, user, showLink)
  }
  return els
}

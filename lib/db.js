const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId

const user = process.env.TWEET_TRANSLATE_DB_USER
const pw = process.env.TWEET_TRANSLATE_PASSWORD
const url = process.env.NODE_ENV === 'production'
      ? `mongodb://${user}:${pw}@ds151937-a0.mlab.com:51937,ds151937-a1.mlab.com:51937/tweet_translate?replicaSet=rs-ds151937`
      : 'mongodb://localhost:27017/tweet_translate'

export function getTweets (n, offset) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const collection = db.collection('tweets')

      collection.find({})
        .sort({tweetId: -1})
        .skip(offset)
        .limit(n)
        .toArray((err, tweets) => {
          if (err) resolve(err)

          resolve(tweets)
      })
    })
  })
}

export function addUser (screenName) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const collection = db.collection('users')

      getUserIDByScreenName(screenName)
        .then((id) => {
          if (id !== null) {
            resolve(id)
          } else {
            const isAdmin = screenName === 'taravancil'

            collection.insertOne({
              screenName: screenName,
              isAdmin: isAdmin
            }, (err, res) => {
              if (err) reject(err)

              db.close()
              resolve(res.insertedId)
            })
          }
        })
        .catch(err => reject(err))
    })
  })
}

export function removeUser (id) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const collection = db.collection('users')

      collection.deleteOne({_id: ObjectId(id)})
      db.close()
      resolve()
    })
  })
}

export function addTranslation (uid, screenName, translation, comment, parent) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const collection = db.collection('translations')

      collection.insertOne({
        uid: uid,
        screenName: screenName,
        timestamp: Date.now(),
        translation: translation,
        comment: comment,
        parent: parent
      })

      db.close()
      resolve()
    })
  })
}

export function removeTranslation (id) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const tweets = db.collection('tweets')

      tweets.update({}, {$pull: {translations: {_id: ObjectId(id)}}})
      db.close()
      resolve()
    })
  })
}

export function getTranslations (parent) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const tweets = db.collection('tweets')

      tweets.find({tweetId: parent}, (err, tweet) => {
        if (err) reject(err)
        console.log(tweet.translations)
        resolve(tweet.translations)
      })
    })
  })
}

export function getTranslationsByUserID (uid) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const collection = db.collection('translations')

      collection.find({uid: uid}).toArray((err, translations) => {
        if (err) resolve(err)
        db.close()
        resolve(translations)
      })
    })
  })
}

export function getTranslationAuthorID (id) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const tweets = db.collection('tweets')

      tweets.findOne({'translations._id': ObjectId(id)}, (err, tweet) => {
        if (err) resolve(err)
        db.close()
        resolve(tweet.translations[0].uid)
      })
    })
  })
}

export function getTranslationCount (tweetID) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const collection = db.collection('translations')

      collection.find({parent: tweetID}).count((err, count) => {
        if (err) reject(err)

        db.close()
        resolve(count)
      })
    })
  })
}

export function getTweetByTweetID (tweetID) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const collection = db.collection('tweets')

      collection.findOne({tweetId: tweetID}, (err, tweet) => {
        if (err) reject(err)

        db.close()
        resolve(tweet)
      })
    })
  })
}

export function getUserIDByScreenName (screenName) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const collection = db.collection('users')

      collection.findOne({screenName: screenName}, (err, user) => {
        if (err) reject(err)

        db.close()
        user === null ? resolve(undefined) : resolve(user._id)
      })
    })
  })
}

export function getScreenNameByID (id) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const collection = db.collection('users')

      collection.findOne({_id: ObjectId(id)}, (err, user) => {
        if (err) reject(err)

        db.close()
        user === null ? resolve(undefined) : resolve(user.screenName)
      })
    })
  })
}

export function addVote (translationId, uid, delta) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) reject(err)

      const tweets = db.collection('tweets')

      tweets.update(
        {},
        {translations: {_id: ObjectId(translationId)}},
        {$addToSet: {votes: {uid: uid, delta: delta}}}
      )
      db.close()
      resolve()
    })
  })
}

export function setup () {
  const f = require('fs').readFileSync('tweetsHtml.json')
  const tweets = JSON.parse(f).tweets

  MongoClient.connect(url, (err, db) => {
    const tweetsCollection = db.collection('tweets')
    const usersCollection = db.collection('users')

    // set unique index on user screenName
    usersCollection.createIndex({'screenName': 1}, {unique: true})

    if (err) {
      console.error(err)
      return
    }

    for (const tweet of tweets) {
      tweetsCollection.insertOne({
        tweetId: tweet.id,
        html: tweet.html,
        translations: []
      })
    }

    db.close()
  })
}

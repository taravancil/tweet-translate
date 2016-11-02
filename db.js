import sqlite3 from 'sqlite3'

const db = new sqlite3.Database('tweetTranslate.db')

export function getTweets (n, offset) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM tweets LIMIT ${n} OFFSET ${offset}`, (err, rows) => {
      if (err) {
        reject(err)
      }
      resolve(rows)
    })
  })
}

export function addUser (screenName) {
  return new Promise((resolve, reject) => {
    getUserIDByScreenName(screenName)
      .then((id) => {
        if (id !== null) resolve(id)

        const isAdmin = screenName === 'taravancil'

        db.run('INSERT INTO users VALUES (NULL, ?, ?)', [screenName, isAdmin], (err) => {
          if (err) {
            reject(err)
          }
        })
      })
      .catch(err => reject(err))
  })
}

export function removeUser (id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM users where id = ?', id, (err) => {
      if (err) reject(err)
      resolve()
    })
  })
}

export function addTranslation (translation, uid, screenName, type, parent, comment) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO translations VALUES (NULL, ?, ?, ?, ?, ?, ?)',
      [uid, screenName, Date.now(), translation, parent, comment],
      (err) => {
        if (err) {
          reject(err)
        }
        resolve()
      }
    )
  })
}

export function removeTranslation (id) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM translations where id = ?', id, (err) => {
        if (err) reject(err)
        resolve()
      }
    )
  })
}

export function getTranslations (id) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM translations where parent = ? ORDER BY timestamp DESC', id, (err, rows) => {
      if (err) reject(err)
      resolve(rows)
    })
  })
}

export function getRecentTranslations () {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM translations ORDER BY timestamp DESC LIMIT 10',
           (err, rows) => {
             if (err) reject(err)
             resolve(rows)
           })
  })
}

export function getTranslationAuthorID (id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT uid FROM translations where id = ?', id, (err, row) => {
      if (err) reject(err)
      resolve(row.uid)
    })
  })
}

export function getTranslationCount (id) {
  return new Promise((resolve, reject) => {
    db.all('SELECT FROM translations where id = ?', id, (err, rows) => {
      if (err) reject(err)
      resolve(rows.length)
    })
  })
}

export function addVote (translationID, uid, delta) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO votes VALUES (?, ?, ?)', [translationID, uid, delta],
           (err) => {
             if (err) reject(err)
             resolve()
           })
  })
}

export function getVoteCount (id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT SUM(delta) FROM votes WHERE translation_id = ?', id, (err, row) => {
      if (err) reject(err)

      const sum = row['SUM(delta)']
      sum === null ? resolve(0) : resolve(sum)
    })
  })
}

export function getTweetByTweetID (tweetID) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM tweets WHERE tweet_id = ?', tweetID, (err, row) => {
      if (err) reject(err)
      resolve(row)
    })
  })
}

export function getScreenNameByID (id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT screen_name FROM users WHERE id = ?`, id, (err, row) => {
      if (err) reject(err)
      row === undefined ? resolve(null) : resolve(row.screen_name)
    })
  })
}

export function getUserIDByScreenName (screenName) {
  return new Promise ((resolve, reject) => {
    db.get(`SELECT id FROM users WHERE screen_name = ?`, screenName, (err, row) => {
      if (err) reject(err)
      row === undefined ? resolve(null) : resolve(row.id)
    })
  })
}

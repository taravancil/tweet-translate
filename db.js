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

export function addComment (text, uid, type, parent) {
  const isTranslation = type === 'translation'

  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO comments VALUES (NULL, ?, NULL, ?, ?, ?, NULL)',
      [uid, text, parent, isTranslation],
      (err) => {
        if (err) {
          reject(err)
        }
        resolve()
      }
    )
  })
}

function getUserIDByScreenName (screenName) {
  return new Promise ((resolve, reject) => {
    db.get(`SELECT * FROM users WHERE screen_name = ?`, screenName, (err, row) => {
      if (err) reject(err)

      row === undefined ? resolve(null) : resolve(row.id)
    })
  })
}

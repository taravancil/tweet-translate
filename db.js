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
    const isAdmin = screenName === 'taravancil'

    db.run('INSERT INTO users VALUES (NULL, ?, ?)', [screenName, isAdmin], (err) => {
      if(err) {
        reject(err)
      }
      resolve()
    })
  })
}

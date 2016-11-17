function renderTweetActions (tweet, user, showLink) {
  let translationsCount = ''
  if (tweet.translations.length) {
    translationsCount = ` (${tweet.translations.length})`
  }

  let addTranslationBtn = ''
  if (user) {
    addTranslationBtn = `<button name="add-translation" class="btn btn--link"` +
                        `data-id='${tweet._id}' data-parent='${tweet.tweetId}'` +
                        `data-type='translation'>Add Translation</button>`
  }

  const link = showLink ? `<a href=/tweet/${tweet.tweetId} class='btn btn--link'>Translations${translationsCount}</a>` : ''

  return `<div id='tweet-links-${tweet._id}' class='tweet-links'>` +
         `${addTranslationBtn}${link}</div>`
}

export function renderTweet (tweet, user, showLink) {
  const links = renderTweetActions(tweet, user, showLink)
  return `<div id='tweet-${tweet._id}' class='tweet'>${tweet.html}${links}</div>`
}

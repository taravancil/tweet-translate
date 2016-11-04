function renderTweetActions (tweet, user, translationCount, showLink) {
  let addTranslationBtn = ''
  if (user) {
    addTranslationBtn = `<button name="add-translation" class="btn btn--link"` +
                        `data-id='${tweet.id}' data-parent='${tweet.tweet_id}'` +
                        `data-type='translation'>Add Translation</button>`
  }

  const link = showLink ? `<a href=/tweet/${tweet.tweet_id} class='btn btn--link'>Translations (${translationCount})</a>` : ''

  return `<div id='tweet-links-${tweet.id}' class='tweet-links'>` +
         `${addTranslationBtn}${link}</div>`
}

export function renderTweet (tweet, user, translationCount, showLink) {
  const links = renderTweetActions(tweet, user, translationCount, showLink)
  return `<div id='tweet-${tweet.id}' class='tweet'>${tweet.html}${links}</div>`
}

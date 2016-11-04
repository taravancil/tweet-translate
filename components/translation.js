export function renderTranslation (t, voteCount, user) {
  const authorLink = `<a href='/user/${t.author_screen_name}'>` +
                     `${t.author_screen_name}</a>`

  const date = new Date(t.timestamp).toLocaleString()

  let deleteForm = ''

  if (user && (t.uid === user.id || user.screenName === 'taravancil')) {
    deleteForm = `<form action='/remove-translation' method='POST'><input` +
                 ` type='hidden' name='id' value='${t.id}' /><input` +
                 ` type='hidden' name='parent' value='${t.parent}' /><button` +
                 ` type='submit' class='btn btn--link'>Delete</button></form>`
  }

  let votingDisabled = ''
  if (!user) votingDisabled = 'disabled'

  const upvoteBtn = `<button id='upvote-${t.id}' class='vote-btn' ` +
                    `data-delta='1' data-id='${t.id}' ${votingDisabled}>` +
                    `<i class='arrow arrow--up' aria-hidden='true'></i>` +
                    `</button>`

  const downvoteBtn = `<button id='downvote-${t.id}' class='vote-btn'` +
                      `data-delta='-1' data-id='${t.id}' ${votingDisabled}>` +
                      `<i class='arrow arrow--down' aria-hidden='true'></i>` +
                      `</button>`

  const votingForm = `<div class='vote'>${upvoteBtn}<span ` +
                     `id='votes-count-${t.id}' class='votes count'>` +
                     `${voteCount}</span>${downvoteBtn}</div>`

  return `<div class='translation'><div class='translation__meta'>` +
         `${authorLink} ${date}${deleteForm}</div>${t.comment}<div ` +
         `class='translation__text'>${t.translation}<div class='votes'>` +
         `${votingForm}</div></div></div>`
}

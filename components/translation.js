export function renderTranslation (t, user) {
  const authorLink = `<a href='/user/${t.author_screen_name}'>${t.author_screen_name}</a>`
  const date = new Date(t.timestamp).toLocaleString()

  let deleteForm = ''

  if (user && (t.uid === user.id || user.screenName === 'taravancil')) {
    deleteForm = `<form action='/remove-translation' method='POST'><input` +
                 ` type='hidden' name='id' value='${t.id}' /><button` +
                 ` type='submit' class='btn btn--link'>Delete</button></form>`
  }

  return `<li class='translation'><div class='translation__meta'>` +
         `${authorLink} ${date}${deleteForm}</div><div ` +
         `class='translation__text'>${t.translation}</div></li>`
}

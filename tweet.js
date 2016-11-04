import {renderTranslation} from './components/translation'

document.addEventListener('DOMContentLoaded', () => {
  const addTranslationBtns = document.getElementsByName('add-translation')

  // These are only used to optimistically render components.
  // They're never sent in requests to the server.
  const uid = document.getElementById('uid').value
  const screenName = document.getElementById('screenName').value

  addTranslationBtns.forEach(btn => {
    btn.onclick = (e) => {
      const {id, parent} = e.target.dataset
      showTranslateForm(id, parent)

      const translationsContainer = document.querySelector('.translations')
      const translateForm = document.getElementById(`add-translation-${parent}`)

      translateForm.onsubmit = (e) => {
        const translation = {
          uid: uid,
          timestamp: Date.now(),
          id: 'placeholder', // TODO most recent translation ID + 1
          translation: translateForm.translation.value,
          comment: translateForm.comment.value,
          author_screen_name: screenName
        }
        const user = {screenName: screenName, id: uid}

        // hide the form and show the links
        hideTranslateForm(id, parent)

        // remove the 'no comments' element if it exists
        if (translationsContainer.getElementsByTagName('p').length) {
          translationsContainer.innerHTML = ''
        }

        // optimistically render the new translation
        translationsContainer.innerHTML += renderTranslation(translation, 0, user)
      }
    }
  })
})

const translateForm = (parentID) => {
  const parent = `<input type='hidden' name='parent' value=${parentID} />`

  const translation = `<label for='translation'>Your translation</label>` +
                      `<textarea name='translation' required></textarea>`

  const comment = `<label for='comment'>Explain your translation ` +
                  `(optional)</label><textarea name='comment'></textarea>`

  const submit = `<button type='submit' class='btn btn-action'>Submit</button>`

  return `<form id='add-translation-${parentID}' action='/add-translation'` +
         `method='POST'>${translation}${comment}${submit}${parent}</form>`
}

function showTranslateForm (id, parentID) {
  const links = document.getElementById(`tweet-links-${id}`)
  const tweet = document.getElementById(`tweet-${id}`)

  links.classList.add('hidden')
  tweet.innerHTML += translateForm(parentID)
}

function hideTranslateForm (id, parentID) {
  const links = document.getElementById(`tweet-links-${id}`)
  const form = document.getElementById(`add-translation-${parentID}`)

  form.classList.add('hidden')
  links.classList.remove('hidden')
}

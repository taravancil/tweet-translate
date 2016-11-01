document.addEventListener('DOMContentLoaded', () => {
  const tweetsList = document.getElementById('tweets')
  const fetchMoreTweets = document.getElementById('fetch-more-tweets')
  const addTranslationBtns = document.getElementsByName('add-translation')
  const fetchingFeedback = document.createElement('p')
  fetchingFeedback.innerText = 'Fetching more tweets...'

  addTranslationBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault()
      showTranslateForm(e.target.dataset.id,
                        e.target.dataset.parent,
                        e.target.dataset.type)
    }
  })

  fetchMoreTweets.onclick = (e) => {
    e.preventDefault()

    tweetsList.appendChild(fetchingFeedback)
    const req = new XMLHttpRequest()

    req.onload = () => {
      tweetsList.removeChild(fetchingFeedback)
      tweetsList.innerHTML += req.response
    }

    req.open('GET', `/fetch-tweets?offset=${tweetsList.children.length}`)
    req.send()
  }
})

const translateForm = (parentID) => {
  const parent = `<input type='hidden' name='parent' value=${parentID} />`
  const input = `<textarea name='translation'></textarea>`
  const btn = `<button type='submit' class='btn btn-action'>Submit</button>`

  return `<form action='/add-translation' method='POST'>${input}${btn}${parent}</form>`
}

function showTranslateForm (id, parentID, type) {
  const links = document.getElementById(`tweet-links-${id}`)
  const tweet = document.getElementById(`tweet-${id}`)

  links.classList.add('hidden')
  tweet.innerHTML += translateForm(parentID)
}

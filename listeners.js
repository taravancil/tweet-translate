document.addEventListener('DOMContentLoaded', () => {
  const tweetsList = document.getElementById('tweets')
  const fetchMoreTweets = document.getElementById('fetch-more-tweets')
  const addCommentBtns = document.getElementsByName('add-comment')
  const fetchingFeedback = document.createElement('p')
  fetchingFeedback.innerText = 'Fetching more tweets...'

  addCommentBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault()
      showCommentBox(e.target.dataset.id, e.target.dataset.type)
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

const commentForm = (id, type, defaultValue = '') => {
  const hidden = `<input type='hidden' name='parent' value=${id} />`
  const input = `<textarea name='comment' data-type=${type}>${defaultValue}</textarea>`
  const btn = `<button type='submit' class='btn btn-action'>Submit</button>`

  return `<form action='/add-comment' method='POST'>${input}${btn}${hidden}</form>`
}

function showCommentBox (id, type) {
  const links = document.getElementById(`tweet-links-${id}`)
  const tweet = document.getElementById(`tweet-${id}`)

  links.classList.add('hidden')
  tweet.innerHTML += commentForm(id, type, '')
}

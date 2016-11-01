document.addEventListener('DOMContentLoaded', () => {
  const tweetsList = document.getElementById('tweets')
  const fetchMoreTweets = document.getElementById('fetch-more-tweets')
  const addCommentBtns = document.getElementsByName('add-comment')
  const fetchingFeedback = document.createElement('p')
  fetchingFeedback.innerText = 'Fetching more tweets...'

  addCommentBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault()
      showCommentBox(e.target.dataset.id,
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

const commentForm = (parentID, type, defaultValue = '') => {
  const parent = `<input type='hidden' name='parent' value=${parentID} />`
  const commentType = `<input type='hidden' name='type' value=${type} />`
  const input = `<textarea name='comment'>${defaultValue}</textarea>`
  const btn = `<button type='submit' class='btn btn-action'>Submit</button>`

  return `<form action='/add-comment' method='POST'>${input}${btn}${parent}${commentType}</form>`
}

function showCommentBox (id, parent, type) {
  const links = document.getElementById(`tweet-links-${id}`)
  const tweet = document.getElementById(`tweet-${id}`)

  links.classList.add('hidden')
  tweet.innerHTML += commentForm(parent, type, '')
}

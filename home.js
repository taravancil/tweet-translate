document.addEventListener('DOMContentLoaded', () => {
  const tweetsList = document.getElementById('tweets')
  const fetchMoreTweets = document.getElementById('fetch-more-tweets')
  const fetchingFeedback = document.createElement('p')
  fetchingFeedback.innerText = 'Fetching more tweets...'

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

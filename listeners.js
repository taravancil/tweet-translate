document.addEventListener('DOMContentLoaded', () => {
  const tweetsList = document.getElementById('tweets')
  const fetchMoreTweets = document.getElementById('fetch-more-tweets')

  fetchMoreTweets.onclick = (e) => {
    e.preventDefault()

    const req = new XMLHttpRequest()

    req.onload = () => {
      tweetsList.innerHTML += req.response
    }

    req.open('GET', `/fetch-tweets?offset=${tweetsList.children.length}`)
    req.send()
  }
})

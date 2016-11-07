document.addEventListener('DOMContentLoaded', () => {
  const voteBtns = document.querySelectorAll('.vote-btn')

  voteBtns.forEach(btn => {
    btn.onclick = (e) => {
      const {id, delta} = e.currentTarget.dataset

      // update the UI
      updateVoteCount(id, parseInt(delta))

      // update the vote count on the server
      const req = new XMLHttpRequest()

      req.open('POST', '/vote', true)
      req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      req.send(`id=${id}&delta=${delta}`)
    }
  })
})

function updateVoteCount (id, delta) {
  const countEl = document.getElementById(`votes-count-${id}`)
  let count = parseInt(countEl.innerText)

  countEl.innerText = count + delta
}

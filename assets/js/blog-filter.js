(() => {
  const list = document.querySelector('#blog-post-list')
  const input = document.querySelector('#blog-filter-search')
  const count = document.querySelector('#blog-filter-count')
  if (!list || !input || !count) return

  let tag = new URLSearchParams(window.location.search).get('tag') || ''
  let series = new URLSearchParams(window.location.search).get('series') || ''
  const cards = [...list.querySelectorAll('.post-card')]
  const normalized = (value) => String(value || '').toLocaleLowerCase('ko')

  const render = () => {
    const query = normalized(input.value)
    let visible = 0
    cards.forEach((card) => {
      const text = normalized(card.textContent)
      const matches = (!tag || card.dataset.tags.split('|').includes(tag)) && (!series || card.dataset.series === series) && (!query || text.includes(query))
      card.hidden = !matches
      if (matches) visible += 1
    })
    count.textContent = visible
  }

  document.querySelectorAll('[data-filter-tag]').forEach((button) => {
    button.addEventListener('click', () => { tag = tag === button.dataset.filterTag ? '' : button.dataset.filterTag; render() })
  })
  document.querySelectorAll('[data-filter-series]').forEach((button) => {
    button.addEventListener('click', () => { series = series === button.dataset.filterSeries ? '' : button.dataset.filterSeries; render() })
  })
  input.addEventListener('input', render)
  render()
})()

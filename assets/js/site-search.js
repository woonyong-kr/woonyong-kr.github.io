(() => {
  const root = document.querySelector('[data-search-root]')
  if (!root) return
  const input = root.querySelector('input')
  const status = root.querySelector('[data-search-status]')
  const results = root.querySelector('[data-search-results]')
  const indexUrl = root.dataset.indexUrl
  let documents = []
  const normalize = (value) => String(value || '').toLocaleLowerCase('ko')
  const render = () => {
    const query = normalize(input.value).trim()
    results.replaceChildren()
    if (!query) { status.textContent = '검색어를 입력하세요.'; return }
    const matches = documents.filter((document) => normalize([document.title, document.description, ...(document.tags || []), document.content].join(' ')).includes(query)).slice(0, 30)
    status.textContent = `${matches.length}개의 결과`
    matches.forEach((document) => {
      const item = document.createElement('li')
      const link = document.createElement('a')
      link.href = document.url
      const section = document.createElement('span')
      section.textContent = document.section
      const title = document.createElement('strong')
      title.textContent = document.title
      const description = document.createElement('em')
      description.textContent = document.description || ''
      link.append(section, title, description)
      item.append(link)
      results.append(item)
    })
  }

  const initialQuery = new URLSearchParams(window.location.search).get('q')
  if (initialQuery) input.value = initialQuery

  fetch(indexUrl)
    .then((response) => response.ok ? response.json() : Promise.reject(response.status))
    .then((payload) => {
      documents = payload
      if (input.value) render()
      else status.textContent = `검색할 ${documents.length}개의 문서를 준비했습니다.`
    })
    .catch(() => { status.textContent = '검색 색인을 불러오지 못했습니다.' })

  input.addEventListener('input', render)
})()

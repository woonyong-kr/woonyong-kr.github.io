(() => {
  const hash = window.location.hash.replace(/^#/, '')
  const redirects = {
    '/blog': '/',
    '/knowledge': '/wiki/',
    '/wiki': '/wiki/',
    '/about': '/about/',
    '/portfolio': '/projects/kyro/',
  }
  const post = hash.match(/^\/posts\/([\w-]+)$/)
  const project = hash.match(/^\/projects\/([\w-]+)$/)
  const destination = post
    ? `/blog/${post[1]}/`
    : project
      ? `/projects/${project[1]}/`
      : redirects[hash]
  if (destination) window.location.replace(destination)
})()

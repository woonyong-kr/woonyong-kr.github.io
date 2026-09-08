# The default sheet already contains WN light. Keep only our dark override.
Jekyll::Hooks.register :site, :post_read do |site|
  unused = ['/assets/css/just-the-docs-light.css', '/assets/css/just-the-docs-dark.css']
  site.pages.reject! { |page| unused.include?(page.url) }
end

# Add the same build revision to upstream and custom assets, including the
# default light sheet. Preserve existing revisions and non-asset links.
Jekyll::Hooks.register [:pages, :documents], :post_render do |page|
  # Keep the gem as the source of search. Its focusout handler assumes a next
  # focus target, but blur(), window changes and hidden inputs can supply null.
  # Fail visibly on an upstream change so this small compatibility patch is reviewed.
  if page.url == '/assets/js/just-the-docs.js'
    needle = 'const nextFocusedElement = evt.relatedTarget;'
    unless page.output.split(needle, -1).length == 2
      raise 'Just the Docs search focus handler changed; review the null-target compatibility patch'
    end
    page.output = page.output.sub(needle, "#{needle}\n    if (!nextFocusedElement) { hideSearch(); return; }")
  end

  next unless page.output_ext == '.html'
  revision = page.site.config['github']&.[]('build_revision') || page.site.time.to_i
  page.output = page.output.gsub(%r{((?:href|src)=["'])(/assets/(?:css|js)/[^"'?]+|/favicon\.ico)(["'])}) do
    "#{Regexp.last_match(1)}#{Regexp.last_match(2)}?v=#{revision}#{Regexp.last_match(3)}"
  end
end

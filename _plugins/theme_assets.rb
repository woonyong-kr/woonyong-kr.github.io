# The default sheet already contains WN light. Keep only our dark override.
Jekyll::Hooks.register :site, :post_read do |site|
  unused = ['/assets/css/just-the-docs-light.css', '/assets/css/just-the-docs-dark.css']
  site.pages.reject! { |page| unused.include?(page.url) }
end

# Add the same build revision to upstream and custom assets, including the
# default light sheet. Preserve existing revisions and non-asset links.
Jekyll::Hooks.register [:pages, :documents], :post_render do |page|
  # Keep the gem as the source of search. Review these narrow compatibility
  # patches when upstream changes instead of maintaining a copied search engine.
  if page.url == '/assets/js/just-the-docs.js'
    patches = {
      'const nextFocusedElement = evt.relatedTarget;' =>
        "const nextFocusedElement = evt.relatedTarget;\n    if (!nextFocusedElement) { hideSearch(); return; }",
      "  jtd.addEvent(searchInput, 'focus', function(){" =>
        "  jtd.addEvent(searchInput, 'input', update);\n  if (searchInput.value !== '') update();\n\n  jtd.addEvent(searchInput, 'focus', function(){",
      "    currentSearchIndex++;\n\n    var input = searchInput.value;" =>
        '    var input = searchInput.value;',
      '    currentInput = input;' =>
        "    currentSearchIndex++;\n    currentInput = input;"
    }
    # Input can arrive before the index or without keyup (paste/IME). Repeated
    # focus/keyup on the same query must not cancel its pending result batches.
    patches.each do |needle, replacement|
      unless page.output.split(needle, -1).length == 2
        raise "Just the Docs search changed; review compatibility patch: #{needle.lines.first.strip}"
      end
      page.output = page.output.sub(needle, replacement)
    end
  end

  next unless page.output_ext == '.html'
  revision = page.site.config['github']&.[]('build_revision') || page.site.time.to_i
  page.output = page.output.gsub(%r{((?:href|src)=["'])(/assets/(?:css|js)/[^"'?]+|/favicon\.ico)(["'])}) do
    "#{Regexp.last_match(1)}#{Regexp.last_match(2)}?v=#{revision}#{Regexp.last_match(3)}"
  end
end

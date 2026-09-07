# The default sheet already contains WN light. Keep only our dark override.
Jekyll::Hooks.register :site, :post_read do |site|
  unused = ['/assets/css/just-the-docs-light.css', '/assets/css/just-the-docs-dark.css']
  site.pages.reject! { |page| unused.include?(page.url) }
end

# Add the same build revision to upstream and custom assets, including the
# default light sheet. Preserve existing revisions and non-asset links.
Jekyll::Hooks.register [:pages, :documents], :post_render do |page|
  next unless page.output_ext == '.html'
  revision = page.site.config['github']&.[]('build_revision') || page.site.time.to_i
  page.output = page.output.gsub(%r{((?:href|src)=["'])(/assets/(?:css|js)/[^"'?]+)(["'])}) do
    "#{Regexp.last_match(1)}#{Regexp.last_match(2)}?v=#{revision}#{Regexp.last_match(3)}"
  end
end

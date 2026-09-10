# Only approved public projection pages participate in this display switch.
# Removing a page before rendering also removes it from search and sitemap.
module WNDocs
  def self.validate_redirect_destinations(site)
    aliases = site.pages.select { |page| page.data['redirect_target'] }
    return if aliases.empty?

    destinations = (site.pages + site.documents + site.static_files)
                   .group_by { |item| item.destination(site.dest) }
    aliases.each do |page|
      target = page.destination(site.dest)
      conflict = destinations.any? do |path, owners|
        path == target ? owners != [page] :
          path.start_with?(target + File::SEPARATOR) || target.start_with?(path + File::SEPARATOR)
      end
      next unless conflict

      raise "Redirect output conflicts with another page or static file: #{page.url}"
    end
  end

  def self.apply_visibility(site)
    flag = site.config.fetch('wiki_show_planned', false)
    raise 'wiki_show_planned must be true or false' unless [true, false].include?(flag)
    return if flag

    pages = site.pages.select { |page| page.data['projection_id'] }
    by_id = pages.to_h { |page| [page.data['projection_id'], page] }
    retained = pages.reject { |page| page.data['content_status'] == 'planned' }
                    .map { |page| page.data['projection_id'] }.to_h { |id| [id, true] }
    retained.keys.each do |id|
      seen = {}
      parent = by_id[id].data['public_parent_id']
      while parent && by_id[parent]
        raise 'Cycle in public Wiki parents' if seen[parent]
        seen[parent] = true
        retained[parent] = true
        parent = by_id[parent].data['public_parent_id']
      end
    end
    retained_urls = retained.keys.to_h { |id| [by_id[id].data['permalink'], true] }
    site.pages.reject! do |page|
      if page.data['redirect_target']
        !retained_urls[page.data['redirect_target']]
      else
        page.data['projection_id'] && !retained[page.data['projection_id']]
      end
    end
  end
end

Jekyll::Hooks.register :site, :pre_render do |site|
  WNDocs.validate_redirect_destinations(site)
end

Jekyll::Hooks.register :site, :post_read do |site|
  WNDocs.apply_visibility(site)
end

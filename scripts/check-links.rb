# frozen_string_literal: true

require "html-proofer"
require "set"

# Keep HTMLProofer's URL, file, image and script checks. Reuse only the
# fragment identifiers from its first HTML5 parse, rather than parsing each
# target again and traversing the entire navigation for every fragment.
raise "Revalidate the fragment adapter when upgrading HTMLProofer" unless HTMLProofer::VERSION == "5.2.2"

module ParsedFragmentIndex
  def fragment_ids
    @fragment_ids ||= {}
  end

  def load_file(path, source)
    super.tap do
      fragment_ids[File.expand_path(path)] = @html.xpath("//@id | //@name").map(&:value).to_set
    end
  end
end

module ReuseParsedFragments
  def create_nokogiri(path)
    @runner.fragment_ids.fetch(File.expand_path(path)) { super }
  end

  private

  def hash_exists_in_html?(href_hash, html)
    return super unless html.is_a?(Set)

    html.include?(href_hash) || html.include?(Addressable::URI.unescape(href_hash))
  end
end

HTMLProofer::Runner.prepend(ParsedFragmentIndex)
HTMLProofer::UrlValidator::Internal.prepend(ReuseParsedFragments)

if $PROGRAM_NAME == __FILE__
  HTMLProofer.check_directory(ARGV.fetch(0, "_site"), disable_external: true, allow_hash_href: true).run
end

require 'minitest/autorun'
require 'ostruct'
module Jekyll
  module Hooks
    def self.register(*); end
  end
end
require_relative '../_plugins/wiki_visibility'

class WikiVisibilityTest < Minitest::Test
  def page(id, status, parent = nil)
    OpenStruct.new(data: { 'projection_id' => id, 'content_status' => status,
                          'public_parent_id' => parent, 'permalink' => "/wiki/#{id}/" })
  end

  def test_preview_keeps_every_planned_keyword
    site = OpenStruct.new(config: { 'wiki_show_planned' => true }, pages: [page('one', 'planned')])
    WNDocs.apply_visibility(site)
    assert_equal ['one'], site.pages.map { |p| p.data['projection_id'] }
  end

  def test_hidden_planned_pages_leave_ready_ancestors_and_other_site_pages
    ordinary = OpenStruct.new(data: {})
    site = OpenStruct.new(config: { 'wiki_show_planned' => false }, pages: [
      page('root', 'overview'), page('branch', 'planned', 'root'),
      page('ready', 'ready', 'branch'), page('future', 'planned', 'branch'), ordinary
    ])
    WNDocs.apply_visibility(site)
    assert_equal ['root', 'branch', 'ready', nil], site.pages.map { |p| p.data['projection_id'] }
  end

  def test_switch_rejects_a_string_that_looks_false
    site = OpenStruct.new(config: { 'wiki_show_planned' => 'false' }, pages: [])
    assert_raises(RuntimeError) { WNDocs.apply_visibility(site) }
  end

  def test_retained_parent_cycle_fails
    site = OpenStruct.new(config: {}, pages: [page('a', 'ready', 'b'), page('b', 'planned', 'a')])
    assert_raises(RuntimeError) { WNDocs.apply_visibility(site) }
  end

  def test_redirect_visibility_follows_target_including_retained_planned_ancestors
    branch_redirect = OpenStruct.new(data: { 'redirect_target' => '/wiki/branch/' })
    hidden_redirect = OpenStruct.new(data: { 'redirect_target' => '/wiki/future/' })
    site = OpenStruct.new(config: { 'wiki_show_planned' => false }, pages: [
      page('branch', 'planned'), page('ready', 'ready', 'branch'),
      page('future', 'planned'), branch_redirect, hidden_redirect
    ])
    WNDocs.apply_visibility(site)
    assert_includes site.pages, branch_redirect
    refute_includes site.pages, hidden_redirect
  end
end

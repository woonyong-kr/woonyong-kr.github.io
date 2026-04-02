#!/usr/bin/env ruby

require "json"
require "net/http"
require "open3"
require "time"
require "uri"
require "yaml"
require "date"

ROOT_DIR = File.expand_path("..", __dir__)
CONFIG_PATH = File.join(ROOT_DIR, "_config.yml")
PROFILE_PATH = File.join(ROOT_DIR, "_data", "profile.yml")
THEME_PATH = File.join(ROOT_DIR, "_data", "theme.yml")
OUTPUT_PATH = File.join(ROOT_DIR, "_data", "github_contributions_cache.json")
GRAPHQL_ENDPOINT = URI("https://api.github.com/graphql")

def load_yaml(path)
  return {} unless File.exist?(path)

  YAML.safe_load(File.read(path), permitted_classes: [Date, Time], aliases: true) || {}
end

def write_payload(payload)
  File.write(OUTPUT_PATH, "#{JSON.pretty_generate(payload)}\n")
end

def gh_token
  stdout, status = Open3.capture2("gh", "auth", "token")
  return "" unless status.success?

  stdout.strip
rescue Errno::ENOENT
  ""
end

def placeholder_payload(title:, login:, profile_url:, reason:)
  {
    "enabled" => false,
    "title" => title,
    "login" => login,
    "profile_url" => profile_url,
    "reason" => reason,
    "weeks" => [],
    "months" => []
  }
end

def tooltip_label(date_string, contribution_count)
  date = Date.parse(date_string)
  "#{date.strftime('%Y년 %-m월 %-d일')} · #{contribution_count}회 기여"
end

def strict_mode?
  ENV["GITHUB_CONTRIBUTIONS_STRICT"] == "1" || ENV.key?("CI") || ENV.key?("JENKINS_HOME")
end

config = load_yaml(CONFIG_PATH)
profile = load_yaml(PROFILE_PATH)
theme = load_yaml(THEME_PATH)
settings = theme.dig("hero", "github_contributions") || {}
title = settings["title"].to_s.strip
title = "GitHub 기여 그래프" if title.empty?
enabled = settings.fetch("enabled", false)

unless enabled
  write_payload(
    placeholder_payload(
      title: title,
      login: "",
      profile_url: "",
      reason: "disabled"
    )
  )
  puts "GitHub contributions graph is disabled."
  exit 0
end

ENV["TZ"] = config["timezone"].to_s unless config["timezone"].to_s.empty?

login = settings["username"].to_s.strip
if login.empty?
  github_url = profile["github"].to_s
  login = github_url[%r{\Ahttps://github\.com/([^/?#]+)}, 1].to_s
end

if login.empty?
  payload = placeholder_payload(title: title, login: "", profile_url: "", reason: "missing_username")
  write_payload(payload)
  abort "GitHub contributions username is missing." if strict_mode?
  puts "GitHub contributions username is missing. Skipping graph."
  exit 0
end

profile_url = "https://github.com/#{login}"
token = ENV["GITHUB_GRAPHQL_TOKEN"].to_s.strip
token = ENV["GITHUB_TOKEN"].to_s.strip if token.empty?
token = gh_token if token.empty?

if token.empty?
  payload = placeholder_payload(title: title, login: login, profile_url: profile_url, reason: "missing_token")
  write_payload(payload)
  abort "GitHub token is missing. Set GITHUB_GRAPHQL_TOKEN or log in with gh auth." if strict_mode?
  puts "GitHub token is missing. Skipping graph fetch."
  exit 0
end

to_time = Time.now
from_time = to_time - (365 * 24 * 60 * 60)

query = <<~GRAPHQL
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            firstDay
            contributionDays {
              contributionCount
              contributionLevel
              date
              weekday
            }
          }
          months {
            name
            firstDay
            totalWeeks
            year
          }
        }
      }
    }
  }
GRAPHQL

request = Net::HTTP::Post.new(GRAPHQL_ENDPOINT)
request["Authorization"] = "bearer #{token}"
request["Content-Type"] = "application/json"
request["User-Agent"] = "velog-jekyll-theme"
request.body = JSON.generate(
  {
    query: query,
    variables: {
      login: login,
      from: from_time.iso8601,
      to: to_time.iso8601
    }
  }
)

http = Net::HTTP.new(GRAPHQL_ENDPOINT.host, GRAPHQL_ENDPOINT.port)
http.use_ssl = true
response = http.request(request)

unless response.is_a?(Net::HTTPSuccess)
  write_payload(
    placeholder_payload(
      title: title,
      login: login,
      profile_url: profile_url,
      reason: "request_failed"
    )
  )
  abort "GitHub contributions request failed: HTTP #{response.code}" if strict_mode?
  puts "GitHub contributions request failed: HTTP #{response.code}"
  exit 0
end

body = JSON.parse(response.body)

if body["errors"]
  write_payload(
    placeholder_payload(
      title: title,
      login: login,
      profile_url: profile_url,
      reason: "graphql_error"
    )
  )
  abort "GitHub contributions query failed: #{body['errors'].map { |error| error['message'] }.join(', ')}" if strict_mode?
  puts "GitHub contributions query failed."
  exit 0
end

calendar = body.dig("data", "user", "contributionsCollection", "contributionCalendar")

if calendar.nil?
  write_payload(
    placeholder_payload(
      title: title,
      login: login,
      profile_url: profile_url,
      reason: "missing_calendar"
    )
  )
  abort "GitHub contributions calendar is unavailable for #{login}." if strict_mode?
  puts "GitHub contributions calendar is unavailable."
  exit 0
end

weeks = calendar.fetch("weeks", []).map do |week|
  padded_days = Array.new(7) { { "is_padding" => true } }

  week.fetch("contributionDays", []).each do |day|
    padded_days[day.fetch("weekday")] = {
      "is_padding" => false,
      "date" => day.fetch("date"),
      "count" => day.fetch("contributionCount"),
      "level" => day.fetch("contributionLevel"),
      "tooltip" => tooltip_label(day.fetch("date"), day.fetch("contributionCount"))
    }
  end

  {
    "first_day" => week.fetch("firstDay"),
    "days" => padded_days
  }
end

start_week = 1
months = calendar.fetch("months", []).map do |month|
  label = "#{Date.parse(month.fetch('firstDay')).month}월"
  mapped_month = {
    "label" => label,
    "start_week" => start_week,
    "total_weeks" => month.fetch("totalWeeks"),
    "year" => month.fetch("year")
  }
  start_week += month.fetch("totalWeeks")
  mapped_month
end

payload = {
  "enabled" => true,
  "title" => title,
  "login" => login,
  "profile_url" => profile_url,
  "fetched_at" => to_time.iso8601,
  "updated_label" => "마지막 동기화 #{to_time.strftime('%Y.%m.%d %H:%M')}",
  "from" => from_time.to_date.iso8601,
  "to" => to_time.to_date.iso8601,
  "range_label" => "#{from_time.strftime('%Y.%m.%d')} ~ #{to_time.strftime('%Y.%m.%d')}",
  "summary_label" => "최근 1년 동안 #{calendar.fetch('totalContributions')}회 기여",
  "total_contributions" => calendar.fetch("totalContributions"),
  "months" => months,
  "weeks" => weeks
}

write_payload(payload)
puts "GitHub contributions cache updated for #{login}."

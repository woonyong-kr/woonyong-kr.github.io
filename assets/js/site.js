(function () {
  function setTheme(theme) {
    var safeTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", safeTheme);
    try {
      localStorage.setItem("velog-theme", safeTheme);
    } catch (error) {
      return;
    }
  }

  function normalizeValue(value) {
    return String(value || "").trim().toLowerCase();
  }

  function updateUrl(state) {
    var nextUrl = new URL(window.location.href);

    if (state.tag) {
      nextUrl.searchParams.set("tag", state.tag);
    } else {
      nextUrl.searchParams.delete("tag");
    }

    if (state.series) {
      nextUrl.searchParams.set("series", state.series);
    } else {
      nextUrl.searchParams.delete("series");
    }

    if (state.q) {
      nextUrl.searchParams.set("q", state.q);
    } else {
      nextUrl.searchParams.delete("q");
    }

    history.replaceState(null, "", nextUrl.pathname + nextUrl.search);
  }

  function getSearchKeyword() {
    return String(new URLSearchParams(window.location.search).get("q") || "").trim();
  }

  function setupThemeToggle() {
    var toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) {
      return;
    }

    toggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  function setupSearchForm() {
    var searchForm = document.querySelector("[data-search-form]");
    var searchInput = document.querySelector("[data-post-search]");

    if (!searchForm || !searchInput) {
      return;
    }

    searchInput.value = getSearchKeyword();
  }

  function setupPostFilters() {
    var searchForm = document.querySelector("[data-search-form]");
    var searchInput = document.querySelector("[data-post-search]");
    var postCards = Array.prototype.slice.call(document.querySelectorAll("[data-post-card]"));

    if (!searchInput || postCards.length === 0) {
      return;
    }

    var tagLinks = Array.prototype.slice.call(document.querySelectorAll("[data-tag-link]"));
    var summary = document.querySelector("[data-post-summary]");
    var empty = document.querySelector("[data-post-empty]");
    var params = new URLSearchParams(window.location.search);
    var state = {
      tag: normalizeValue(params.get("tag")),
      series: normalizeValue(params.get("series")),
      q: String(params.get("q") || "").trim(),
    };
    var tagLabels = {};
    var seriesLabels = {};

    tagLinks.forEach(function (link) {
      var key = normalizeValue(link.getAttribute("data-tag-filter"));
      var label = link.getAttribute("data-tag-label");

      if (key && label && !tagLabels[key]) {
        tagLabels[key] = label;
      }
    });

    postCards.forEach(function (card) {
      var key = normalizeValue(card.getAttribute("data-series-key"));
      var label = card.getAttribute("data-series-label");

      if (key && label && !seriesLabels[key]) {
        seriesLabels[key] = label;
      }
    });

    searchInput.value = state.q;

    function updateTagLinks() {
      tagLinks.forEach(function (link) {
        var tagFilter = normalizeValue(link.getAttribute("data-tag-filter"));
        var isActive = tagFilter ? tagFilter === state.tag : !state.tag;
        var targetUrl = new URL(link.href, window.location.origin);

        link.classList.toggle("is-active", isActive);
        targetUrl.searchParams.delete("series");

        if (state.q) {
          targetUrl.searchParams.set("q", state.q);
        } else {
          targetUrl.searchParams.delete("q");
        }

        if (tagFilter) {
          targetUrl.searchParams.set("tag", link.getAttribute("data-tag-filter"));
        } else {
          targetUrl.searchParams.delete("tag");
        }

        link.href = targetUrl.pathname + targetUrl.search;
      });
    }

    function updateSummary(visibleCount) {
      if (!summary) {
        return;
      }

      var filters = [];

      if (state.series) {
        filters.push("시리즈: " + (seriesLabels[state.series] || state.series));
      }

      if (state.tag) {
        filters.push("태그: " + (tagLabels[state.tag] || state.tag));
      }

      if (state.q && !state.tag && !state.series) {
        summary.hidden = false;
        if (visibleCount === 0) {
          summary.textContent = "검색 결과가 없습니다.";
        } else {
          summary.innerHTML = '총 <strong>' + visibleCount + '개</strong>의 포스트를 찾았습니다.';
        }
        return;
      }

      if (state.q) {
        filters.push('검색: "' + state.q + '"');
      }

      summary.hidden = filters.length === 0;

      if (filters.length > 0) {
        summary.textContent = filters.join(" · ") + " · " + visibleCount + "개의 글";
      }
    }

    function applyFilters() {
      var visibleCount = 0;

      postCards.forEach(function (card) {
        var tagValues = normalizeValue(card.getAttribute("data-tags")).split("|");
        var seriesKey = normalizeValue(card.getAttribute("data-series-key"));
        var searchText = normalizeValue(card.getAttribute("data-search"));
        var query = normalizeValue(state.q);
        var matchesTag = !state.tag || tagValues.indexOf(state.tag) !== -1;
        var matchesSeries = !state.series || seriesKey === state.series;
        var matchesQuery = !query || searchText.indexOf(query) !== -1;
        var isVisible = matchesTag && matchesSeries && matchesQuery;

        card.hidden = !isVisible;

        if (isVisible) {
          visibleCount += 1;
        }
      });

      if (empty) {
        empty.hidden = visibleCount !== 0;
      }

      updateSummary(visibleCount);
      updateTagLinks();
    }

    if (searchForm) {
      searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        state.q = searchInput.value.trim();
        updateUrl(state);
        applyFilters();
      });
    }

    var debounceTimer = 0;
    searchInput.addEventListener("input", function () {
      state.q = searchInput.value.trim();
      applyFilters();
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(function () {
        updateUrl(state);
      }, 200);
    });

    applyFilters();
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupSearchForm();
    setupThemeToggle();
    setupPostFilters();
  });
})();

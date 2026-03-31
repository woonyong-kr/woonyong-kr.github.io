(function () {
  var THEME_STORAGE_KEY = "velog-theme";
  var PAGE_SIZE = 12;

  function getStoredTheme() {
    try {
      var storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      return storedTheme === "dark" || storedTheme === "light" ? storedTheme : "";
    } catch (error) {
      return "";
    }
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function updateThemeMeta(theme) {
    var themeColorMeta = document.querySelector("[data-theme-color]");
    var appleStatusMeta = document.querySelector("[data-apple-status-bar]");
    var safeTheme = theme === "dark" ? "dark" : "light";

    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", safeTheme === "dark" ? "#121212" : "#ffffff");
    }

    if (appleStatusMeta) {
      appleStatusMeta.setAttribute("content", safeTheme === "dark" ? "black" : "default");
    }
  }

  function applyTheme(theme, persist) {
    var safeTheme = theme === "dark" ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", safeTheme);
    updateThemeMeta(safeTheme);

    if (persist !== true) {
      return;
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
    } catch (error) {
      return;
    }
  }

  function setTheme(theme) {
    applyTheme(theme, true);
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

  function setupSystemThemeSync() {
    if (!window.matchMedia) {
      return;
    }

    var mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function syncTheme() {
      if (getStoredTheme()) {
        return;
      }

      applyTheme(mediaQuery.matches ? "dark" : "light");
    }

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncTheme);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(syncTheme);
    }
  }

  function setupSearchForm() {
    var searchForm = document.querySelector("[data-search-form]");
    var searchInput = document.querySelector("[data-post-search]");

    if (!searchForm || !searchInput) {
      return;
    }

    function updateSearchState() {
      var hasValue = searchInput.value.trim().length > 0;
      var isFocused = document.activeElement === searchInput;
      searchForm.classList.toggle("is-active", hasValue || isFocused);
    }

    searchInput.value = getSearchKeyword();
    updateSearchState();

    searchInput.addEventListener("focus", updateSearchState);
    searchInput.addEventListener("blur", updateSearchState);
    searchInput.addEventListener("input", updateSearchState);
  }

  function setupPostFilters() {
    var searchForm = document.querySelector("[data-search-form]");
    var searchInput = document.querySelector("[data-post-search]");
    var postCards = Array.prototype.slice.call(document.querySelectorAll("[data-post-card]"));
    var sentinel = document.querySelector("[data-post-sentinel]");
    var more = document.querySelector("[data-post-more]");

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
    var matchedCards = [];
    var visibleLimit = PAGE_SIZE;

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

      if (state.q) {
        summary.hidden = false;
        if (visibleCount === 0) {
          summary.textContent = "검색 결과가 없습니다.";
        } else {
          summary.innerHTML = '총 <strong>' + visibleCount + '개</strong>의 포스트를 찾았습니다.';
        }
        return;
      }

      summary.hidden = true;
    }

    function updatePaginationState() {
      var hasMore = matchedCards.length > visibleLimit;

      if (more) {
        more.hidden = !hasMore;
      }

      if (sentinel) {
        sentinel.hidden = !hasMore;
      }
    }

    function renderVisibleCards() {
      postCards.forEach(function (card) {
        card.hidden = true;
      });

      matchedCards.forEach(function (card, index) {
        card.hidden = index >= visibleLimit;
      });

      if (empty) {
        empty.hidden = matchedCards.length !== 0;
      }

      updateSummary(matchedCards.length);
      updateTagLinks();
      updatePaginationState();
    }

    function applyFilters() {
      visibleLimit = PAGE_SIZE;
      matchedCards = [];

      postCards.forEach(function (card) {
        var tagValues = normalizeValue(card.getAttribute("data-tags")).split("|");
        var seriesKey = normalizeValue(card.getAttribute("data-series-key"));
        var searchText = normalizeValue(card.getAttribute("data-search"));
        var query = normalizeValue(state.q);
        var matchesTag = !state.tag || tagValues.indexOf(state.tag) !== -1;
        var matchesSeries = !state.series || seriesKey === state.series;
        var matchesQuery = !query || searchText.indexOf(query) !== -1;
        var isVisible = matchesTag && matchesSeries && matchesQuery;

        if (isVisible) {
          matchedCards.push(card);
        }
      });

      renderVisibleCards();
    }

    function loadMorePosts() {
      if (matchedCards.length <= visibleLimit) {
        return;
      }

      visibleLimit += PAGE_SIZE;
      renderVisibleCards();
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

    if (sentinel) {
      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                loadMorePosts();
              }
            });
          },
          { rootMargin: "320px 0px" }
        );

        observer.observe(sentinel);
      } else {
        window.addEventListener(
          "scroll",
          function () {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 320) {
              loadMorePosts();
            }
          },
          { passive: true }
        );
      }
    }

    applyFilters();
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupSearchForm();
    setupThemeToggle();
    setupSystemThemeSync();
    setupPostFilters();
  });
})();

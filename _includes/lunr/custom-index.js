if (i === '0') {
  // Lunr 2.3.x concatenates numeric edge labels and node IDs without boundaries.
  // Distinct states can then share a signature and invent wildcard matches.
  // Keep the state tuple unambiguous before the token set is minimized.
  lunr.TokenSet.prototype.toString = function () {
    if (this._str) return this._str;
    return JSON.stringify([this.final, Object.keys(this.edges).sort().map(function (label) {
      return [label, this.edges[label].id];
    }, this)]);
  };
  var wnKeywordTrimmer = function (token) {
    return token.update(function (text) {
      return text.replace(/^[^\p{L}\p{N}.+#]+|[^\p{L}\p{N}+#]+$/gu, '');
    });
  };
  lunr.Pipeline.registerFunction(wnKeywordTrimmer, 'wn-keyword-trimmer');
  this.pipeline.before(lunr.trimmer, wnKeywordTrimmer);
  this.pipeline.remove(lunr.trimmer);
}
docs[i].content += ' ' + (docs[i].search_terms || []).join(' ');

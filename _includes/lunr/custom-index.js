if (i === '0') {
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

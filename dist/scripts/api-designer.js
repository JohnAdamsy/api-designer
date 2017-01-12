(function (f) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = f();
  } else if (typeof define === 'function' && define.amd) {
    define([], f);
  } else {
    var g;
    if (typeof window !== 'undefined') {
      g = window;
    } else if (typeof global !== 'undefined') {
      g = global;
    } else if (typeof self !== 'undefined') {
      g = self;
    } else {
      g = this;
    }
    (g.jsTraverse || (g.jsTraverse = {})).traverse = f();
  }
}(function () {
  var define, module, exports;
  return function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          var a = typeof require == 'function' && require;
          if (!u && a)
            return a(o, !0);
          if (i)
            return i(o, !0);
          var f = new Error('Cannot find module \'' + o + '\'');
          throw f.code = 'MODULE_NOT_FOUND', f;
        }
        var l = n[o] = { exports: {} };
        t[o][0].call(l.exports, function (e) {
          var n = t[o][1][e];
          return s(n ? n : e);
        }, l, l.exports, e, t, n, r);
      }
      return n[o].exports;
    }
    var i = typeof require == 'function' && require;
    for (var o = 0; o < r.length; o++)
      s(r[o]);
    return s;
  }({
    1: [
      function (require, module, exports) {
        var traverse = module.exports = function (obj) {
            return new Traverse(obj);
          };
        function Traverse(obj) {
          this.value = obj;
        }
        Traverse.prototype.get = function (ps) {
          var node = this.value;
          for (var i = 0; i < ps.length; i++) {
            var key = ps[i];
            if (!node || !hasOwnProperty.call(node, key)) {
              node = undefined;
              break;
            }
            node = node[key];
          }
          return node;
        };
        Traverse.prototype.has = function (ps) {
          var node = this.value;
          for (var i = 0; i < ps.length; i++) {
            var key = ps[i];
            if (!node || !hasOwnProperty.call(node, key)) {
              return false;
            }
            node = node[key];
          }
          return true;
        };
        Traverse.prototype.set = function (ps, value) {
          var node = this.value;
          for (var i = 0; i < ps.length - 1; i++) {
            var key = ps[i];
            if (!hasOwnProperty.call(node, key))
              node[key] = {};
            node = node[key];
          }
          node[ps[i]] = value;
          return value;
        };
        Traverse.prototype.map = function (cb) {
          return walk(this.value, cb, true);
        };
        Traverse.prototype.forEach = function (cb) {
          this.value = walk(this.value, cb, false);
          return this.value;
        };
        Traverse.prototype.reduce = function (cb, init) {
          var skip = arguments.length === 1;
          var acc = skip ? this.value : init;
          this.forEach(function (x) {
            if (!this.isRoot || !skip) {
              acc = cb.call(this, acc, x);
            }
          });
          return acc;
        };
        Traverse.prototype.paths = function () {
          var acc = [];
          this.forEach(function (x) {
            acc.push(this.path);
          });
          return acc;
        };
        Traverse.prototype.nodes = function () {
          var acc = [];
          this.forEach(function (x) {
            acc.push(this.node);
          });
          return acc;
        };
        Traverse.prototype.clone = function () {
          var parents = [], nodes = [];
          return function clone(src) {
            for (var i = 0; i < parents.length; i++) {
              if (parents[i] === src) {
                return nodes[i];
              }
            }
            if (typeof src === 'object' && src !== null) {
              var dst = copy(src);
              parents.push(src);
              nodes.push(dst);
              forEach(objectKeys(src), function (key) {
                dst[key] = clone(src[key]);
              });
              parents.pop();
              nodes.pop();
              return dst;
            } else {
              return src;
            }
          }(this.value);
        };
        function walk(root, cb, immutable) {
          var path = [];
          var parents = [];
          var alive = true;
          return function walker(node_) {
            var node = immutable ? copy(node_) : node_;
            var modifiers = {};
            var keepGoing = true;
            var state = {
                node: node,
                node_: node_,
                path: [].concat(path),
                parent: parents[parents.length - 1],
                parents: parents,
                key: path.slice(-1)[0],
                isRoot: path.length === 0,
                level: path.length,
                circular: null,
                update: function (x, stopHere) {
                  if (!state.isRoot) {
                    state.parent.node[state.key] = x;
                  }
                  state.node = x;
                  if (stopHere)
                    keepGoing = false;
                },
                'delete': function (stopHere) {
                  delete state.parent.node[state.key];
                  if (stopHere)
                    keepGoing = false;
                },
                remove: function (stopHere) {
                  if (isArray(state.parent.node)) {
                    state.parent.node.splice(state.key, 1);
                  } else {
                    delete state.parent.node[state.key];
                  }
                  if (stopHere)
                    keepGoing = false;
                },
                keys: null,
                before: function (f) {
                  modifiers.before = f;
                },
                after: function (f) {
                  modifiers.after = f;
                },
                pre: function (f) {
                  modifiers.pre = f;
                },
                post: function (f) {
                  modifiers.post = f;
                },
                stop: function () {
                  alive = false;
                },
                block: function () {
                  keepGoing = false;
                }
              };
            if (!alive)
              return state;
            function updateState() {
              if (typeof state.node === 'object' && state.node !== null) {
                if (!state.keys || state.node_ !== state.node) {
                  state.keys = objectKeys(state.node);
                }
                state.isLeaf = state.keys.length == 0;
                for (var i = 0; i < parents.length; i++) {
                  if (parents[i].node_ === node_) {
                    state.circular = parents[i];
                    break;
                  }
                }
              } else {
                state.isLeaf = true;
                state.keys = null;
              }
              state.notLeaf = !state.isLeaf;
              state.notRoot = !state.isRoot;
            }
            updateState();
            // use return values to update if defined
            var ret = cb.call(state, state.node);
            if (ret !== undefined && state.update)
              state.update(ret);
            if (modifiers.before)
              modifiers.before.call(state, state.node);
            if (!keepGoing)
              return state;
            if (typeof state.node == 'object' && state.node !== null && !state.circular) {
              parents.push(state);
              updateState();
              forEach(state.keys, function (key, i) {
                path.push(key);
                if (modifiers.pre)
                  modifiers.pre.call(state, state.node[key], key);
                var child = walker(state.node[key]);
                if (immutable && hasOwnProperty.call(state.node, key)) {
                  state.node[key] = child.node;
                }
                child.isLast = i == state.keys.length - 1;
                child.isFirst = i == 0;
                if (modifiers.post)
                  modifiers.post.call(state, child);
                path.pop();
              });
              parents.pop();
            }
            if (modifiers.after)
              modifiers.after.call(state, state.node);
            return state;
          }(root).node;
        }
        function copy(src) {
          if (typeof src === 'object' && src !== null) {
            var dst;
            if (isArray(src)) {
              dst = [];
            } else if (isDate(src)) {
              dst = new Date(src.getTime ? src.getTime() : src);
            } else if (isRegExp(src)) {
              dst = new RegExp(src);
            } else if (isError(src)) {
              dst = { message: src.message };
            } else if (isBoolean(src)) {
              dst = new Boolean(src);
            } else if (isNumber(src)) {
              dst = new Number(src);
            } else if (isString(src)) {
              dst = new String(src);
            } else if (Object.create && Object.getPrototypeOf) {
              dst = Object.create(Object.getPrototypeOf(src));
            } else if (src.constructor === Object) {
              dst = {};
            } else {
              var proto = src.constructor && src.constructor.prototype || src.__proto__ || {};
              ;
              var T = function () {
              };
              T.prototype = proto;
              dst = new T();
            }
            forEach(objectKeys(src), function (key) {
              dst[key] = src[key];
            });
            return dst;
          } else
            return src;
        }
        var objectKeys = Object.keys || function keys(obj) {
            var res = [];
            for (var key in obj)
              res.push(key);
            return res;
          };
        function toS(obj) {
          return Object.prototype.toString.call(obj);
        }
        function isDate(obj) {
          return toS(obj) === '[object Date]';
        }
        function isRegExp(obj) {
          return toS(obj) === '[object RegExp]';
        }
        function isError(obj) {
          return toS(obj) === '[object Error]';
        }
        function isBoolean(obj) {
          return toS(obj) === '[object Boolean]';
        }
        function isNumber(obj) {
          return toS(obj) === '[object Number]';
        }
        function isString(obj) {
          return toS(obj) === '[object String]';
        }
        var isArray = Array.isArray || function isArray(xs) {
            return Object.prototype.toString.call(xs) === '[object Array]';
          };
        var forEach = function (xs, fn) {
          if (xs.forEach)
            return xs.forEach(fn);
          else
            for (var i = 0; i < xs.length; i++) {
              fn(xs[i], i, xs);
            }
        };
        forEach(objectKeys(Traverse.prototype), function (key) {
          traverse[key] = function (obj) {
            var args = [].slice.call(arguments, 1);
            var t = new Traverse(obj);
            return t[key].apply(t, args);
          };
        });
        var hasOwnProperty = Object.hasOwnProperty || function (obj, key) {
            return key in obj;
          };
      },
      {}
    ]
  }, {}, [1])(1);
}));
(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == 'function' && require;
        if (!u && a)
          return a(o, !0);
        if (i)
          return i(o, !0);
        var f = new Error('Cannot find module \'' + o + '\'');
        throw f.code = 'MODULE_NOT_FOUND', f;
      }
      var l = n[o] = { exports: {} };
      t[o][0].call(l.exports, function (e) {
        var n = t[o][1][e];
        return s(n ? n : e);
      }, l, l.exports, e, t, n, r);
    }
    return n[o].exports;
  }
  var i = typeof require == 'function' && require;
  for (var o = 0; o < r.length; o++)
    s(r[o]);
  return s;
}({}, {}, [])(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == 'function' && require;
        if (!u && a)
          return a(o, !0);
        if (i)
          return i(o, !0);
        var f = new Error('Cannot find module \'' + o + '\'');
        throw f.code = 'MODULE_NOT_FOUND', f;
      }
      var l = n[o] = { exports: {} };
      t[o][0].call(l.exports, function (e) {
        var n = t[o][1][e];
        return s(n ? n : e);
      }, l, l.exports, e, t, n, r);
    }
    return n[o].exports;
  }
  var i = typeof require == 'function' && require;
  for (var o = 0; o < r.length; o++)
    s(r[o]);
  return s;
})({
  1: [
    function (require, module, exports) {
      (function () {
        var PathSeparator, legacy_scorer, pluckCandidates, scorer, sortCandidates;
        scorer = require('./scorer');
        legacy_scorer = require('./legacy');
        pluckCandidates = function (a) {
          return a.candidate;
        };
        sortCandidates = function (a, b) {
          return b.score - a.score;
        };
        PathSeparator = require('path').sep;
        module.exports = function (candidates, query, _arg) {
          var allowErrors, bAllowErrors, bKey, candidate, coreQuery, key, legacy, maxInners, maxResults, prepQuery, queryHasSlashes, score, scoredCandidates, spotLeft, string, _i, _j, _len, _len1, _ref;
          _ref = _arg != null ? _arg : {}, key = _ref.key, maxResults = _ref.maxResults, maxInners = _ref.maxInners, allowErrors = _ref.allowErrors, legacy = _ref.legacy;
          scoredCandidates = [];
          spotLeft = maxInners != null && maxInners > 0 ? maxInners : candidates.length;
          bAllowErrors = !!allowErrors;
          bKey = key != null;
          prepQuery = scorer.prepQuery(query);
          if (!legacy) {
            for (_i = 0, _len = candidates.length; _i < _len; _i++) {
              candidate = candidates[_i];
              string = bKey ? candidate[key] : candidate;
              if (!string) {
                continue;
              }
              score = scorer.score(string, query, prepQuery, bAllowErrors);
              if (score > 0) {
                scoredCandidates.push({
                  candidate: candidate,
                  score: score
                });
                if (!--spotLeft) {
                  break;
                }
              }
            }
          } else {
            queryHasSlashes = prepQuery.depth > 0;
            coreQuery = prepQuery.core;
            for (_j = 0, _len1 = candidates.length; _j < _len1; _j++) {
              candidate = candidates[_j];
              string = key != null ? candidate[key] : candidate;
              if (!string) {
                continue;
              }
              score = legacy_scorer.score(string, coreQuery, queryHasSlashes);
              if (!queryHasSlashes) {
                score = legacy_scorer.basenameScore(string, coreQuery, score);
              }
              if (score > 0) {
                scoredCandidates.push({
                  candidate: candidate,
                  score: score
                });
              }
            }
          }
          scoredCandidates.sort(sortCandidates);
          candidates = scoredCandidates.map(pluckCandidates);
          if (maxResults != null) {
            candidates = candidates.slice(0, maxResults);
          }
          return candidates;
        };
      }.call(this));
    },
    {
      './legacy': 3,
      './scorer': 5,
      'path': 6
    }
  ],
  2: [
    function (require, module, exports) {
      (function () {
        var PathSeparator, filter, legacy_scorer, matcher, prepQueryCache, scorer;
        scorer = require('./scorer');
        legacy_scorer = require('./legacy');
        filter = require('./filter');
        matcher = require('./matcher');
        PathSeparator = require('path').sep;
        prepQueryCache = null;
        module.exports = {
          filter: function (candidates, query, options) {
            if (!((query != null ? query.length : void 0) && (candidates != null ? candidates.length : void 0))) {
              return [];
            }
            return filter(candidates, query, options);
          },
          prepQuery: function (query) {
            return scorer.prepQuery(query);
          },
          score: function (string, query, prepQuery, _arg) {
            var allowErrors, coreQuery, legacy, queryHasSlashes, score, _ref;
            _ref = _arg != null ? _arg : {}, allowErrors = _ref.allowErrors, legacy = _ref.legacy;
            if (!((string != null ? string.length : void 0) && (query != null ? query.length : void 0))) {
              return 0;
            }
            if (prepQuery == null) {
              prepQuery = prepQueryCache && prepQueryCache.query === query ? prepQueryCache : prepQueryCache = scorer.prepQuery(query);
            }
            if (!legacy) {
              score = scorer.score(string, query, prepQuery, !!allowErrors);
            } else {
              queryHasSlashes = prepQuery.depth > 0;
              coreQuery = prepQuery.core;
              score = legacy_scorer.score(string, coreQuery, queryHasSlashes);
              if (!queryHasSlashes) {
                score = legacy_scorer.basenameScore(string, coreQuery, score);
              }
            }
            return score;
          },
          match: function (string, query, prepQuery, _arg) {
            var allowErrors, baseMatches, matches, query_lw, string_lw, _i, _ref, _results;
            allowErrors = (_arg != null ? _arg : {}).allowErrors;
            if (!string) {
              return [];
            }
            if (!query) {
              return [];
            }
            if (string === query) {
              return function () {
                _results = [];
                for (var _i = 0, _ref = string.length; 0 <= _ref ? _i < _ref : _i > _ref; 0 <= _ref ? _i++ : _i--) {
                  _results.push(_i);
                }
                return _results;
              }.apply(this);
            }
            if (prepQuery == null) {
              prepQuery = prepQueryCache && prepQueryCache.query === query ? prepQueryCache : prepQueryCache = scorer.prepQuery(query);
            }
            if (!(allowErrors || scorer.isMatch(string, prepQuery.core_lw, prepQuery.core_up))) {
              return [];
            }
            string_lw = string.toLowerCase();
            query_lw = prepQuery.query_lw;
            matches = matcher.match(string, string_lw, prepQuery);
            if (matches.length === 0) {
              return matches;
            }
            if (string.indexOf(PathSeparator) > -1) {
              baseMatches = matcher.basenameMatch(string, string_lw, prepQuery);
              matches = matcher.mergeMatches(matches, baseMatches);
            }
            return matches;
          }
        };
      }.call(this));
    },
    {
      './filter': 1,
      './legacy': 3,
      './matcher': 4,
      './scorer': 5,
      'path': 6
    }
  ],
  3: [
    function (require, module, exports) {
      (function () {
        var PathSeparator, queryIsLastPathSegment;
        PathSeparator = require('path').sep;
        exports.basenameScore = function (string, query, score) {
          var base, depth, index, lastCharacter, segmentCount, slashCount;
          index = string.length - 1;
          while (string[index] === PathSeparator) {
            index--;
          }
          slashCount = 0;
          lastCharacter = index;
          base = null;
          while (index >= 0) {
            if (string[index] === PathSeparator) {
              slashCount++;
              if (base == null) {
                base = string.substring(index + 1, lastCharacter + 1);
              }
            } else if (index === 0) {
              if (lastCharacter < string.length - 1) {
                if (base == null) {
                  base = string.substring(0, lastCharacter + 1);
                }
              } else {
                if (base == null) {
                  base = string;
                }
              }
            }
            index--;
          }
          if (base === string) {
            score *= 2;
          } else if (base) {
            score += exports.score(base, query);
          }
          segmentCount = slashCount + 1;
          depth = Math.max(1, 10 - segmentCount);
          score *= depth * 0.01;
          return score;
        };
        exports.score = function (string, query) {
          var character, characterScore, indexInQuery, indexInString, lowerCaseIndex, minIndex, queryLength, queryScore, stringLength, totalCharacterScore, upperCaseIndex, _ref;
          if (string === query) {
            return 1;
          }
          if (queryIsLastPathSegment(string, query)) {
            return 1;
          }
          totalCharacterScore = 0;
          queryLength = query.length;
          stringLength = string.length;
          indexInQuery = 0;
          indexInString = 0;
          while (indexInQuery < queryLength) {
            character = query[indexInQuery++];
            lowerCaseIndex = string.indexOf(character.toLowerCase());
            upperCaseIndex = string.indexOf(character.toUpperCase());
            minIndex = Math.min(lowerCaseIndex, upperCaseIndex);
            if (minIndex === -1) {
              minIndex = Math.max(lowerCaseIndex, upperCaseIndex);
            }
            indexInString = minIndex;
            if (indexInString === -1) {
              return 0;
            }
            characterScore = 0.1;
            if (string[indexInString] === character) {
              characterScore += 0.1;
            }
            if (indexInString === 0 || string[indexInString - 1] === PathSeparator) {
              characterScore += 0.8;
            } else if ((_ref = string[indexInString - 1]) === '-' || _ref === '_' || _ref === ' ') {
              characterScore += 0.7;
            }
            string = string.substring(indexInString + 1, stringLength);
            totalCharacterScore += characterScore;
          }
          queryScore = totalCharacterScore / queryLength;
          return (queryScore * (queryLength / stringLength) + queryScore) / 2;
        };
        queryIsLastPathSegment = function (string, query) {
          if (string[string.length - query.length - 1] === PathSeparator) {
            return string.lastIndexOf(query) === string.length - query.length;
          }
        };
        exports.match = function (string, query, stringOffset) {
          var character, indexInQuery, indexInString, lowerCaseIndex, matches, minIndex, queryLength, stringLength, upperCaseIndex, _i, _ref, _results;
          if (stringOffset == null) {
            stringOffset = 0;
          }
          if (string === query) {
            return function () {
              _results = [];
              for (var _i = stringOffset, _ref = stringOffset + string.length; stringOffset <= _ref ? _i < _ref : _i > _ref; stringOffset <= _ref ? _i++ : _i--) {
                _results.push(_i);
              }
              return _results;
            }.apply(this);
          }
          queryLength = query.length;
          stringLength = string.length;
          indexInQuery = 0;
          indexInString = 0;
          matches = [];
          while (indexInQuery < queryLength) {
            character = query[indexInQuery++];
            lowerCaseIndex = string.indexOf(character.toLowerCase());
            upperCaseIndex = string.indexOf(character.toUpperCase());
            minIndex = Math.min(lowerCaseIndex, upperCaseIndex);
            if (minIndex === -1) {
              minIndex = Math.max(lowerCaseIndex, upperCaseIndex);
            }
            indexInString = minIndex;
            if (indexInString === -1) {
              return [];
            }
            matches.push(stringOffset + indexInString);
            stringOffset += indexInString + 1;
            string = string.substring(indexInString + 1, stringLength);
          }
          return matches;
        };
      }.call(this));
    },
    { 'path': 6 }
  ],
  4: [
    function (require, module, exports) {
      (function () {
        var PathSeparator, scorer;
        PathSeparator = require('path').sep;
        scorer = require('./scorer');
        exports.basenameMatch = function (subject, subject_lw, prepQuery) {
          var basePos, depth, end;
          end = subject.length - 1;
          while (subject[end] === PathSeparator) {
            end--;
          }
          basePos = subject.lastIndexOf(PathSeparator, end);
          if (basePos === -1) {
            return [];
          }
          depth = prepQuery.depth;
          while (depth-- > 0) {
            basePos = subject.lastIndexOf(PathSeparator, basePos - 1);
            if (basePos === -1) {
              return [];
            }
          }
          basePos++;
          end++;
          return exports.match(subject.slice(basePos, end), subject_lw.slice(basePos, end), prepQuery, basePos);
        };
        exports.mergeMatches = function (a, b) {
          var ai, bj, i, j, m, n, out;
          m = a.length;
          n = b.length;
          if (n === 0) {
            return a.slice();
          }
          if (m === 0) {
            return b.slice();
          }
          i = -1;
          j = 0;
          bj = b[j];
          out = [];
          while (++i < m) {
            ai = a[i];
            while (bj <= ai && ++j < n) {
              if (bj < ai) {
                out.push(bj);
              }
              bj = b[j];
            }
            out.push(ai);
          }
          while (j < n) {
            out.push(b[j++]);
          }
          return out;
        };
        exports.match = function (subject, subject_lw, prepQuery, offset) {
          var DIAGONAL, LEFT, STOP, UP, acro_score, align, backtrack, csc_diag, csc_row, csc_score, i, j, m, matches, move, n, pos, query, query_lw, score, score_diag, score_row, score_up, si_lw, start, trace;
          if (offset == null) {
            offset = 0;
          }
          query = prepQuery.query;
          query_lw = prepQuery.query_lw;
          m = subject.length;
          n = query.length;
          acro_score = scorer.scoreAcronyms(subject, subject_lw, query, query_lw).score;
          score_row = new Array(n);
          csc_row = new Array(n);
          STOP = 0;
          UP = 1;
          LEFT = 2;
          DIAGONAL = 3;
          trace = new Array(m * n);
          pos = -1;
          j = -1;
          while (++j < n) {
            score_row[j] = 0;
            csc_row[j] = 0;
          }
          i = -1;
          while (++i < m) {
            score = 0;
            score_up = 0;
            csc_diag = 0;
            si_lw = subject_lw[i];
            j = -1;
            while (++j < n) {
              csc_score = 0;
              align = 0;
              score_diag = score_up;
              if (query_lw[j] === si_lw) {
                start = scorer.isWordStart(i, subject, subject_lw);
                csc_score = csc_diag > 0 ? csc_diag : scorer.scoreConsecutives(subject, subject_lw, query, query_lw, i, j, start);
                align = score_diag + scorer.scoreCharacter(i, j, start, acro_score, csc_score);
              }
              score_up = score_row[j];
              csc_diag = csc_row[j];
              if (score > score_up) {
                move = LEFT;
              } else {
                score = score_up;
                move = UP;
              }
              if (align > score) {
                score = align;
                move = DIAGONAL;
              } else {
                csc_score = 0;
              }
              score_row[j] = score;
              csc_row[j] = csc_score;
              trace[++pos] = score > 0 ? move : STOP;
            }
          }
          i = m - 1;
          j = n - 1;
          pos = i * n + j;
          backtrack = true;
          matches = [];
          while (backtrack && i >= 0 && j >= 0) {
            switch (trace[pos]) {
            case UP:
              i--;
              pos -= n;
              break;
            case LEFT:
              j--;
              pos--;
              break;
            case DIAGONAL:
              matches.push(i + offset);
              j--;
              i--;
              pos -= n + 1;
              break;
            default:
              backtrack = false;
            }
          }
          matches.reverse();
          return matches;
        };
      }.call(this));
    },
    {
      './scorer': 5,
      'path': 6
    }
  ],
  5: [
    function (require, module, exports) {
      (function () {
        var AcronymResult, PathSeparator, Query, basenameScore, coreChars, countDir, doScore, emptyAcronymResult, file_coeff, isMatch, isSeparator, isWordEnd, isWordStart, miss_coeff, opt_char_re, pos_bonus, scoreAcronyms, scoreCharacter, scoreConsecutives, scoreExact, scoreExactMatch, scorePattern, scorePosition, scoreSize, tau_depth, tau_size, truncatedUpperCase, wm;
        PathSeparator = require('path').sep;
        wm = 150;
        pos_bonus = 20;
        tau_depth = 13;
        tau_size = 85;
        file_coeff = 1.2;
        miss_coeff = 0.75;
        opt_char_re = /[ _\-:\/\\]/g;
        exports.coreChars = coreChars = function (query) {
          return query.replace(opt_char_re, '');
        };
        exports.score = function (string, query, prepQuery, allowErrors) {
          var score, string_lw;
          if (prepQuery == null) {
            prepQuery = new Query(query);
          }
          if (allowErrors == null) {
            allowErrors = false;
          }
          if (!(allowErrors || isMatch(string, prepQuery.core_lw, prepQuery.core_up))) {
            return 0;
          }
          string_lw = string.toLowerCase();
          score = doScore(string, string_lw, prepQuery);
          return Math.ceil(basenameScore(string, string_lw, prepQuery, score));
        };
        Query = function () {
          function Query(query) {
            if (!(query != null ? query.length : void 0)) {
              return null;
            }
            this.query = query;
            this.query_lw = query.toLowerCase();
            this.core = coreChars(query);
            this.core_lw = this.core.toLowerCase();
            this.core_up = truncatedUpperCase(this.core);
            this.depth = countDir(query, query.length);
          }
          return Query;
        }();
        exports.prepQuery = function (query) {
          return new Query(query);
        };
        exports.isMatch = isMatch = function (subject, query_lw, query_up) {
          var i, j, m, n, qj_lw, qj_up, si;
          m = subject.length;
          n = query_lw.length;
          if (!m || n > m) {
            return false;
          }
          i = -1;
          j = -1;
          while (++j < n) {
            qj_lw = query_lw[j];
            qj_up = query_up[j];
            while (++i < m) {
              si = subject[i];
              if (si === qj_lw || si === qj_up) {
                break;
              }
            }
            if (i === m) {
              return false;
            }
          }
          return true;
        };
        doScore = function (subject, subject_lw, prepQuery) {
          var acro, acro_score, align, csc_diag, csc_row, csc_score, i, j, m, miss_budget, miss_left, mm, n, pos, query, query_lw, record_miss, score, score_diag, score_row, score_up, si_lw, start, sz;
          query = prepQuery.query;
          query_lw = prepQuery.query_lw;
          m = subject.length;
          n = query.length;
          acro = scoreAcronyms(subject, subject_lw, query, query_lw);
          acro_score = acro.score;
          if (acro.count === n) {
            return scoreExact(n, m, acro_score, acro.pos);
          }
          pos = subject_lw.indexOf(query_lw);
          if (pos > -1) {
            return scoreExactMatch(subject, subject_lw, query, query_lw, pos, n, m);
          }
          score_row = new Array(n);
          csc_row = new Array(n);
          sz = scoreSize(n, m);
          miss_budget = Math.ceil(miss_coeff * n) + 5;
          miss_left = miss_budget;
          j = -1;
          while (++j < n) {
            score_row[j] = 0;
            csc_row[j] = 0;
          }
          i = subject_lw.indexOf(query_lw[0]);
          if (i > -1) {
            i--;
          }
          mm = subject_lw.lastIndexOf(query_lw[n - 1], m);
          if (mm > i) {
            m = mm + 1;
          }
          while (++i < m) {
            score = 0;
            score_diag = 0;
            csc_diag = 0;
            si_lw = subject_lw[i];
            record_miss = true;
            j = -1;
            while (++j < n) {
              score_up = score_row[j];
              if (score_up > score) {
                score = score_up;
              }
              csc_score = 0;
              if (query_lw[j] === si_lw) {
                start = isWordStart(i, subject, subject_lw);
                csc_score = csc_diag > 0 ? csc_diag : scoreConsecutives(subject, subject_lw, query, query_lw, i, j, start);
                align = score_diag + scoreCharacter(i, j, start, acro_score, csc_score);
                if (align > score) {
                  score = align;
                  miss_left = miss_budget;
                } else {
                  if (record_miss && --miss_left <= 0) {
                    return score_row[n - 1] * sz;
                  }
                  record_miss = false;
                }
              }
              score_diag = score_up;
              csc_diag = csc_row[j];
              csc_row[j] = csc_score;
              score_row[j] = score;
            }
          }
          return score * sz;
        };
        exports.isWordStart = isWordStart = function (pos, subject, subject_lw) {
          var curr_s, prev_s;
          if (pos === 0) {
            return true;
          }
          curr_s = subject[pos];
          prev_s = subject[pos - 1];
          return isSeparator(curr_s) || isSeparator(prev_s) || curr_s !== subject_lw[pos] && prev_s === subject_lw[pos - 1];
        };
        exports.isWordEnd = isWordEnd = function (pos, subject, subject_lw, len) {
          var curr_s, next_s;
          if (pos === len - 1) {
            return true;
          }
          curr_s = subject[pos];
          next_s = subject[pos + 1];
          return isSeparator(curr_s) || isSeparator(next_s) || curr_s === subject_lw[pos] && next_s !== subject_lw[pos + 1];
        };
        isSeparator = function (c) {
          return c === ' ' || c === '.' || c === '-' || c === '_' || c === '/' || c === '\\';
        };
        scorePosition = function (pos) {
          var sc;
          if (pos < pos_bonus) {
            sc = pos_bonus - pos;
            return 100 + sc * sc;
          } else {
            return Math.max(100 + pos_bonus - pos, 0);
          }
        };
        scoreSize = function (n, m) {
          return tau_size / (tau_size + Math.abs(m - n));
        };
        scoreExact = function (n, m, quality, pos) {
          return 2 * n * (wm * quality + scorePosition(pos)) * scoreSize(n, m);
        };
        exports.scorePattern = scorePattern = function (count, len, sameCase, start, end) {
          var bonus, sz;
          sz = count;
          bonus = 6;
          if (sameCase === count) {
            bonus += 2;
          }
          if (start) {
            bonus += 3;
          }
          if (end) {
            bonus += 1;
          }
          if (count === len) {
            if (start) {
              if (sameCase === len) {
                sz += 2;
              } else {
                sz += 1;
              }
            }
            if (end) {
              bonus += 1;
            }
          }
          return sameCase + sz * (sz + bonus);
        };
        exports.scoreCharacter = scoreCharacter = function (i, j, start, acro_score, csc_score) {
          var posBonus;
          posBonus = scorePosition(i);
          if (start) {
            return posBonus + wm * ((acro_score > csc_score ? acro_score : csc_score) + 10);
          }
          return posBonus + wm * csc_score;
        };
        exports.scoreConsecutives = scoreConsecutives = function (subject, subject_lw, query, query_lw, i, j, start) {
          var k, m, mi, n, nj, sameCase, startPos, sz;
          m = subject.length;
          n = query.length;
          mi = m - i;
          nj = n - j;
          k = mi < nj ? mi : nj;
          startPos = i;
          sameCase = 0;
          sz = 0;
          if (query[j] === subject[i]) {
            sameCase++;
          }
          while (++sz < k && query_lw[++j] === subject_lw[++i]) {
            if (query[j] === subject[i]) {
              sameCase++;
            }
          }
          if (sz === 1) {
            return 1 + 2 * sameCase;
          }
          return scorePattern(sz, n, sameCase, start, isWordEnd(i, subject, subject_lw, m));
        };
        exports.scoreExactMatch = scoreExactMatch = function (subject, subject_lw, query, query_lw, pos, n, m) {
          var end, i, pos2, sameCase, start;
          start = isWordStart(pos, subject, subject_lw);
          if (!start) {
            pos2 = subject_lw.indexOf(query_lw, pos + 1);
            if (pos2 > -1) {
              start = isWordStart(pos2, subject, subject_lw);
              if (start) {
                pos = pos2;
              }
            }
          }
          i = -1;
          sameCase = 0;
          while (++i < n) {
            if (query[pos + i] === subject[i]) {
              sameCase++;
            }
          }
          end = isWordEnd(pos + n - 1, subject, subject_lw, m);
          return scoreExact(n, m, scorePattern(n, n, sameCase, start, end), pos);
        };
        AcronymResult = function () {
          function AcronymResult(score, pos, count) {
            this.score = score;
            this.pos = pos;
            this.count = count;
          }
          return AcronymResult;
        }();
        emptyAcronymResult = new AcronymResult(0, 0.1, 0);
        exports.scoreAcronyms = scoreAcronyms = function (subject, subject_lw, query, query_lw) {
          var count, i, j, m, n, pos, qj_lw, sameCase, score;
          m = subject.length;
          n = query.length;
          if (!(m > 1 && n > 1)) {
            return emptyAcronymResult;
          }
          count = 0;
          pos = 0;
          sameCase = 0;
          i = -1;
          j = -1;
          while (++j < n) {
            qj_lw = query_lw[j];
            while (++i < m) {
              if (qj_lw === subject_lw[i] && isWordStart(i, subject, subject_lw)) {
                if (query[j] === subject[i]) {
                  sameCase++;
                }
                pos += i;
                count++;
                break;
              }
            }
            if (i === m) {
              break;
            }
          }
          if (count < 2) {
            return emptyAcronymResult;
          }
          score = scorePattern(count, n, sameCase, true, false);
          return new AcronymResult(score, pos / count, count);
        };
        basenameScore = function (subject, subject_lw, prepQuery, fullPathScore) {
          var alpha, basePathScore, basePos, depth, end;
          if (fullPathScore === 0) {
            return 0;
          }
          end = subject.length - 1;
          while (subject[end] === PathSeparator) {
            end--;
          }
          basePos = subject.lastIndexOf(PathSeparator, end);
          if (basePos === -1) {
            return fullPathScore;
          }
          depth = prepQuery.depth;
          while (depth-- > 0) {
            basePos = subject.lastIndexOf(PathSeparator, basePos - 1);
            if (basePos === -1) {
              return fullPathScore;
            }
          }
          basePos++;
          end++;
          basePathScore = doScore(subject.slice(basePos, end), subject_lw.slice(basePos, end), prepQuery);
          alpha = 0.5 * tau_depth / (tau_depth + countDir(subject, end + 1));
          return alpha * basePathScore + (1 - alpha) * fullPathScore * scoreSize(0, file_coeff * (end - basePos));
        };
        exports.countDir = countDir = function (path, end) {
          var count, i;
          if (end < 1) {
            return 0;
          }
          count = 0;
          i = -1;
          while (++i < end && path[i] === PathSeparator) {
            continue;
          }
          while (++i < end) {
            if (path[i] === PathSeparator) {
              count++;
              while (++i < end && path[i] === PathSeparator) {
                continue;
              }
            }
          }
          return count;
        };
        truncatedUpperCase = function (str) {
          var char, upper, _i, _len;
          upper = '';
          for (_i = 0, _len = str.length; _i < _len; _i++) {
            char = str[_i];
            upper += char.toUpperCase()[0];
          }
          return upper;
        };
      }.call(this));
    },
    { 'path': 6 }
  ],
  6: [
    function (require, module, exports) {
      (function (process) {
        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.
        // resolves . and .. elements in a path array with directory names there
        // must be no slashes, empty elements, or device names (c:\) in the array
        // (so also no leading and trailing slashes - it does not distinguish
        // relative and absolute paths)
        function normalizeArray(parts, allowAboveRoot) {
          // if the path tries to go above the root, `up` ends up > 0
          var up = 0;
          for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === '.') {
              parts.splice(i, 1);
            } else if (last === '..') {
              parts.splice(i, 1);
              up++;
            } else if (up) {
              parts.splice(i, 1);
              up--;
            }
          }
          // if the path is allowed to go above the root, restore leading ..s
          if (allowAboveRoot) {
            for (; up--; up) {
              parts.unshift('..');
            }
          }
          return parts;
        }
        // Split a filename into [root, dir, basename, ext], unix version
        // 'root' is just a slash, or nothing.
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        var splitPath = function (filename) {
          return splitPathRe.exec(filename).slice(1);
        };
        // path.resolve([from ...], to)
        // posix version
        exports.resolve = function () {
          var resolvedPath = '', resolvedAbsolute = false;
          for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
            var path = i >= 0 ? arguments[i] : process.cwd();
            // Skip empty and invalid entries
            if (typeof path !== 'string') {
              throw new TypeError('Arguments to path.resolve must be strings');
            } else if (!path) {
              continue;
            }
            resolvedPath = path + '/' + resolvedPath;
            resolvedAbsolute = path.charAt(0) === '/';
          }
          // At this point the path should be resolved to a full absolute path, but
          // handle relative paths to be safe (might happen when process.cwd() fails)
          // Normalize the path
          resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function (p) {
            return !!p;
          }), !resolvedAbsolute).join('/');
          return (resolvedAbsolute ? '/' : '') + resolvedPath || '.';
        };
        // path.normalize(path)
        // posix version
        exports.normalize = function (path) {
          var isAbsolute = exports.isAbsolute(path), trailingSlash = substr(path, -1) === '/';
          // Normalize the path
          path = normalizeArray(filter(path.split('/'), function (p) {
            return !!p;
          }), !isAbsolute).join('/');
          if (!path && !isAbsolute) {
            path = '.';
          }
          if (path && trailingSlash) {
            path += '/';
          }
          return (isAbsolute ? '/' : '') + path;
        };
        // posix version
        exports.isAbsolute = function (path) {
          return path.charAt(0) === '/';
        };
        // posix version
        exports.join = function () {
          var paths = Array.prototype.slice.call(arguments, 0);
          return exports.normalize(filter(paths, function (p, index) {
            if (typeof p !== 'string') {
              throw new TypeError('Arguments to path.join must be strings');
            }
            return p;
          }).join('/'));
        };
        // path.relative(from, to)
        // posix version
        exports.relative = function (from, to) {
          from = exports.resolve(from).substr(1);
          to = exports.resolve(to).substr(1);
          function trim(arr) {
            var start = 0;
            for (; start < arr.length; start++) {
              if (arr[start] !== '')
                break;
            }
            var end = arr.length - 1;
            for (; end >= 0; end--) {
              if (arr[end] !== '')
                break;
            }
            if (start > end)
              return [];
            return arr.slice(start, end - start + 1);
          }
          var fromParts = trim(from.split('/'));
          var toParts = trim(to.split('/'));
          var length = Math.min(fromParts.length, toParts.length);
          var samePartsLength = length;
          for (var i = 0; i < length; i++) {
            if (fromParts[i] !== toParts[i]) {
              samePartsLength = i;
              break;
            }
          }
          var outputParts = [];
          for (var i = samePartsLength; i < fromParts.length; i++) {
            outputParts.push('..');
          }
          outputParts = outputParts.concat(toParts.slice(samePartsLength));
          return outputParts.join('/');
        };
        exports.sep = '/';
        exports.delimiter = ':';
        exports.dirname = function (path) {
          var result = splitPath(path), root = result[0], dir = result[1];
          if (!root && !dir) {
            // No dirname whatsoever
            return '.';
          }
          if (dir) {
            // It has a dirname, strip trailing slash
            dir = dir.substr(0, dir.length - 1);
          }
          return root + dir;
        };
        exports.basename = function (path, ext) {
          var f = splitPath(path)[2];
          // TODO: make this comparison case-insensitive on windows?
          if (ext && f.substr(-1 * ext.length) === ext) {
            f = f.substr(0, f.length - ext.length);
          }
          return f;
        };
        exports.extname = function (path) {
          return splitPath(path)[3];
        };
        function filter(xs, f) {
          if (xs.filter)
            return xs.filter(f);
          var res = [];
          for (var i = 0; i < xs.length; i++) {
            if (f(xs[i], i, xs))
              res.push(xs[i]);
          }
          return res;
        }
        // String.prototype.substr - negative index don't work in IE8
        var substr = 'ab'.substr(-1) === 'b' ? function (str, start, len) {
            return str.substr(start, len);
          } : function (str, start, len) {
            if (start < 0)
              start = str.length + start;
            return str.substr(start, len);
          };
        ;
      }.call(this, require('_process')));
    },
    { '_process': 7 }
  ],
  7: [
    function (require, module, exports) {
      // shim for using process in browser
      var process = module.exports = {};
      // cached from whatever global is present so that test runners that stub it
      // don't break things.  But we need to wrap it in a try catch in case it is
      // wrapped in strict mode code which doesn't define any globals.  It's inside a
      // function because try/catches deoptimize in certain engines.
      var cachedSetTimeout;
      var cachedClearTimeout;
      function defaultSetTimout() {
        throw new Error('setTimeout has not been defined');
      }
      function defaultClearTimeout() {
        throw new Error('clearTimeout has not been defined');
      }
      (function () {
        try {
          if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
          } else {
            cachedSetTimeout = defaultSetTimout;
          }
        } catch (e) {
          cachedSetTimeout = defaultSetTimout;
        }
        try {
          if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
          } else {
            cachedClearTimeout = defaultClearTimeout;
          }
        } catch (e) {
          cachedClearTimeout = defaultClearTimeout;
        }
      }());
      function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
          //normal enviroments in sane situations
          return setTimeout(fun, 0);
        }
        // if setTimeout wasn't available but was latter defined
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
          cachedSetTimeout = setTimeout;
          return setTimeout(fun, 0);
        }
        try {
          // when when somebody has screwed with setTimeout but no I.E. maddness
          return cachedSetTimeout(fun, 0);
        } catch (e) {
          try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
          } catch (e) {
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
          }
        }
      }
      function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
          //normal enviroments in sane situations
          return clearTimeout(marker);
        }
        // if clearTimeout wasn't available but was latter defined
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
          cachedClearTimeout = clearTimeout;
          return clearTimeout(marker);
        }
        try {
          // when when somebody has screwed with setTimeout but no I.E. maddness
          return cachedClearTimeout(marker);
        } catch (e) {
          try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
          } catch (e) {
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
          }
        }
      }
      var queue = [];
      var draining = false;
      var currentQueue;
      var queueIndex = -1;
      function cleanUpNextTick() {
        if (!draining || !currentQueue) {
          return;
        }
        draining = false;
        if (currentQueue.length) {
          queue = currentQueue.concat(queue);
        } else {
          queueIndex = -1;
        }
        if (queue.length) {
          drainQueue();
        }
      }
      function drainQueue() {
        if (draining) {
          return;
        }
        var timeout = runTimeout(cleanUpNextTick);
        draining = true;
        var len = queue.length;
        while (len) {
          currentQueue = queue;
          queue = [];
          while (++queueIndex < len) {
            if (currentQueue) {
              currentQueue[queueIndex].run();
            }
          }
          queueIndex = -1;
          len = queue.length;
        }
        currentQueue = null;
        draining = false;
        runClearTimeout(timeout);
      }
      process.nextTick = function (fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
          for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
          }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
          runTimeout(drainQueue);
        }
      };
      // v8 likes predictible objects
      function Item(fun, array) {
        this.fun = fun;
        this.array = array;
      }
      Item.prototype.run = function () {
        this.fun.apply(null, this.array);
      };
      process.title = 'browser';
      process.browser = true;
      process.env = {};
      process.argv = [];
      process.version = '';
      // empty string to avoid regexp issues
      process.versions = {};
      function noop() {
      }
      process.on = noop;
      process.addListener = noop;
      process.once = noop;
      process.off = noop;
      process.removeListener = noop;
      process.removeAllListeners = noop;
      process.emit = noop;
      process.binding = function (name) {
        throw new Error('process.binding is not supported');
      };
      process.cwd = function () {
        return '/';
      };
      process.chdir = function (dir) {
        throw new Error('process.chdir is not supported');
      };
      process.umask = function () {
        return 0;
      };
    },
    {}
  ],
  8: [
    function (require, module, exports) {
      window['RAML'] = window['RAML'] || {};
      window['RAML'].Suggestions = require('./index');
    },
    { './index': 10 }
  ],
  9: [
    function (require, module, exports) {
      'use strict';
      /// <reference path="../typings/main.d.ts" />
      var parserApi = window.RAML.Parser;
      var def = parserApi.ds;
      var search = parserApi.search;
      var universeModule = parserApi.universes;
      var universeHelpers = parserApi.universeHelpers;
      var services = def;
      var _ = require('underscore');
      var categories = require('../resources/categories.json');
      var CompletionRequest = function () {
          function CompletionRequest(content) {
            this.async = false;
            this.content = content;
          }
          CompletionRequest.prototype.prefix = function () {
            if (typeof this.prefixValue !== 'undefined') {
              return this.prefixValue;
            }
            return getPrefix(this);
          };
          CompletionRequest.prototype.setPrefix = function (value) {
            this.prefixValue = value;
          };
          CompletionRequest.prototype.valuePrefix = function () {
            var offset = this.content.getOffset();
            var text = this.content.getText();
            for (var i = offset - 1; i >= 0; i--) {
              var c = text.charAt(i);
              if (c === '\r' || c === '\n' || c === ' ' || c === '\t' || c === '"' || c === '\'' || c === ':' || c === '(') {
                return text.substring(i + 1, offset);
              }
            }
            return '';
          };
          return CompletionRequest;
        }();
      exports.CompletionRequest = CompletionRequest;
      var CompletionProvider = function () {
          function CompletionProvider(contentProvider) {
            this.currentRequest = null;
            this.level = 0;
            this.contentProvider = contentProvider;
          }
          CompletionProvider.prototype.suggest = function (request, doPostProcess) {
            if (doPostProcess === void 0) {
              doPostProcess = false;
            }
            var suggestions = doSuggest(request, this);
            return doPostProcess ? postProcess(suggestions, request) : suggestions;
          };
          CompletionProvider.prototype.suggestAsync = function (request, doPostProcess) {
            if (doPostProcess === void 0) {
              doPostProcess = false;
            }
            return doSuggestAsync(request, this).then(function (suggestions) {
              return doPostProcess ? postProcess(suggestions, request) : suggestions;
            }, function (error) {
              return error;
            });
          };
          return CompletionProvider;
        }();
      exports.CompletionProvider = CompletionProvider;
      function suggest(editorState, fsProvider) {
        var completionRequest = new CompletionRequest(editorState);
        var completionProvider = new CompletionProvider(fsProvider);
        return completionProvider.suggest(completionRequest, true);
      }
      exports.suggest = suggest;
      function suggestAsync(editorState, fsProvider) {
        var completionRequest = new CompletionRequest(editorState);
        var completionProvider = new CompletionProvider(fsProvider);
        return completionProvider.suggestAsync(completionRequest, true);
      }
      exports.suggestAsync = suggestAsync;
      function categoryByRanges(suggestion, parentRange, propertyRange) {
        var categoryNames = Object.keys(categories);
        for (var i = 0; i < categoryNames.length; i++) {
          var categoryName = categoryNames[i];
          var issues = Object.keys(categories[categoryName]);
          for (var j = 0; j < issues.length; j++) {
            var issueName = issues[j];
            if (issueName !== suggestion) {
              continue;
            }
            var issue = categories[categoryName][issueName];
            var propertyIs = issue.is || [];
            var parentIs = issue.parentIs || [];
            if (propertyRange && _.find(propertyIs, function (name) {
                return isRangeAssignable(propertyRange, name);
              })) {
              return categoryName;
            }
            if (parentRange && _.find(parentIs, function (name) {
                return isRangeAssignable(parentRange, name);
              })) {
              return categoryName;
            }
          }
        }
        return 'unknown';
      }
      function isRangeAssignable(type, defCode) {
        var keys = defCode.split('.');
        var defObject = parserApi.universes;
        for (var i = 0; i < keys.length; i++) {
          defObject = defObject[keys[i]];
        }
        return type.isAssignableFrom(defObject.name);
      }
      function doSuggest(request, provider) {
        var result = getSuggestions(request, provider);
        if (result)
          return result;
        return [];
      }
      function doSuggestAsync(request, provider) {
        request.async = true;
        request.promises = [];
        var apiPromise = parserApi.parseRAML(modifiedContent(request), {
            fsResolver: provider.contentProvider.fsResolver,
            filePath: request.content.getPath()
          });
        var suggestionsPromise = apiPromise.then(function (api) {
            return getSuggestions(request, provider, findAtOffsetInNode(request.content.getOffset(), api.highLevel()));
          });
        var requestSuggestionsPromise = suggestionsPromise.then(function (suggestions) {
            return Promise.all([suggestions].concat(request.promises));
          });
        var finalPromise = requestSuggestionsPromise.then(function (arrays) {
            var result = [];
            arrays.forEach(function (suggestions) {
              result = result.concat(suggestions);
            });
            return result;
          });
        return finalPromise;
      }
      function getSuggestions(request, provider, preParsedAst, project) {
        if (preParsedAst === void 0) {
          preParsedAst = undefined;
        }
        provider.currentRequest = request;
        try {
          if (provider.level > 100) {
            return;
          }
          provider.level++;
          var offset = request.content.getOffset();
          var text = request.content.getText();
          var kind = completionKind(request);
          var node = preParsedAst ? preParsedAst : getAstNode(request, provider.contentProvider, true, true, project);
          var hlnode = node;
          if (kind === parserApi.search.LocationKind.DIRECTIVE_COMPLETION) {
            return [{ text: 'include' }];
          }
          if (kind === parserApi.search.LocationKind.ANNOTATION_COMPLETION) {
            var declarations = parserApi.search.globalDeclarations(hlnode).filter(function (x) {
                return parserApi.universeHelpers.isAnnotationTypesProperty(x.property());
              });
            return declarations.map(function (x) {
              return {
                text: parserApi.search.qName(x, hlnode),
                annotation: true
              };
            });
          }
          if (kind === parserApi.search.LocationKind.VERSION_COMPLETION) {
            return ramlVersionCompletion(request);
          }
          if (kind === parserApi.search.LocationKind.INCOMMENT) {
            return [];
          }
          if (node === null) {
            return [];
          }
          var hasNewLine = false;
          for (var position = offset - 1; position >= hlnode.lowLevel().start(); position--) {
            var ch = text[position];
            if (ch == '\r' || ch == '\n') {
              hasNewLine = true;
              break;
            }
          }
          var cmi = offset;
          for (var pm = offset - 1; pm >= 0; pm--) {
            var c = text[pm];
            if (c === ' ' || c === '\t') {
              cmi = pm;
              continue;
            }
            break;
          }
          var attr = _.find(hlnode.attrs(), function (x) {
              return x.lowLevel().start() < cmi && x.lowLevel().end() >= cmi && !x.property().getAdapter(parserApi.ds.RAMLPropertyService).isKey();
            });
          if (!attr) {
            var p = _.find(hlnode.definition().allProperties(), function (p) {
                return p.canBeValue();
              });
            if (!hasNewLine) {
              if (p && kind == parserApi.search.LocationKind.VALUE_COMPLETION && parserApi.universeHelpers.isTypeProperty(p)) {
                if (hlnode.children().length == 1) {
                  attr = parserApi.stubs.createASTPropImpl(hlnode.lowLevel(), hlnode, p.range(), p);
                }
              }
            } else {
              var cm = _.find(hlnode.lowLevel().children(), function (x) {
                  return x.start() < offset && x.end() >= offset;
                });
              if (cm) {
                var p = _.find(hlnode.definition().allProperties(), function (p) {
                    return p.nameId() == cm.key();
                  });
                if (p) {
                  var il = getIndent(cm.keyStart(), cm.unit().contents());
                  var il2 = getIndent(offset, cm.unit().contents());
                  if (il2.length > il.length + 1) {
                    var isValue = p.range().hasValueTypeInHierarchy();
                    if (isValue) {
                      attr = parserApi.stubs.createVirtualASTPropImpl(cm, hlnode, p.range(), p);
                    } else {
                      if (cm.children().length > 0) {
                        hlnode = parserApi.stubs.createVirtualNodeImpl(cm.children()[0], hlnode, p.range(), p);
                      }
                    }
                  }
                }
              }
            }
          }
          if (kind == parserApi.search.LocationKind.PATH_COMPLETION) {
            return pathCompletion(request, provider.contentProvider, attr, hlnode, false);
          }
          if (attr && (kind === parserApi.search.LocationKind.KEY_COMPLETION || kind === parserApi.search.LocationKind.SEQUENCE_KEY_COPLETION)) {
            var txt = '';
            for (var position = offset - 1; position >= 0; position--) {
              var ch = text[position];
              if (ch == '\r' || ch == '\n') {
                break;
              }
              txt = ch + txt;
            }
            txt = txt.trim();
            if (txt != attr.name()) {
              kind = parserApi.search.LocationKind.VALUE_COMPLETION;
            }
          }
          if (kind == parserApi.search.LocationKind.VALUE_COMPLETION) {
            var parentPropertyOfAttr = attr && attr.parent && attr.parent() && attr.parent().property && attr.parent().property();
            if (parentPropertyOfAttr && universeHelpers.isUsesProperty(parentPropertyOfAttr)) {
              return pathCompletion(request, provider.contentProvider, attr, hlnode, false);
            }
            var proposals = valueCompletion(node, attr, request, provider);
            if (!attr) {
              if (!proposals || proposals.length == 0) {
                if (!hasNewLine) {
                  if (hlnode.definition().getAdapter(parserApi.ds.RAMLService).isUserDefined()) {
                    return propertyCompletion(hlnode, request, mv, defNode, hasNewLine);
                  }
                }
              }
            }
            if (attr && attr.property() && (attr.property().getAdapter(parserApi.ds.RAMLPropertyService).isTypeExpr() || attr.property().isAnnotation())) {
              if (!proposals) {
                proposals = [];
              }
              proposals = proposals.filter(function (x) {
                var proposalText = getProposalText(x);
                if (proposalText === hlnode.name()) {
                  return false;
                }
                return true;
              });
              var pref = request.valuePrefix();
              var nmi = pref.lastIndexOf('.');
              if (nmi) {
                pref = pref.substr(0, nmi + 1);
              } else {
                pref = null;
              }
              if (pref) {
                proposals = proposals.filter(function (x) {
                  return getProposalText(x).indexOf(pref) == 0;
                });
                proposals.forEach(function (x) {
                  return updateProposalText(x, getProposalText(x).substring(pref.length));
                });
              }
            }
            if (proposals) {
              if (text[offset - 1] == ':') {
                proposals.forEach(function (x) {
                  if (x.extra) {
                    x.extra = ' ' + x.extra;
                  } else {
                    x.extra = ' ';
                  }
                });
              }
              if (request.prefix().indexOf('[') != -1) {
                request.setPrefix('');
                proposals.forEach(function (x) {
                  x.text = ': [ ' + x.displayText;
                });
              } else if (isSquareBracketExpected(attr)) {
                proposals = proposals.filter(function (proposed) {
                  return !isSiblingExists(attr, proposed.displayText);
                });
                var ending = '';
                var initialPosition = offset;
                for (var i = initialPosition; i < text.length && !/[\t\n\r]/.test(text[i]); i++) {
                  ending += text[i];
                  if (ending.replace(/\s/g, '') === ':') {
                    proposals.forEach(function (x) {
                      x.text = x.displayText;
                      x.snippet = null;
                      x.extra = null;
                    });
                    break;
                  }
                }
                var isOpenSquarePresent = false;
                initialPosition = offset - 1;
                for (var i = initialPosition; i >= 0 && !/[\t\n\r]/.test(text[i]); i--) {
                  if (text[i] === '[') {
                    isOpenSquarePresent = true;
                    break;
                  }
                }
                if (!isOpenSquarePresent) {
                  proposals.forEach(function (x) {
                    if (!request.valuePrefix() && x.snippet) {
                      x.text = x.displayText;
                      x.snippet = '[' + x.snippet + ']';
                      return;
                    }
                    x.extra = ' [';
                    x.text = (x.snippet || x.displayText) + ']';
                    x.snippet = null;
                  });
                }
              } else {
                var ending = '';
                var initialPosition = offset;
                for (var i = initialPosition; i < text.length && !/[\t\n\r]/.test(text[i]); i++) {
                  ending += text[i];
                  if (ending.replace(/\s/g, '') === ':') {
                    proposals.forEach(function (x) {
                      x.text = x.displayText;
                      x.snippet = null;
                      x.extra = null;
                    });
                    break;
                  }
                }
                proposals.forEach(function (x) {
                  if (x.isResourceType && !request.valuePrefix() && x.snippet) {
                    x.snippet = x.extra + x.snippet;
                    x.extra = null;
                    x.text = x.displayText;
                  }
                });
              }
            }
            if (!hasNewLine && proposals && proposals.length > 0) {
              proposals = addDefineInlineProposal2(proposals, hlnode.lowLevel().start(), text);
            }
            if (proposals && isInResourceDescription(attr) && request.prefix() && request.prefix().length > 0) {
              var canBeTemplate = false;
              var canBeTransform1 = 0;
              var canBeTransform2 = 0;
              var txt = '';
              for (var position = offset - 1; position >= 0; position--) {
                var ch = text[position];
                if (ch === '\r' || ch === '\n') {
                  break;
                }
                if (ch === '<' && text[position - 1] === '<') {
                  canBeTemplate = true;
                  break;
                }
                if (ch === '!') {
                  canBeTransform1++;
                }
                if (ch === '|' && canBeTransform1 === 1) {
                  canBeTransform2++;
                }
                txt = ch + txt;
              }
              if (canBeTemplate && canBeTransform1 === 1 && canBeTransform2 === 1) {
                var leftPart = new RegExp(/\|\s*!\s*/.source + request.prefix());
                if (leftPart.test(txt)) {
                  proposals = addTransformers(proposals, request.prefix());
                }
              }
            }
            return proposals;
          }
          if (kind == search.LocationKind.KEY_COMPLETION || kind == search.LocationKind.SEQUENCE_KEY_COPLETION && offset > 0 && text.charAt(offset - 1) != '-' && text.charAt(offset - 1) != ' ') {
            if (node.isAttr() || node.isImplicit()) {
              throw new Error('Should be highlevel node at this place');
            }
            if (search.isExampleNode(hlnode)) {
              return examplePropertyCompletion(hlnode, request, provider);
            }
            if (hlnode.property() && universeHelpers.isUriParametersProperty(hlnode.property()) && hlnode.definition() instanceof def.NodeClass) {
              var nm = hlnode.parent().attr('relativeUri');
              if (nm && hlnode.name().substring(0, hlnode.name().length - 1) == request.valuePrefix()) {
                var runtime = parserApi.utils.parseUrl(nm.value());
                if (runtime instanceof Array) {
                  if (runtime) {
                    if (isColonNeeded(offset, text)) {
                      var rs = runtime.map(function (x) {
                          return { text: x + ': \n' + getIndent2(offset, text) + '  ' };
                        });
                    } else {
                      var rs = runtime.map(function (x) {
                          return { text: x };
                        });
                    }
                    return rs;
                  }
                }
              }
            }
            if (hlnode.property() && universeHelpers.isBaseUriParametersProperty(hlnode.property()) && hlnode.definition() instanceof def.NodeClass) {
              var nm = hlnode.root().attr(universeModule.Universe10.Api.properties.baseUri.name);
              if (nm && hlnode.name().substring(0, hlnode.name().length - 1) == request.valuePrefix()) {
                var runtime = parserApi.utils.parseUrl(nm.value());
                if (runtime instanceof Array) {
                  if (runtime) {
                    if (isColonNeeded(offset, text)) {
                      var rs = runtime.map(function (x) {
                          return { text: x + ': \n' + getIndent2(offset, text) + '  ' };
                        });
                    } else {
                      var rs = runtime.map(function (x) {
                          return { text: x };
                        });
                    }
                    return rs;
                  }
                }
              }
            }
            //FIXME It still should be improved
            if (hlnode.property() && universeHelpers.isResourcesProperty(hlnode.property())) {
              var nm = hlnode.attr('relativeUri');
              if (nm && hlnode.name().substring(0, hlnode.name().length - 1) == request.valuePrefix()) {
                if (nm && nm.value().indexOf('{') != -1) {
                  return [{ text: 'mediaTypeExtension}' }];
                }
                return [];
              }
            }
            var mv = hlnode.property() && hlnode.property().isMultiValue();
            if (hlnode.lowLevel().keyEnd() < offset) {
              mv = false;
            }
            //extra test /*FIXME*/
            var defNode = true;
            if (mv) {
              var ce = hlnode.definition().getAdapter(services.RAMLService).getCanInherit();
              if (ce) {
                var context = hlnode.computedValue(ce[0]);
                if (context) {
                  defNode = true;
                  mv = false;
                }
              }
            }
            return propertyCompletion(hlnode, request, mv, defNode);
          }
          return [];
        } finally {
          provider.level--;
        }  //return [];
      }
      function ramlVersionCompletion(request) {
        var prop = [
            'RAML 0.8',
            'RAML 1.0'
          ];
        var rs = [];
        var text = request.content.getText();
        var offset = request.content.getOffset();
        var start = text.substr(0, offset);
        if (start.indexOf('#%RAML 1.0 ') == 0) {
          var list = [
              'DocumentationItem',
              'DataType',
              'NamedExample',
              'ResourceType',
              'Trait',
              'SecurityScheme',
              'AnnotationTypeDeclaration',
              'Library',
              'Overlay',
              'Extension'
            ];
          return list.map(function (x) {
            return { text: x };
          });
        }
        prop.forEach(function (x) {
          if (('#%' + x).indexOf(start) != 0) {
            return;
          }
          if (text.trim().indexOf('#%') == 0) {
            if (request.prefix().indexOf('R') != -1) {
              rs.push({
                displayText: x,
                text: x
              });
            } else {
              var pref = text.substring(2, offset);
              if (x.indexOf(pref) == 0) {
                if (request.prefix() == '1' || request.prefix() == '0') {
                  rs.push({
                    displayText: x,
                    text: request.prefix() + x.substr(offset - 2)
                  });
                } else {
                  rs.push({
                    displayText: x,
                    text: x.substr(offset - 2)
                  });
                }
              }
            }
          } else {
            rs.push({
              displayText: x,
              text: x,
              extra: '%'
            });
          }
        });
        return rs;
      }
      ;
      function completionKind(request) {
        return parserApi.search.determineCompletionKind(request.content.getText(), request.content.getOffset());
      }
      function getAstNode(request, contentProvider, clearLastChar, allowNull, oldProject) {
        if (clearLastChar === void 0) {
          clearLastChar = true;
        }
        if (allowNull === void 0) {
          allowNull = true;
        }
        var newProjectId = contentProvider.contentDirName(request.content);
        var project = oldProject || parserApi.project.createProject(newProjectId, contentProvider.fsResolver);
        var offset = request.content.getOffset();
        var text = request.content.getText();
        var kind = completionKind(request);
        if (kind === parserApi.search.LocationKind.KEY_COMPLETION && clearLastChar) {
          text = text.substring(0, offset) + 'k:' + text.substring(offset);
        }
        var unit = project.setCachedUnitContent(request.content.getBaseName(), text);
        var ast = unit.highLevel();
        var actualOffset = offset;
        for (var currentOffset = offset - 1; currentOffset >= 0; currentOffset--) {
          var symbol = text[currentOffset];
          if (symbol === ' ' || symbol === '\t') {
            actualOffset = currentOffset - 1;
            continue;
          }
          break;
        }
        var astNode = ast.findElementAtOffset(actualOffset);
        if (!allowNull && !astNode) {
          return ast;
        }
        if (astNode && search.isExampleNode(astNode)) {
          var exampleEnd = astNode.lowLevel().end();
          if (exampleEnd === actualOffset && text[exampleEnd] === '\n') {
            astNode = astNode.parent();
          }
        }
        return astNode;
      }
      function modifiedContent(request) {
        var offset = request.content.getOffset();
        var text = request.content.getText();
        var kind = completionKind(request);
        if (kind === parserApi.search.LocationKind.KEY_COMPLETION) {
          text = text.substring(0, offset) + 'k:' + text.substring(offset);
        }
        return text;
      }
      function findAtOffsetInNode(offset, node) {
        var actualOffset = offset;
        var text = node.lowLevel().unit().contents();
        for (var currentOffset = offset - 1; currentOffset >= 0; currentOffset--) {
          var symbol = text[currentOffset];
          if (symbol === ' ' || symbol === '\t') {
            actualOffset = currentOffset - 1;
            continue;
          }
          break;
        }
        return node.findElementAtOffset(actualOffset);
      }
      function getIndent(offset, text) {
        var spaces = '';
        for (var i = offset - 1; i >= 0; i--) {
          var c = text.charAt(i);
          if (c == ' ' || c == '\t') {
            if (spaces) {
              spaces += c;
            } else {
              spaces = c;
            }
          } else if (c == '\r' || c == '\n') {
            return spaces;
          } else if (spaces) {
            return '';
          }
        }
        return '';
      }
      function getIndentWithSequenc(offset, text) {
        var spaces = '';
        for (var i = offset - 1; i >= 0; i--) {
          var c = text.charAt(i);
          if (c == ' ' || c == '\t' || c == '-') {
            if (spaces) {
              spaces += c;
            } else {
              spaces = c;
            }
          } else if (c == '\r' || c == '\n') {
            return spaces;
          } else if (spaces) {
            return '';
          }
        }
        return '';
      }
      function getIndent2(offset, text) {
        var spaces = '';
        for (var i = offset - 1; i >= 0; i--) {
          var c = text.charAt(i);
          if (c == ' ' || c == '\t') {
            if (spaces) {
              spaces += c;
            } else {
              spaces = c;
            }
          } else if (c == '\r' || c == '\n') {
            return spaces;
          }
        }
      }
      function pathCompletion(request, contentProvider, attr, hlNode, custom) {
        var prefix = request.valuePrefix();
        if (prefix.indexOf('#') === -1) {
          return pathPartCompletion(request, contentProvider, attr, hlNode, custom);
        } else {
          return pathReferencePartCompletion(request, contentProvider, attr, hlNode, custom);
        }
      }
      function pathPartCompletion(request, contentProvider, attr, hlNode, custom) {
        var prefix = request.valuePrefix();
        var dn = contentProvider.contentDirName(request.content);
        var ll = contentProvider.resolve(dn, prefix);
        var indexOfDot = ll.lastIndexOf('.');
        var indexOfSlash = ll.lastIndexOf('/');
        if (!(indexOfDot > 0 && (indexOfDot > indexOfSlash || indexOfSlash < 0))) {
          indexOfDot = -1;
        }
        var typedPath = ll;
        if (ll) {
          dn = contentProvider.dirName(ll);
          if (request.async) {
            dn = contentProvider.existsAsync(ll).then(function (isExists) {
              if (!isExists) {
                return contentProvider.dirName(ll);
              }
              return contentProvider.isDirectoryAsync(ll).then(function (isDirectory) {
                if (!isDirectory) {
                  return contentProvider.dirName(ll);
                }
                return ll;
              });
            });
          } else if (contentProvider.exists(ll) && contentProvider.isDirectory(ll)) {
            dn = ll;
          }
        }
        var res = [];
        var known = !custom;
        if (attr) {
          if (custom) {
            if (attr.name() === 'example') {
              res = res.concat(fromDir(prefix, dn, 'examples', contentProvider, request.promises));
              known = true;
            }
            if (attr.name() === 'value' && parserApi.universeHelpers.isGlobalSchemaType(attr.parent().definition())) {
              res = res.concat(fromDir(prefix, dn, 'schemas', contentProvider, request.promises));
              known = true;
            }
          }
        }
        if (!attr) {
          if (custom) {
            if (parserApi.universeHelpers.isTraitType(hlNode.definition())) {
              res = res.concat(fromDir(prefix, dn, 'traits', contentProvider, request.promises));
              known = true;
            }
            if (parserApi.universeHelpers.isResourceTypeType(hlNode.definition())) {
              res = res.concat(fromDir(prefix, dn, 'resourceTypes', contentProvider, request.promises));
              known = true;
            }
            if (parserApi.universeHelpers.isSecuritySchemaType(hlNode.definition())) {
              res = res.concat(fromDir(prefix, dn, 'securitySchemes', contentProvider, request.promises));
              known = true;
            }
            if (parserApi.universeHelpers.isGlobalSchemaType(hlNode.definition())) {
              res = res.concat(fromDir(prefix, dn, 'schemas', contentProvider, request.promises));
              known = true;
            }
          }
        }
        if (!known || !custom) {
          if (request.async) {
            filtredDirContentAsync(dn, typedPath, indexOfDot, contentProvider, request.promises);
          } else if (contentProvider.exists(dn) && contentProvider.isDirectory(dn)) {
            var dirContent = contentProvider.readDir(dn);
            res = res.concat(dirContent.filter(function (x) {
              try {
                var fullPath = contentProvider.resolve(dn, x);
                if (fullPath.indexOf(typedPath) === 0) {
                  return true;
                }
              } catch (exception) {
                return false;
              }
            }).map(function (x) {
              return { text: indexOfDot > 0 ? contentProvider.resolve(dn, x).substr(indexOfDot + 1) : x };
            }));
          }
        }
        return res;
      }
      function filtredDirContentAsync(dirName, typedPath, indexOfDot, contentProvider, promises) {
        if (promises) {
          var asString;
          var exists = dirName.then(function (dirNameStr) {
              asString = dirNameStr;
              return contentProvider.existsAsync(dirNameStr);
            });
          var dirContent = exists.then(function (isExists) {
              if (!isExists) {
                return [];
              }
              return contentProvider.isDirectoryAsync(asString).then(function (isDir) {
                if (!isDir) {
                  return [];
                }
                return contentProvider.readDirAsync(asString).then(function (dirContent) {
                  return dirContent.filter(function (x) {
                    try {
                      var fullPath = contentProvider.resolve(asString, x);
                      if (fullPath.indexOf(typedPath) === 0) {
                        return true;
                      }
                    } catch (exception) {
                      return false;
                    }
                  }).map(function (x) {
                    return { text: indexOfDot > 0 ? contentProvider.resolve(dirName, x).substr(indexOfDot + 1) : x };
                  });
                });
              });
            });
          promises.push(dirContent);
        }
      }
      function fromDir(prefix, dn, dirToLook, contentProvider, promises) {
        if (promises) {
          var existsPromise = dn.then(function (dirName) {
              var pss = contentProvider.resolve(dirName, dirToLook);
              return contentProvider.existsAsync(pss);
            });
          var proposalsPromise = existsPromise.then(function (result) {
              if (result) {
                return contentProvider.readDirAsync(pss).then(function (dirNames) {
                  var proposals = dirNames.map(function (x) {
                      return {
                        text: x,
                        replacementPrefix: prefix,
                        extra: './' + dirToLook + '/'
                      };
                    });
                  return proposals;
                });
              }
              return [];
            });
          promises.push(proposalsPromise);
          return [];
        }
        var pss = contentProvider.resolve(dn, dirToLook);
        if (contentProvider.exists(pss)) {
          var dirContent = contentProvider.readDir(pss);
          var proposals = dirContent.map(function (x) {
              return {
                text: x,
                replacementPrefix: prefix,
                extra: './' + dirToLook + '/'
              };
            });
          return proposals;
        }
        return [];
      }
      function pathReferencePartCompletion(request, contentProvider, attr, hlNode, custom) {
        var prefix = request.valuePrefix();
        var includePath = parserApi.schema.getIncludePath(prefix);
        var includeReference = parserApi.schema.getIncludeReference(prefix);
        if (!includePath || !includeReference) {
          return [];
        }
        var includeUnit = attr.lowLevel().unit().resolve(includePath);
        if (!includeUnit) {
          return [];
        }
        var content = includeUnit.contents();
        if (!content) {
          return [];
        }
        try {
          var proposals = parserApi.schema.completeReference(includePath, includeReference, content);
          return proposals.map(function (proposal) {
            return { text: proposal };
          });
        } catch (Error) {
          console.log(Error);
        }
        return [];
      }
      function isColonNeeded(offset, text) {
        var needColon = true;
        for (var i = offset > 0 ? offset - 1 : 0; i < text.length; i++) {
          var chr = text.charAt(i);
          if (chr == ' ' || chr == '\r' || chr == '\n') {
            break;
          }
          if (chr == ':') {
            needColon = false;
          }
        }
        return needColon;
      }
      function isAllowed(node, x) {
        var ok = true;
        x.getContextRequirements().forEach(function (y) {
          if (y.name.indexOf('(') !== -1) {
            return;
          }
          var vl = node.computedValue(y.name);
          if (vl) {
            ok = ok && vl == y.value;
          } else {
            if (y.value) {
              ok = false;
            }
          }
        });
        return ok;
      }
      function propertyCompletion(node, request, mv, c, hasNewLine) {
        if (hasNewLine === void 0) {
          hasNewLine = true;
        }
        var hlnode = node;
        var notAKey = false;
        var onlyKey = false;
        var text = request.content.getText();
        var offset = request.content.getOffset();
        if (hasNewLine) {
          var is = getIndentWithSequenc(node.lowLevel().keyStart(), text);
          if (is == undefined) {
            is = '';
          }
          var i2s = getIndentWithSequenc(offset, text);
          var i1 = is.length;
          var i2 = i2s.length;
          if (i1 == i2 && node.parent()) {
            if (node.property().getAdapter(parserApi.ds.RAMLPropertyService).isMerged()) {
              hlnode = hlnode.parent();
            } else {
              notAKey = false;
              onlyKey = true;
            }
          }
          if (i2 > i1) {
            notAKey = true;
            if (i2 >= i1 + 4) {
              onlyKey = true;
              notAKey = false;
            }
          }
          while (i2 < i1 && hlnode.parent()) {
            hlnode = hlnode.parent();
            i1 = i1 - 2;
          }
        }
        var needColon = isColonNeeded(offset, text);
        var ks = needColon ? ': ' : '';
        var props = hlnode.definition().allProperties();
        //basic filtering
        props = props.filter(function (x) {
          return !x.getAdapter(parserApi.ds.RAMLPropertyService).isKey() && !x.getAdapter(parserApi.ds.RAMLPropertyService).isMerged() && !x.getAdapter(services.RAMLPropertyService).isSystem();
        });
        //contextual filtering
        props = props.filter(function (x) {
          return isAllowed(hlnode, x);
        });
        var existing = {};
        hlnode.attrs().forEach(function (x) {
          existing[x.name()] = true;
        });
        props = props.filter(function (x) {
          return !existing[x.nameId()];
        }).filter(function (x) {
          return !x.isAnnotation();
        });
        if (node.definition().isAssignableFrom(parserApi.universes.Universe10.TypeDeclaration.name)) {
          if (!node.definition().isAssignableFrom('ObjectTypeDeclaration')) {
            if (!node.attr('type')) {
              var q = node.definition().universe().type('ObjectTypeDeclaration');
              if (q) {
                props.push(q.property('properties'));
              }
            }
          }
        }
        //TODO MAKE IT BETTER (actually we need to filter out and guess availabe keys)
        var rs = [];
        if (!mv && !onlyKey) {
          rs = props.map(function (x) {
            var complextionText = x.nameId() + ks;
            if (x.range().isAssignableFrom(universeModule.Universe10.ExampleSpec.name)) {
              complextionText = complextionText.trim();
            } else if (!x.range().hasValueTypeInHierarchy() && needColon) {
              complextionText += '\n' + getIndent(offset, text) + '  ';
            }
            return {
              text: complextionText,
              displayText: x.nameId(),
              description: x.description(),
              category: categoryByRanges(x.nameId(), node.definition(), x.range())
            };
          });
        }
        if (c) {
          hlnode.definition().allProperties().filter(function (x) {
            return x.getAdapter(parserApi.ds.RAMLPropertyService).isMerged() || x.isFromParentKey();
          }).forEach(function (p) {
            if (onlyKey) {
              if (!p.isFromParentKey()) {
                return;
              }
            }
            if (notAKey) {
              if (p.isFromParentKey()) {
                return;
              }
            }
            var prop = p;
            var oftenKeys = p.getOftenKeys();
            if (!oftenKeys) {
              var sug = p.suggester();
              if (sug) {
                oftenKeys = sug(hlnode);
              }
            }
            if (!oftenKeys) {
              oftenKeys = p.enumOptions();
            }
            if (hlnode.property() && parserApi.universeHelpers.isBodyProperty(hlnode.property())) {
              if (!oftenKeys) {
                if (parserApi.universeHelpers.isResponseType(hlnode.property().domain())) {
                  oftenKeys = [
                    'application/json',
                    'application/xml'
                  ];
                }
                if (parserApi.universeHelpers.isMethodBaseType(hlnode.property().domain()) || parserApi.universeHelpers.isMethodType(hlnode.property().domain())) {
                  oftenKeys = [
                    'application/json',
                    'application/xml',
                    'multipart/form-data',
                    'application/x-www-form-urlencoded'
                  ];
                }
              }
            }
            if (oftenKeys) {
              oftenKeys.forEach(function (y) {
                var original = y;
                var cs = prop.valueDocProvider();
                var description = '';
                if (cs) {
                  description = cs(y);
                }
                if (needColon) {
                  rs.push({
                    text: y + ':' + '\n' + getIndent(offset, text) + '  ',
                    description: description,
                    displayText: y,
                    prefix: y.indexOf('/') >= 0 ? request.valuePrefix() : null,
                    category: categoryByRanges(original, hlnode.definition(), prop.range())
                  });
                } else {
                  rs.push({
                    text: y,
                    description: description,
                    displayText: y,
                    prefix: y.indexOf('/') >= 0 ? request.valuePrefix() : null,
                    category: categoryByRanges(original, hlnode.definition(), prop.range())
                  });
                }
              });
            }
          });
        }
        return rs;
      }
      function isUnexspected(symbol) {
        if (symbol === '\'') {
          return true;
        }
        if (symbol === '"') {
          return true;
        }
        return false;
      }
      function isValueBroken(request) {
        var text = request.content.getText();
        var offset = request.content.getOffset();
        var prefix = request.prefix();
        var beginning = text.substring(0, offset);
        var value = beginning.substring(beginning.lastIndexOf(':') + 1).trim();
        if (!value.length) {
          return false;
        }
        if (value[value.length - 1] === ',') {
          if (value.indexOf('[') < 0) {
            return true;
          }
        }
        if (beginning[beginning.length - 1] === ' ') {
          if (/^\w$/.test(value[value.length - 1])) {
            return true;
          } else if (value[value.length - 1] === ',') {
            if (value.indexOf('[') < 0) {
              return true;
            }
          }
        }
        if (/^\w+$/.test(prefix)) {
          value = value.substring(0, value.lastIndexOf(prefix)).trim();
          if (/^\w$/.test(value[value.length - 1])) {
            return true;
          } else if (value[value.length - 1] === ',') {
            if (value.indexOf('[') < 0) {
              return true;
            }
          }
        }
        if (isUnexspected(value[value.length - 1])) {
          return true;
        }
        return false;
      }
      function valueCompletion(node, attr, request, provider) {
        var hlnode = node;
        var text = request.content.getText();
        var offset = request.content.getOffset();
        if (isValueBroken(request)) {
          return [];
        }
        if (attr) {
          var p = attr.property();
          var vl = attr.value();
          if (typeof vl === 'object' && vl) {
            var innerNode = vl.toHighLevel();
            if (innerNode) {
              return getSuggestions(provider.currentRequest, provider, findASTNodeByOffset(innerNode, request));
            } else if (parserApi.search.isExampleNodeContent(attr)) {
              var contentType = parserApi.search.findExampleContentType(attr);
              if (contentType) {
                var documentationRoot = parserApi.search.parseDocumentationContent(attr, contentType);
                if (documentationRoot) {
                  return getSuggestions(provider.currentRequest, provider, findASTNodeByOffset(documentationRoot, request));
                }
              }
            }
          }
          if (p) {
            var vls = enumValues(p, hlnode);
            if (p.isAllowNull()) {
              vls.push({
                text: 'null',
                description: 'null means - that no value is allowed'
              });
            }
            if (!vls || vls.length == 0) {
              var oftenKeys = p.getOftenKeys();
              if (oftenKeys) {
                return oftenKeys.map(function (x) {
                  return {
                    text: x,
                    displayText: x
                  };
                });
              }
            }
            if (universeHelpers.isExampleProperty(p) && universeHelpers.isBodyLikeType(hlnode.definition())) {
              if (!testVal(attr.value(), offset, text)) {
                return;
              }
              var rs = pathCompletion(request, provider.contentProvider, attr, hlnode, true).map(function (x) {
                  x.extra = '!include ./examples/';
                  x.displayText = '!include ./examples/' + x.text;
                  return x;
                });
              rs = addDefineInlineProposal(rs, attr.lowLevel().start(), text);
              return rs;
            }
            if (universeHelpers.isValueProperty(p) && universeHelpers.isGlobalSchemaType(hlnode.definition())) {
              if (!testVal(attr.value(), offset, text)) {
                return;
              }
              rs = pathCompletion(request, provider.contentProvider, attr, hlnode, true).map(function (x) {
                x.extra = '!include ./schemas/';
                x.displayText = '!include ./schemas/' + x.text;
                return x;
              });
              rs = addDefineInlineProposal(rs, attr.lowLevel().start(), text);
            }
            if (vls) {
              return vls;
            }
          }
          return [];
        } else {
          //FIXME (To DEF)
          if (universeHelpers.isGlobalSchemaType(hlnode.definition())) {
            rs = pathCompletion(request, provider.contentProvider, attr, hlnode, true).map(function (x) {
              x.extra = '!include ./schemas/';
              x.displayText = '!include ./schemas/' + x.text;
              return x;
            });
            rs = addDefineInlineProposal(rs, hlnode.lowLevel().start(), text);
          }
          if (universeHelpers.isTraitType(hlnode.definition())) {
            rs = pathCompletion(request, provider.contentProvider, attr, hlnode, true).map(function (x) {
              x.extra = '!include ./traits/';
              x.displayText = '!include ./traits/' + x.text;
              return x;
            });
            rs = addDefineInlineProposal2(rs, hlnode.lowLevel().start(), text);
            return rs;
          }
          if (universeHelpers.isResourceTypeType(hlnode.definition())) {
            var rs = pathCompletion(request, provider.contentProvider, attr, hlnode, true).map(function (x) {
                x.extra = '!include ./resourceTypes/';
                x.displayText = '!include ./resourceTypes/' + x.text;
                return x;
              });
            rs = addDefineInlineProposal2(rs, hlnode.lowLevel().start(), text);
            return rs;
          }
          if (universeHelpers.isSecuritySchemaType(hlnode.definition())) {
            var rs = pathCompletion(request, provider.contentProvider, attr, hlnode, true).map(function (x) {
                x.extra = '!include ./securitySchemes/';
                x.displayText = '!include ./securitySchemes/' + x.text;
                return x;
              });
            rs = addDefineInlineProposal2(rs, hlnode.lowLevel().start(), text);
            return rs;
          }
          if (universeHelpers.isExampleSpecType(hlnode.definition())) {
            return examplePropertyCompletion(hlnode, request, provider);
          }
        }
      }
      exports.valueCompletion = valueCompletion;
      function findASTNodeByOffset(ast, request) {
        var text = request.content.getText();
        var cm = request.content.getOffset();
        for (var pm = cm - 1; pm >= 0; pm--) {
          var c = text[pm];
          if (c == ' ' || c == '\t') {
            cm = pm;
            continue;
          }
          break;
        }
        var astNode = ast.findElementAtOffset(cm);
        return astNode;
      }
      function enumValues(property, parentNode) {
        if (parentNode) {
          if (property.getAdapter(parserApi.ds.RAMLPropertyService).isTypeExpr()) {
            var associatedType = parentNode.associatedType();
            var parentDefinition = parentNode.definition();
            var noArraysOrPrimitives;
            var typeProperty = parentNode.attr(parserApi.universes.Universe10.TypeDeclaration.properties.type.name);
            var typePropertyValue = typeProperty && typeProperty.value();
            var typeProperties = parentNode.children() && parentNode.children().filter(function (child) {
                return child.isAttr() && parserApi.universeHelpers.isTypeProperty(child.property());
              });
            var visibleScopes = [];
            var api = parentNode && parentNode.root && parentNode.root();
            api && api.lowLevel() && api.lowLevel().unit() && visibleScopes.push(api.lowLevel().unit().absolutePath());
            api && api.wrapperNode && api.wrapperNode() && api.wrapperNode().uses && api.wrapperNode().uses().forEach(function (usesDeclaration) {
              usesDeclaration && usesDeclaration.value && usesDeclaration.value() && visibleScopes.push(api.lowLevel().unit().resolve(usesDeclaration.value()).absolutePath());
            });
            var definitionNodes = parserApi.search.globalDeclarations(parentNode).filter(function (node) {
                var nodeLocation = node.lowLevel().unit().absolutePath();
                if (visibleScopes.indexOf(nodeLocation) < 0) {
                  return false;
                }
                if (parserApi.universeHelpers.isGlobalSchemaType(node.definition())) {
                  return true;
                }
                var superTypesOfProposed = node.definition().allSuperTypes();
                if (_.find(superTypesOfProposed, function (supertype) {
                    return parserApi.universeHelpers.isTypeDeclarationType(supertype);
                  })) {
                  var isMultiValue = typePropertyValue && property && property.isMultiValue() && typeProperties && typeProperties.length > 1;
                  if (isMultiValue) {
                    if (!associatedType) {
                      try {
                        associatedType = parentNode.localType();
                      } catch (exception) {
                        console.log(exception);
                      }
                    }
                    if (associatedType && !parentDefinition.hasUnionInHierarchy()) {
                      var supertypes = associatedType.superTypes().filter(function (supertype) {
                          return !supertype.isAssignableFrom('unknown');
                        });
                      if (supertypes) {
                        var isExtendsObject = _.find(supertypes, function (supertype) {
                            return isObject(supertype);
                          });
                        var isExtendsPrimitive = _.find(supertypes, function (supertype) {
                            return isPrimitive(supertype);
                          });
                        var isExtendsArray = _.find(supertypes, function (supertype) {
                            return isArray(supertype);
                          }) || parentDefinition && isArray(parentDefinition);
                        var noObjects = isExtendsArray || isExtendsPrimitive;
                        noArraysOrPrimitives = isExtendsObject || noObjects;
                        if (_.find(supertypes, function (supertype) {
                            return parserApi.search.qName(node, parentNode) === supertype.nameId();
                          })) {
                          return false;
                        }
                        if (noArraysOrPrimitives && (isPrimitive(node.definition()) || isArray(node.definition()))) {
                          return false;
                        }
                        if (noObjects && isObject(node.definition())) {
                          return false;
                        }
                      }
                    }
                    if (parentDefinition.hasUnionInHierarchy()) {
                      var unionClasses = allClassesForUnion(parentDefinition);
                      if (_.find(unionClasses, function (unionPart) {
                          return parserApi.search.qName(node, parentNode) === unionPart.nameId();
                        })) {
                        return false;
                      }
                    }
                  }
                  return true;
                }
                return universeHelpers.isTypeDeclarationType(node.definition()) && node.property().nameId() === 'models';
              });
            var result = definitionNodes.map(function (node) {
                return {
                  text: search.qName(node, parentNode),
                  description: ''
                };
              });
            var typeDeclarationType = property.domain().universe().type('TypeDeclaration');
            //var annotationTypeDeclaration = property.domain().universe().type("AnnotationTypeDeclaration");
            if (typeDeclarationType) {
              var subTypes = typeDeclarationType.allSubTypes();
              result = result.concat(subTypes.filter(function (subType) {
                if (noArraysOrPrimitives && (isPrimitive(subType) || isArray(subType))) {
                  return false;
                }
                return true;
              }).map(function (subType) {
                return {
                  text: subType.getAdapter(services.RAMLService).descriminatorValue(),
                  description: subType.description()
                };
              }));
            }
            return result;
          }
          if (universeHelpers.isSchemaStringType(property.range())) {
            if (property.range().universe().version() === 'RAML10') {
              var definitionNodes = search.globalDeclarations(parentNode).filter(function (node) {
                  if (universeHelpers.isGlobalSchemaType(node.definition())) {
                    return true;
                  }
                  var superTypesOfProposed = node.definition().allSuperTypes();
                  if (_.find(superTypesOfProposed, function (x) {
                      return universeHelpers.isTypeDeclarationType(x);
                    })) {
                    return true;
                  }
                  return universeHelpers.isTypeDeclarationType(node.definition()) && node.property().nameId() === 'models';
                });
              var result = definitionNodes.map(function (node) {
                  return {
                    text: search.qName(node, parentNode),
                    description: ''
                  };
                });
              var subTypes = search.subTypesWithLocals(property.domain().universe().type('TypeDeclaration'), parentNode);
              result = result.concat(subTypes.map(function (subType) {
                return {
                  text: subType.getAdapter(services.RAMLService).descriminatorValue(),
                  description: subType.description()
                };
              }));
              return result;
            }
          }
          if (property.isDescriminator()) {
            var subTypes = search.subTypesWithLocals(property.domain(), parentNode);
            return subTypes.map(function (subType) {
              var suggestionText = subType.getAdapter(services.RAMLService).descriminatorValue();
              return {
                text: suggestionText,
                description: subType.description(),
                category: categoryByRanges(suggestionText, property.domain(), null)
              };
            });
          }
          if (property.isReference()) {
            return search.nodesDeclaringType(property.referencesTo(), parentNode).map(function (subType) {
              return nodeToProposalInfo(subType, parentNode);
            });
          }
          if (property.range().hasValueTypeInHierarchy()) {
            var valueTypeAdapter = property.range().getAdapter(services.RAMLService);
            if (valueTypeAdapter.globallyDeclaredBy().length > 0) {
              var definitionNodes = search.globalDeclarations(parentNode).filter(function (proposedNode) {
                  var proposedDefinition = proposedNode.definition();
                  return _.find(valueTypeAdapter.globallyDeclaredBy(), function (globalDefinition) {
                    return globalDefinition == proposedDefinition;
                  }) != null;
                });
              return definitionNodes.map(function (proposedNode) {
                return nodeToProposalInfo(proposedNode, parentNode);
              });
            }
            if (universeHelpers.isBooleanTypeType(property.range())) {
              return [
                'false',
                'true'
              ].map(function (value) {
                return { text: value };
              });
            }
            var propertyNode = property.node && property.node();
            if (propertyNode) {
              var suggestions = _.filter(propertyNode.children(), function (child) {
                  return child.name && child.value && child.property() && universeHelpers.isEnumProperty(child.property());
                }).map(function (child) {
                  return { text: child.value() };
                });
              return suggestions;
            }
          }
        }
        return search.enumValues(property, parentNode).map(function (proposed) {
          return {
            text: proposed,
            category: categoryByRanges(proposed, parentNode && parentNode.definition(), null)
          };
        });
      }
      function isPrimitive(definition) {
        var isPrimitive = !definition.isArray() && !isObject(definition) && !definition.hasUnionInHierarchy() && definition.key() !== universeModule.Universe10.TypeDeclaration;
        return isPrimitive;
      }
      function isObject(definition) {
        return definition.isAssignableFrom(universeModule.Universe10.ObjectTypeDeclaration.name) || definition.isAssignableFrom('object');
      }
      function isArray(definition) {
        return definition.isAssignableFrom(universeModule.Universe10.ArrayTypeDeclaration.name);
      }
      function allClassesForUnion(definition) {
        var result = [];
        if (!definition || !definition.isUnion()) {
          return definition ? [definition] : result;
        }
        if (definition.left) {
          result.push(definition.left);
          return result.concat(allClassesForUnion(definition.right));
        }
      }
      function addDefineInlineProposal(rs, offset, text) {
        rs = [{
            displayText: 'Define Inline',
            text: '|\n' + leadingIndent(offset - 1, text) + '  '
          }].concat(rs);
        return rs;
      }
      function addDefineInlineProposal2(rs, offset, text) {
        rs = [{
            displayText: 'Define Inline',
            text: '\n' + leadingIndent(offset - 1, text) + '  '
          }].concat(rs);
        return rs;
      }
      function leadingIndent(pos, text) {
        var leading = '';
        while (pos > 0) {
          var ch = text[pos];
          if (ch == '\r' || ch == '\n' || ch != ' ' && ch != '-')
            break;
          leading = leading + ' ';
          pos--;
        }
        return leading;
      }
      ;
      function getProposalText(proposal) {
        if (proposal.text) {
          return proposal.text;
        }
        if (proposal.snippet) {
          return proposal.snippet;
        }
        return proposal.displayText;
      }
      function updateProposalText(proposal, textToUpdateWith) {
        if (proposal.text) {
          proposal.text = textToUpdateWith;
          return;
        }
        if (proposal.snippet) {
          proposal.snippet = textToUpdateWith;
          return;
        }
        proposal.displayText = textToUpdateWith;
      }
      function isSiblingExists(attr, siblingName) {
        var parent = attr.parent && attr.parent();
        if (!parent) {
          return false;
        }
        var propertyName = attr.name && attr.name();
        if (!propertyName) {
          return false;
        }
        var siblings = parent.attributes && parent.attributes(propertyName);
        if (!siblings) {
          return false;
        }
        if (siblings.length === 0) {
          return false;
        }
        var names = [];
        siblings.forEach(function (sibling) {
          var name = sibling.value && sibling.value() && sibling.value().valueName && sibling.value().valueName();
          if (!name) {
            return;
          }
          names.push(name);
        });
        return _.find(names, function (name) {
          return siblingName === name;
        });
      }
      function isSquareBracketExpected(attr) {
        if (!attr) {
          return false;
        }
        if (!attr.definition()) {
          return false;
        }
        if (!attr.property()) {
          return false;
        }
        if (!attr.definition().isAssignableFrom(universeModule.Universe10.TraitRef.name)) {
          return false;
        }
        return true;
      }
      function isInResourceDescription(obj) {
        var definition = obj && obj.definition ? obj.definition() : null;
        if (definition) {
          var name = definition.nameId();
          if (name === 'Api') {
            return false;
          }
          if (name === 'ResourceType' || name === 'Trait') {
            return true;
          }
          var parent = obj.parent();
          if (!parent) {
            return false;
          }
          return isInResourceDescription(parent);
        }
        return false;
      }
      var transformers = parserApi.utils.getTransformerNames();
      var addTransformers = function (proposals, prefix) {
        var result = [];
        transformers.filter(function (transformer) {
          return transformer.indexOf(prefix) === 0;
        }).forEach(function (transformer) {
          result.push({
            displayText: transformer,
            text: transformer
          });
        });
        return result.concat(proposals);
      };
      function testVal(vl, offset, text) {
        if (vl && vl.length > 0) {
          var q = vl.trim();
          if (q.indexOf('{') == 0) {
            return false;
          }
          if (q.indexOf('<') == 0) {
            return false;
          }
          if (q.indexOf('[') == 0) {
            return false;
          }
        }
        for (var i = offset; i >= 0; i--) {
          var c = text[i];
          if (c == ':') {
            return true;
          }
          if (c == '|') {
            return false;
          }
          if (c == '\'') {
            return false;
          }
          if (c == '"') {
            return false;
          }
        }
        return true;
      }
      function nodeToProposalInfo(x, c) {
        var isResourceType = false;
        var d = x.attr('description');
        var ds = '';
        if (d) {
          ds = d.value();
        } else {
          d = x.attr('usage');
          if (d) {
            ds = d.value();
          }
        }
        var tr = x.localType();
        var req = tr.allProperties().filter(function (x) {
            return x.isRequired() && !x.getAdapter(services.RAMLPropertyService).isKey();
          });
        var txt = search.qName(x, c);
        if (!universeHelpers.isAnnotationTypeType(x.definition())) {
          if (req.length > 0) {
            txt += ': {';
            txt += req.map(function (x) {
              return x.nameId() + ' : ';
            }).join(', ') + '}';
            var extra = '';
            if (universeHelpers.isResourceTypeType(x.definition())) {
              txt = '' + txt + ' }';
              extra = ' { ';
              isResourceType = true;
            }
          }
        }
        return {
          displayText: search.qName(x, c),
          snippet: txt,
          description: ds,
          extra: extra,
          isResourceType: isResourceType
        };
      }
      function examplePropertyCompletion(node, request, provider) {
        if (!search.isExampleNode(node)) {
          return [];
        }
        var contentType = search.findExampleContentType(node);
        if (!contentType)
          return [];
        var parsedExample = search.parseStructuredExample(node, contentType);
        if (!parsedExample)
          return [];
        var project = node && node.lowLevel() && node.lowLevel().unit() && node.lowLevel().unit().project();
        return getSuggestions(request, provider, findASTNodeByOffset(parsedExample, request), project);
      }
      function postProcess(providerSuggestions, request) {
        var prepared = postProcess1(providerSuggestions, request);
        var added = [];
        var result = [];
        prepared.forEach(function (item) {
          var value = suggestionValue(item);
          if (added.indexOf(value) < 0) {
            result.push(item);
            added.push(value);
          }
        });
        return result;
      }
      exports.postProcess = postProcess;
      function postProcess1(providerSuggestions, request) {
        var hasDeprecations, hasEmpty, suggestion, _i, _len;
        if (providerSuggestions == null) {
          return;
        }
        if (hasDeprecations) {
          providerSuggestions = providerSuggestions.map(function (suggestion) {
            var newSuggestion, _ref1, _ref2;
            newSuggestion = {
              text: (_ref1 = suggestion.text) != null ? _ref1 : suggestion.word,
              snippet: suggestion.snippet,
              replacementPrefix: (_ref2 = suggestion.replacementPrefix) != null ? _ref2 : suggestion.prefix,
              className: suggestion.className,
              type: suggestion.type
            };
            if (newSuggestion.rightLabelHTML == null && suggestion.renderLabelAsHtml) {
              newSuggestion.rightLabelHTML = suggestion.label;
            }
            if (newSuggestion.rightLabel == null && !suggestion.renderLabelAsHtml) {
              newSuggestion.rightLabel = suggestion.label;
            }
            return newSuggestion;
          });
        }
        hasEmpty = false;
        for (_i = 0, _len = providerSuggestions.length; _i < _len; _i++) {
          suggestion = providerSuggestions[_i];
          if (!(suggestion.snippet || suggestion.text)) {
            hasEmpty = true;
          }
          if (suggestion.replacementPrefix == null) {
            suggestion.replacementPrefix = getDefaultReplacementPrefix(request.prefix());
          }
        }
        if (hasEmpty) {
          providerSuggestions = function () {
            var _j, _len1, _results;
            _results = [];
            for (_j = 0, _len1 = providerSuggestions.length; _j < _len1; _j++) {
              suggestion = providerSuggestions[_j];
              if (suggestion.snippet || suggestion.text) {
                _results.push(suggestion);
              }
            }
            return _results;
          }();
        }
        providerSuggestions = filterSuggestions(providerSuggestions, request);
        return providerSuggestions;
      }
      var fuzzaldrinProvider = require('fuzzaldrin-plus');
      function filterSuggestions(suggestions, _arg) {
        var firstCharIsMatch, i, prefix, prefixIsEmpty, results, score, suggestion, suggestionPrefix, text, _i, _len, _ref1;
        prefix = _arg.prefix();
        results = [];
        for (i = _i = 0, _len = suggestions.length; _i < _len; i = ++_i) {
          suggestion = suggestions[i];
          suggestion.sortScore = Math.max(-i / 10 + 3, 0) + 1;
          suggestion.score = null;
          text = suggestion.snippet || suggestion.text;
          suggestionPrefix = (_ref1 = suggestion.replacementPrefix) != null ? _ref1 : prefix;
          prefixIsEmpty = !suggestionPrefix || suggestionPrefix === ' ';
          firstCharIsMatch = !prefixIsEmpty && suggestionPrefix[0].toLowerCase() === text[0].toLowerCase();
          if (prefixIsEmpty) {
            results.push(suggestion);
          }
          if (firstCharIsMatch && (score = fuzzaldrinProvider.score(text, suggestionPrefix)) > 0) {
            suggestion.score = score * suggestion.sortScore;
            results.push(suggestion);
          }
        }
        results.sort(reverseSortOnScoreComparator);
        return results;
      }
      var wordPrefixRegex = /^\w+[\w-]*$/;
      function reverseSortOnScoreComparator(a, b) {
        var _ref1, _ref2;
        return ((_ref1 = b.score) != null ? _ref1 : b.sortScore) - ((_ref2 = a.score) != null ? _ref2 : a.sortScore);
      }
      ;
      function getDefaultReplacementPrefix(prefix) {
        if (wordPrefixRegex.test(prefix)) {
          return prefix;
        } else {
          return '';
        }
      }
      ;
      function suggestionValue(suggestion) {
        return suggestion && (suggestion.displayText || suggestion.text) || null;
      }
      var prefixRegex = /(\b|['"~`!@#\$%^&*\(\)\{\}\[\]=\+,\/\?>])((\w+[\w-]*)|([.:;[{(< ]+))$/;
      function getPrefix(request) {
        var line, _ref1;
        line = getLine(request);
        return ((_ref1 = prefixRegex.exec(line)) != null ? _ref1[2] : void 0) || '';
      }
      exports.getPrefix = getPrefix;
      function getLine(request) {
        var offset = request.content.getOffset();
        var text = request.content.getText();
        for (var i = offset - 1; i >= 0; i--) {
          var c = text.charAt(i);
          if (c === '\r' || c === '\n' || c === ' ' || c === '\t') {
            return text.substring(i + 1, offset);
          }
        }
        return '';
      }
      var ResolvedProvider = function () {
          function ResolvedProvider(resolver) {
            this.resolver = resolver;
            this.fsResolver = resolver;
          }
          ResolvedProvider.prototype.contentDirName = function (content) {
            return this.resolver.dirname(content.getPath());
          };
          ResolvedProvider.prototype.dirName = function (path) {
            return this.resolver.dirname(path);
          };
          ResolvedProvider.prototype.exists = function (path) {
            return this.resolver.exists(path);
          };
          ResolvedProvider.prototype.resolve = function (contextPath, relativePath) {
            return this.resolver.resolve(contextPath, relativePath);
          };
          ResolvedProvider.prototype.isDirectory = function (path) {
            return this.resolver.isDirectory(path);
          };
          ResolvedProvider.prototype.isDirectoryAsync = function (path) {
            return this.resolver.isDirectoryAsync(path);
          };
          ResolvedProvider.prototype.readDir = function (path) {
            return this.resolver.list(path);
          };
          ResolvedProvider.prototype.existsAsync = function (path) {
            return this.resolver.existsAsync(path);
          };
          ResolvedProvider.prototype.readDirAsync = function (path) {
            return this.resolver.listAsync(path);
          };
          return ResolvedProvider;
        }();
      function getContentProvider(resolver) {
        return new ResolvedProvider(resolver);
      }
      exports.getContentProvider = getContentProvider;
    },
    {
      '../resources/categories.json': 11,
      'fuzzaldrin-plus': 2,
      'underscore': 12
    }
  ],
  10: [
    function (require, module, exports) {
      'use strict';
      var completionProvider = require('./completionProvider');
      var _editorStateProvider = null;
      /**
 * Sets default editor state provider
 * @param editorStateProvider
 */
      function setDefaultEditorStateProvider(editorStateProvider) {
        _editorStateProvider = editorStateProvider;
      }
      exports.setDefaultEditorStateProvider = setDefaultEditorStateProvider;
      var _fsProvider = null;
      /**
 * Sets default FS provider.
 * @param fsProvider
 */
      function setDefaultFSProvider(fsProvider) {
        _fsProvider = fsProvider;
      }
      exports.setDefaultFSProvider = setDefaultFSProvider;
      /**
 * Finds suggestions. Requires setDefaultEditorStateProvider and setDefaultFSProvider methods to be called first.
 * @returns {Suggestion[]} - list of suggestions
 */
      function suggestDefault() {
        return completionProvider.suggest(_editorStateProvider, _fsProvider);
      }
      exports.suggestDefault = suggestDefault;
      /**
 * Finds suggestions.
 * @param editorState - editor state.
 * @param fsProvider - file system data provider.
 * @returns {Suggestion[]} - list of suggestions
 */
      function suggest(editorStateProvider, fsProvider) {
        return completionProvider.suggest(editorStateProvider, fsProvider);
      }
      exports.suggest = suggest;
      /**
 * Finds suggestions.
 * @param editorState - editor state.
 * @param fsProvider - file system data provider.
 * @returns {Promise<Suggestion[]>}
 */
      function suggestAsync(editorState, fsProvider) {
        return completionProvider.suggestAsync(editorState, fsProvider);
      }
      exports.suggestAsync = suggestAsync;
      /**
 * Converts extended fs resolver to FS provider.
 * @param resolver
 * @returns {IFSProvider}
 */
      function getContentProvider(resolver) {
        return completionProvider.getContentProvider(resolver);
      }
      exports.getContentProvider = getContentProvider;
    },
    { './completionProvider': 9 }
  ],
  11: [
    function (require, module, exports) {
      module.exports = {
        'docs': {
          'description': {
            'is': [
              'Universe10.MarkdownString',
              'Universe08.MarkdownString'
            ]
          },
          'displayName': {
            'parentIs': [
              'Universe10.ExampleSpec',
              'Universe10.TypeDeclaration',
              'Universe10.Trait',
              'Universe10.MethodBase',
              'Universe10.AbstractSecurityScheme',
              'Universe10.ResourceType',
              'Universe10.Resource',
              'Universe08.Parameter',
              'Universe08.Resource',
              'Universe08.ResourceType',
              'Universe08.Trait'
            ]
          },
          'example': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.Parameter',
              'Universe08.BodyLike',
              'Universe08.XMLBody',
              'Universe08.JSONBody'
            ]
          },
          'usage': {
            'parentIs': [
              'Universe10.Library',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe10.Trait',
              'Universe10.ResourceType',
              'Universe08.ResourceType',
              'Universe08.Trait'
            ]
          },
          'content': {
            'parentIs': [
              'Universe10.DocumentationItem',
              'Universe08.DocumentationItem'
            ]
          },
          'documentation': {
            'parentIs': [
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          },
          'title': {
            'parentIs': [
              'Universe10.DocumentationItem',
              'Universe08.DocumentationItem'
            ]
          }
        },
        'parameters': {
          'default': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.Parameter'
            ]
          },
          'enum': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.Parameter'
            ]
          },
          'maximum': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.Parameter'
            ]
          },
          'minimum': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.Parameter'
            ]
          },
          'maxLength': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.Parameter'
            ]
          },
          'minLength': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.Parameter'
            ]
          },
          'required': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.Parameter'
            ]
          },
          'baseUriParameters': {
            'parentIs': [
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api',
              'Universe08.Resource',
              'Universe08.ResourceType',
              'Universe08.MethodBase',
              'Universe08.Trait',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'uriParameters': {
            'parentIs': [
              'Universe10.ResourceType',
              'Universe10.ResourceBase',
              'Universe10.Resource',
              'Universe08.Api',
              'Universe08.Resource',
              'Universe08.ResourceType'
            ]
          },
          'headers': {
            'parentIs': [
              'Universe10.Response',
              'Universe10.Trait',
              'Universe10.MethodBase',
              'Universe10.Operation',
              'Universe10.AbstractSecurityScheme',
              'Universe08.Response',
              'Universe08.MethodBase',
              'Universe08.Trait',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'queryParameters': {
            'parentIs': [
              'Universe10.Trait',
              'Universe10.MethodBase',
              'Universe10.Operation',
              'Universe10.AbstractSecurityScheme',
              'Universe08.MethodBase',
              'Universe08.Trait',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'type': { 'parentIs': ['Universe08.Parameter'] }
        },
        'schemas': {
          'schema': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.BodyLike',
              'Universe08.XMLBody',
              'Universe08.JSONBody'
            ]
          },
          'schemas': {
            'parentIs': [
              'Universe10.Library',
              'Universe10.LibraryBase',
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          }
        },
        'root': {
          'baseUri': {
            'parentIs': [
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          },
          'mediaType': {
            'parentIs': [
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          },
          'protocols': {
            'parentIs': [
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe10.Trait',
              'Universe10.MethodBase',
              'Universe08.Api',
              'Universe08.MethodBase',
              'Universe08.Trait',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'version': {
            'parentIs': [
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          },
          'title': {
            'parentIs': [
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          }
        },
        'responses': {
          'responses': {
            'parentIs': [
              'Universe10.Trait',
              'Universe10.MethodBase',
              'Universe10.Operation',
              'Universe10.AbstractSecurityScheme',
              'Universe08.MethodBase',
              'Universe08.Trait',
              'Universe08.AbstractSecurityScheme'
            ]
          }
        },
        'response': {
          'body': {
            'parentIs': [
              'Universe10.Response',
              'Universe08.Response'
            ]
          }
        },
        'security': {
          'securedBy': {
            'is': [
              'Universe10.SecuritySchemeRef',
              'Universe08.SecuritySchemeRef'
            ]
          },
          'securitySchemes': {
            'parentIs': [
              'Universe10.Library',
              'Universe10.LibraryBase',
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          },
          'accessTokenUri': {
            'parentIs': [
              'Universe10.AbstractSecurityScheme',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'authorizationGrants': {
            'parentIs': [
              'Universe10.AbstractSecurityScheme',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'authorizationUri': {
            'parentIs': [
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          },
          'requestTokenUri': {
            'parentIs': [
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          },
          'scopes': {
            'parentIs': [
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          },
          'describedBy': {
            'parentIs': [
              'Universe10.AbstractSecurityScheme',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'settings': {
            'parentIs': [
              'Universe10.AbstractSecurityScheme',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'OAuth 1.0': {
            'parentIs': [
              'Universe10.AbstractSecurityScheme',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'OAuth 2.0': {
            'parentIs': [
              'Universe10.AbstractSecurityScheme',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'Basic Authentication': {
            'parentIs': [
              'Universe10.AbstractSecurityScheme',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'Digest Authentication': {
            'parentIs': [
              'Universe10.AbstractSecurityScheme',
              'Universe08.AbstractSecurityScheme'
            ]
          },
          'type': {
            'parentIs': [
              'Universe10.AbstractSecurityScheme',
              'Universe08.AbstractSecurityScheme'
            ]
          }
        },
        'types and traits': {
          'type': {
            'parentIs': [
              'Universe10.ResourceType',
              'Universe10.ResourceBase',
              'Universe10.Resource',
              'Universe08.Resource',
              'Universe08.ResourceType'
            ]
          },
          'is': {
            'is': [
              'Universe10.TraitRef',
              'Universe08.TraitRef'
            ]
          },
          'resourceTypes': {
            'parentIs': [
              'Universe10.Library',
              'Universe10.LibraryBase',
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          },
          'traits': {
            'parentIs': [
              'Universe10.Library',
              'Universe10.LibraryBase',
              'Universe10.Api',
              'Universe10.Overlay',
              'Universe10.Extension',
              'Universe08.Api'
            ]
          }
        },
        'methods': {
          'options': {
            'is': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          },
          'get': {
            'is': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          },
          'head': {
            'is': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          },
          'post': {
            'is': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          },
          'put': {
            'is': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          },
          'delete': {
            'is': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          },
          'trace': {
            'is': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          },
          'connect': {
            'is': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          },
          'patch': {
            'is': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          }
        },
        'protocols': {
          'HTTP': {
            'parentIs': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          },
          'HTTPS': {
            'parentIs': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          }
        },
        'body': {
          'application/json': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.BodyLike'
            ]
          },
          'application/x-www-form-urlencoded': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.BodyLike'
            ]
          },
          'application/xml': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.BodyLike'
            ]
          },
          'multipart/form-data': {
            'parentIs': [
              'Universe10.TypeDeclaration',
              'Universe08.BodyLike'
            ]
          },
          'body': {
            'parentIs': [
              'Universe10.MethodBase',
              'Universe08.MethodBase'
            ]
          }
        }
      };
    },
    {}
  ],
  12: [
    function (require, module, exports) {
      //     Underscore.js 1.8.3
      //     http://underscorejs.org
      //     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
      //     Underscore may be freely distributed under the MIT license.
      (function () {
        // Baseline setup
        // --------------
        // Establish the root object, `window` in the browser, or `exports` on the server.
        var root = this;
        // Save the previous value of the `_` variable.
        var previousUnderscore = root._;
        // Save bytes in the minified (but not gzipped) version:
        var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
        // Create quick reference variables for speed access to core prototypes.
        var push = ArrayProto.push, slice = ArrayProto.slice, toString = ObjProto.toString, hasOwnProperty = ObjProto.hasOwnProperty;
        // All **ECMAScript 5** native function implementations that we hope to use
        // are declared here.
        var nativeIsArray = Array.isArray, nativeKeys = Object.keys, nativeBind = FuncProto.bind, nativeCreate = Object.create;
        // Naked function reference for surrogate-prototype-swapping.
        var Ctor = function () {
        };
        // Create a safe reference to the Underscore object for use below.
        var _ = function (obj) {
          if (obj instanceof _)
            return obj;
          if (!(this instanceof _))
            return new _(obj);
          this._wrapped = obj;
        };
        // Export the Underscore object for **Node.js**, with
        // backwards-compatibility for the old `require()` API. If we're in
        // the browser, add `_` as a global object.
        if (typeof exports !== 'undefined') {
          if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = _;
          }
          exports._ = _;
        } else {
          root._ = _;
        }
        // Current version.
        _.VERSION = '1.8.3';
        // Internal function that returns an efficient (for current engines) version
        // of the passed-in callback, to be repeatedly applied in other Underscore
        // functions.
        var optimizeCb = function (func, context, argCount) {
          if (context === void 0)
            return func;
          switch (argCount == null ? 3 : argCount) {
          case 1:
            return function (value) {
              return func.call(context, value);
            };
          case 2:
            return function (value, other) {
              return func.call(context, value, other);
            };
          case 3:
            return function (value, index, collection) {
              return func.call(context, value, index, collection);
            };
          case 4:
            return function (accumulator, value, index, collection) {
              return func.call(context, accumulator, value, index, collection);
            };
          }
          return function () {
            return func.apply(context, arguments);
          };
        };
        // A mostly-internal function to generate callbacks that can be applied
        // to each element in a collection, returning the desired result — either
        // identity, an arbitrary callback, a property matcher, or a property accessor.
        var cb = function (value, context, argCount) {
          if (value == null)
            return _.identity;
          if (_.isFunction(value))
            return optimizeCb(value, context, argCount);
          if (_.isObject(value))
            return _.matcher(value);
          return _.property(value);
        };
        _.iteratee = function (value, context) {
          return cb(value, context, Infinity);
        };
        // An internal function for creating assigner functions.
        var createAssigner = function (keysFunc, undefinedOnly) {
          return function (obj) {
            var length = arguments.length;
            if (length < 2 || obj == null)
              return obj;
            for (var index = 1; index < length; index++) {
              var source = arguments[index], keys = keysFunc(source), l = keys.length;
              for (var i = 0; i < l; i++) {
                var key = keys[i];
                if (!undefinedOnly || obj[key] === void 0)
                  obj[key] = source[key];
              }
            }
            return obj;
          };
        };
        // An internal function for creating a new object that inherits from another.
        var baseCreate = function (prototype) {
          if (!_.isObject(prototype))
            return {};
          if (nativeCreate)
            return nativeCreate(prototype);
          Ctor.prototype = prototype;
          var result = new Ctor();
          Ctor.prototype = null;
          return result;
        };
        var property = function (key) {
          return function (obj) {
            return obj == null ? void 0 : obj[key];
          };
        };
        // Helper for collection methods to determine whether a collection
        // should be iterated as an array or as an object
        // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
        // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
        var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
        var getLength = property('length');
        var isArrayLike = function (collection) {
          var length = getLength(collection);
          return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
        };
        // Collection Functions
        // --------------------
        // The cornerstone, an `each` implementation, aka `forEach`.
        // Handles raw objects in addition to array-likes. Treats all
        // sparse array-likes as if they were dense.
        _.each = _.forEach = function (obj, iteratee, context) {
          iteratee = optimizeCb(iteratee, context);
          var i, length;
          if (isArrayLike(obj)) {
            for (i = 0, length = obj.length; i < length; i++) {
              iteratee(obj[i], i, obj);
            }
          } else {
            var keys = _.keys(obj);
            for (i = 0, length = keys.length; i < length; i++) {
              iteratee(obj[keys[i]], keys[i], obj);
            }
          }
          return obj;
        };
        // Return the results of applying the iteratee to each element.
        _.map = _.collect = function (obj, iteratee, context) {
          iteratee = cb(iteratee, context);
          var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length, results = Array(length);
          for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            results[index] = iteratee(obj[currentKey], currentKey, obj);
          }
          return results;
        };
        // Create a reducing function iterating left or right.
        function createReduce(dir) {
          // Optimized iterator function as using arguments.length
          // in the main function will deoptimize the, see #1991.
          function iterator(obj, iteratee, memo, keys, index, length) {
            for (; index >= 0 && index < length; index += dir) {
              var currentKey = keys ? keys[index] : index;
              memo = iteratee(memo, obj[currentKey], currentKey, obj);
            }
            return memo;
          }
          return function (obj, iteratee, memo, context) {
            iteratee = optimizeCb(iteratee, context, 4);
            var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length, index = dir > 0 ? 0 : length - 1;
            // Determine the initial value if none is provided.
            if (arguments.length < 3) {
              memo = obj[keys ? keys[index] : index];
              index += dir;
            }
            return iterator(obj, iteratee, memo, keys, index, length);
          };
        }
        // **Reduce** builds up a single result from a list of values, aka `inject`,
        // or `foldl`.
        _.reduce = _.foldl = _.inject = createReduce(1);
        // The right-associative version of reduce, also known as `foldr`.
        _.reduceRight = _.foldr = createReduce(-1);
        // Return the first value which passes a truth test. Aliased as `detect`.
        _.find = _.detect = function (obj, predicate, context) {
          var key;
          if (isArrayLike(obj)) {
            key = _.findIndex(obj, predicate, context);
          } else {
            key = _.findKey(obj, predicate, context);
          }
          if (key !== void 0 && key !== -1)
            return obj[key];
        };
        // Return all the elements that pass a truth test.
        // Aliased as `select`.
        _.filter = _.select = function (obj, predicate, context) {
          var results = [];
          predicate = cb(predicate, context);
          _.each(obj, function (value, index, list) {
            if (predicate(value, index, list))
              results.push(value);
          });
          return results;
        };
        // Return all the elements for which a truth test fails.
        _.reject = function (obj, predicate, context) {
          return _.filter(obj, _.negate(cb(predicate)), context);
        };
        // Determine whether all of the elements match a truth test.
        // Aliased as `all`.
        _.every = _.all = function (obj, predicate, context) {
          predicate = cb(predicate, context);
          var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length;
          for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            if (!predicate(obj[currentKey], currentKey, obj))
              return false;
          }
          return true;
        };
        // Determine if at least one element in the object matches a truth test.
        // Aliased as `any`.
        _.some = _.any = function (obj, predicate, context) {
          predicate = cb(predicate, context);
          var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length;
          for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            if (predicate(obj[currentKey], currentKey, obj))
              return true;
          }
          return false;
        };
        // Determine if the array or object contains a given item (using `===`).
        // Aliased as `includes` and `include`.
        _.contains = _.includes = _.include = function (obj, item, fromIndex, guard) {
          if (!isArrayLike(obj))
            obj = _.values(obj);
          if (typeof fromIndex != 'number' || guard)
            fromIndex = 0;
          return _.indexOf(obj, item, fromIndex) >= 0;
        };
        // Invoke a method (with arguments) on every item in a collection.
        _.invoke = function (obj, method) {
          var args = slice.call(arguments, 2);
          var isFunc = _.isFunction(method);
          return _.map(obj, function (value) {
            var func = isFunc ? method : value[method];
            return func == null ? func : func.apply(value, args);
          });
        };
        // Convenience version of a common use case of `map`: fetching a property.
        _.pluck = function (obj, key) {
          return _.map(obj, _.property(key));
        };
        // Convenience version of a common use case of `filter`: selecting only objects
        // containing specific `key:value` pairs.
        _.where = function (obj, attrs) {
          return _.filter(obj, _.matcher(attrs));
        };
        // Convenience version of a common use case of `find`: getting the first object
        // containing specific `key:value` pairs.
        _.findWhere = function (obj, attrs) {
          return _.find(obj, _.matcher(attrs));
        };
        // Return the maximum element (or element-based computation).
        _.max = function (obj, iteratee, context) {
          var result = -Infinity, lastComputed = -Infinity, value, computed;
          if (iteratee == null && obj != null) {
            obj = isArrayLike(obj) ? obj : _.values(obj);
            for (var i = 0, length = obj.length; i < length; i++) {
              value = obj[i];
              if (value > result) {
                result = value;
              }
            }
          } else {
            iteratee = cb(iteratee, context);
            _.each(obj, function (value, index, list) {
              computed = iteratee(value, index, list);
              if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
                result = value;
                lastComputed = computed;
              }
            });
          }
          return result;
        };
        // Return the minimum element (or element-based computation).
        _.min = function (obj, iteratee, context) {
          var result = Infinity, lastComputed = Infinity, value, computed;
          if (iteratee == null && obj != null) {
            obj = isArrayLike(obj) ? obj : _.values(obj);
            for (var i = 0, length = obj.length; i < length; i++) {
              value = obj[i];
              if (value < result) {
                result = value;
              }
            }
          } else {
            iteratee = cb(iteratee, context);
            _.each(obj, function (value, index, list) {
              computed = iteratee(value, index, list);
              if (computed < lastComputed || computed === Infinity && result === Infinity) {
                result = value;
                lastComputed = computed;
              }
            });
          }
          return result;
        };
        // Shuffle a collection, using the modern version of the
        // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
        _.shuffle = function (obj) {
          var set = isArrayLike(obj) ? obj : _.values(obj);
          var length = set.length;
          var shuffled = Array(length);
          for (var index = 0, rand; index < length; index++) {
            rand = _.random(0, index);
            if (rand !== index)
              shuffled[index] = shuffled[rand];
            shuffled[rand] = set[index];
          }
          return shuffled;
        };
        // Sample **n** random values from a collection.
        // If **n** is not specified, returns a single random element.
        // The internal `guard` argument allows it to work with `map`.
        _.sample = function (obj, n, guard) {
          if (n == null || guard) {
            if (!isArrayLike(obj))
              obj = _.values(obj);
            return obj[_.random(obj.length - 1)];
          }
          return _.shuffle(obj).slice(0, Math.max(0, n));
        };
        // Sort the object's values by a criterion produced by an iteratee.
        _.sortBy = function (obj, iteratee, context) {
          iteratee = cb(iteratee, context);
          return _.pluck(_.map(obj, function (value, index, list) {
            return {
              value: value,
              index: index,
              criteria: iteratee(value, index, list)
            };
          }).sort(function (left, right) {
            var a = left.criteria;
            var b = right.criteria;
            if (a !== b) {
              if (a > b || a === void 0)
                return 1;
              if (a < b || b === void 0)
                return -1;
            }
            return left.index - right.index;
          }), 'value');
        };
        // An internal function used for aggregate "group by" operations.
        var group = function (behavior) {
          return function (obj, iteratee, context) {
            var result = {};
            iteratee = cb(iteratee, context);
            _.each(obj, function (value, index) {
              var key = iteratee(value, index, obj);
              behavior(result, value, key);
            });
            return result;
          };
        };
        // Groups the object's values by a criterion. Pass either a string attribute
        // to group by, or a function that returns the criterion.
        _.groupBy = group(function (result, value, key) {
          if (_.has(result, key))
            result[key].push(value);
          else
            result[key] = [value];
        });
        // Indexes the object's values by a criterion, similar to `groupBy`, but for
        // when you know that your index values will be unique.
        _.indexBy = group(function (result, value, key) {
          result[key] = value;
        });
        // Counts instances of an object that group by a certain criterion. Pass
        // either a string attribute to count by, or a function that returns the
        // criterion.
        _.countBy = group(function (result, value, key) {
          if (_.has(result, key))
            result[key]++;
          else
            result[key] = 1;
        });
        // Safely create a real, live array from anything iterable.
        _.toArray = function (obj) {
          if (!obj)
            return [];
          if (_.isArray(obj))
            return slice.call(obj);
          if (isArrayLike(obj))
            return _.map(obj, _.identity);
          return _.values(obj);
        };
        // Return the number of elements in an object.
        _.size = function (obj) {
          if (obj == null)
            return 0;
          return isArrayLike(obj) ? obj.length : _.keys(obj).length;
        };
        // Split a collection into two arrays: one whose elements all satisfy the given
        // predicate, and one whose elements all do not satisfy the predicate.
        _.partition = function (obj, predicate, context) {
          predicate = cb(predicate, context);
          var pass = [], fail = [];
          _.each(obj, function (value, key, obj) {
            (predicate(value, key, obj) ? pass : fail).push(value);
          });
          return [
            pass,
            fail
          ];
        };
        // Array Functions
        // ---------------
        // Get the first element of an array. Passing **n** will return the first N
        // values in the array. Aliased as `head` and `take`. The **guard** check
        // allows it to work with `_.map`.
        _.first = _.head = _.take = function (array, n, guard) {
          if (array == null)
            return void 0;
          if (n == null || guard)
            return array[0];
          return _.initial(array, array.length - n);
        };
        // Returns everything but the last entry of the array. Especially useful on
        // the arguments object. Passing **n** will return all the values in
        // the array, excluding the last N.
        _.initial = function (array, n, guard) {
          return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
        };
        // Get the last element of an array. Passing **n** will return the last N
        // values in the array.
        _.last = function (array, n, guard) {
          if (array == null)
            return void 0;
          if (n == null || guard)
            return array[array.length - 1];
          return _.rest(array, Math.max(0, array.length - n));
        };
        // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
        // Especially useful on the arguments object. Passing an **n** will return
        // the rest N values in the array.
        _.rest = _.tail = _.drop = function (array, n, guard) {
          return slice.call(array, n == null || guard ? 1 : n);
        };
        // Trim out all falsy values from an array.
        _.compact = function (array) {
          return _.filter(array, _.identity);
        };
        // Internal implementation of a recursive `flatten` function.
        var flatten = function (input, shallow, strict, startIndex) {
          var output = [], idx = 0;
          for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
            var value = input[i];
            if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
              //flatten current level of array or arguments object
              if (!shallow)
                value = flatten(value, shallow, strict);
              var j = 0, len = value.length;
              output.length += len;
              while (j < len) {
                output[idx++] = value[j++];
              }
            } else if (!strict) {
              output[idx++] = value;
            }
          }
          return output;
        };
        // Flatten out an array, either recursively (by default), or just one level.
        _.flatten = function (array, shallow) {
          return flatten(array, shallow, false);
        };
        // Return a version of the array that does not contain the specified value(s).
        _.without = function (array) {
          return _.difference(array, slice.call(arguments, 1));
        };
        // Produce a duplicate-free version of the array. If the array has already
        // been sorted, you have the option of using a faster algorithm.
        // Aliased as `unique`.
        _.uniq = _.unique = function (array, isSorted, iteratee, context) {
          if (!_.isBoolean(isSorted)) {
            context = iteratee;
            iteratee = isSorted;
            isSorted = false;
          }
          if (iteratee != null)
            iteratee = cb(iteratee, context);
          var result = [];
          var seen = [];
          for (var i = 0, length = getLength(array); i < length; i++) {
            var value = array[i], computed = iteratee ? iteratee(value, i, array) : value;
            if (isSorted) {
              if (!i || seen !== computed)
                result.push(value);
              seen = computed;
            } else if (iteratee) {
              if (!_.contains(seen, computed)) {
                seen.push(computed);
                result.push(value);
              }
            } else if (!_.contains(result, value)) {
              result.push(value);
            }
          }
          return result;
        };
        // Produce an array that contains the union: each distinct element from all of
        // the passed-in arrays.
        _.union = function () {
          return _.uniq(flatten(arguments, true, true));
        };
        // Produce an array that contains every item shared between all the
        // passed-in arrays.
        _.intersection = function (array) {
          var result = [];
          var argsLength = arguments.length;
          for (var i = 0, length = getLength(array); i < length; i++) {
            var item = array[i];
            if (_.contains(result, item))
              continue;
            for (var j = 1; j < argsLength; j++) {
              if (!_.contains(arguments[j], item))
                break;
            }
            if (j === argsLength)
              result.push(item);
          }
          return result;
        };
        // Take the difference between one array and a number of other arrays.
        // Only the elements present in just the first array will remain.
        _.difference = function (array) {
          var rest = flatten(arguments, true, true, 1);
          return _.filter(array, function (value) {
            return !_.contains(rest, value);
          });
        };
        // Zip together multiple lists into a single array -- elements that share
        // an index go together.
        _.zip = function () {
          return _.unzip(arguments);
        };
        // Complement of _.zip. Unzip accepts an array of arrays and groups
        // each array's elements on shared indices
        _.unzip = function (array) {
          var length = array && _.max(array, getLength).length || 0;
          var result = Array(length);
          for (var index = 0; index < length; index++) {
            result[index] = _.pluck(array, index);
          }
          return result;
        };
        // Converts lists into objects. Pass either a single array of `[key, value]`
        // pairs, or two parallel arrays of the same length -- one of keys, and one of
        // the corresponding values.
        _.object = function (list, values) {
          var result = {};
          for (var i = 0, length = getLength(list); i < length; i++) {
            if (values) {
              result[list[i]] = values[i];
            } else {
              result[list[i][0]] = list[i][1];
            }
          }
          return result;
        };
        // Generator function to create the findIndex and findLastIndex functions
        function createPredicateIndexFinder(dir) {
          return function (array, predicate, context) {
            predicate = cb(predicate, context);
            var length = getLength(array);
            var index = dir > 0 ? 0 : length - 1;
            for (; index >= 0 && index < length; index += dir) {
              if (predicate(array[index], index, array))
                return index;
            }
            return -1;
          };
        }
        // Returns the first index on an array-like that passes a predicate test
        _.findIndex = createPredicateIndexFinder(1);
        _.findLastIndex = createPredicateIndexFinder(-1);
        // Use a comparator function to figure out the smallest index at which
        // an object should be inserted so as to maintain order. Uses binary search.
        _.sortedIndex = function (array, obj, iteratee, context) {
          iteratee = cb(iteratee, context, 1);
          var value = iteratee(obj);
          var low = 0, high = getLength(array);
          while (low < high) {
            var mid = Math.floor((low + high) / 2);
            if (iteratee(array[mid]) < value)
              low = mid + 1;
            else
              high = mid;
          }
          return low;
        };
        // Generator function to create the indexOf and lastIndexOf functions
        function createIndexFinder(dir, predicateFind, sortedIndex) {
          return function (array, item, idx) {
            var i = 0, length = getLength(array);
            if (typeof idx == 'number') {
              if (dir > 0) {
                i = idx >= 0 ? idx : Math.max(idx + length, i);
              } else {
                length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
              }
            } else if (sortedIndex && idx && length) {
              idx = sortedIndex(array, item);
              return array[idx] === item ? idx : -1;
            }
            if (item !== item) {
              idx = predicateFind(slice.call(array, i, length), _.isNaN);
              return idx >= 0 ? idx + i : -1;
            }
            for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
              if (array[idx] === item)
                return idx;
            }
            return -1;
          };
        }
        // Return the position of the first occurrence of an item in an array,
        // or -1 if the item is not included in the array.
        // If the array is large and already in sort order, pass `true`
        // for **isSorted** to use binary search.
        _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
        _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);
        // Generate an integer Array containing an arithmetic progression. A port of
        // the native Python `range()` function. See
        // [the Python documentation](http://docs.python.org/library/functions.html#range).
        _.range = function (start, stop, step) {
          if (stop == null) {
            stop = start || 0;
            start = 0;
          }
          step = step || 1;
          var length = Math.max(Math.ceil((stop - start) / step), 0);
          var range = Array(length);
          for (var idx = 0; idx < length; idx++, start += step) {
            range[idx] = start;
          }
          return range;
        };
        // Function (ahem) Functions
        // ------------------
        // Determines whether to execute a function as a constructor
        // or a normal function with the provided arguments
        var executeBound = function (sourceFunc, boundFunc, context, callingContext, args) {
          if (!(callingContext instanceof boundFunc))
            return sourceFunc.apply(context, args);
          var self = baseCreate(sourceFunc.prototype);
          var result = sourceFunc.apply(self, args);
          if (_.isObject(result))
            return result;
          return self;
        };
        // Create a function bound to a given object (assigning `this`, and arguments,
        // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
        // available.
        _.bind = function (func, context) {
          if (nativeBind && func.bind === nativeBind)
            return nativeBind.apply(func, slice.call(arguments, 1));
          if (!_.isFunction(func))
            throw new TypeError('Bind must be called on a function');
          var args = slice.call(arguments, 2);
          var bound = function () {
            return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
          };
          return bound;
        };
        // Partially apply a function by creating a version that has had some of its
        // arguments pre-filled, without changing its dynamic `this` context. _ acts
        // as a placeholder, allowing any combination of arguments to be pre-filled.
        _.partial = function (func) {
          var boundArgs = slice.call(arguments, 1);
          var bound = function () {
            var position = 0, length = boundArgs.length;
            var args = Array(length);
            for (var i = 0; i < length; i++) {
              args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
            }
            while (position < arguments.length)
              args.push(arguments[position++]);
            return executeBound(func, bound, this, this, args);
          };
          return bound;
        };
        // Bind a number of an object's methods to that object. Remaining arguments
        // are the method names to be bound. Useful for ensuring that all callbacks
        // defined on an object belong to it.
        _.bindAll = function (obj) {
          var i, length = arguments.length, key;
          if (length <= 1)
            throw new Error('bindAll must be passed function names');
          for (i = 1; i < length; i++) {
            key = arguments[i];
            obj[key] = _.bind(obj[key], obj);
          }
          return obj;
        };
        // Memoize an expensive function by storing its results.
        _.memoize = function (func, hasher) {
          var memoize = function (key) {
            var cache = memoize.cache;
            var address = '' + (hasher ? hasher.apply(this, arguments) : key);
            if (!_.has(cache, address))
              cache[address] = func.apply(this, arguments);
            return cache[address];
          };
          memoize.cache = {};
          return memoize;
        };
        // Delays a function for the given number of milliseconds, and then calls
        // it with the arguments supplied.
        _.delay = function (func, wait) {
          var args = slice.call(arguments, 2);
          return setTimeout(function () {
            return func.apply(null, args);
          }, wait);
        };
        // Defers a function, scheduling it to run after the current call stack has
        // cleared.
        _.defer = _.partial(_.delay, _, 1);
        // Returns a function, that, when invoked, will only be triggered at most once
        // during a given window of time. Normally, the throttled function will run
        // as much as it can, without ever going more than once per `wait` duration;
        // but if you'd like to disable the execution on the leading edge, pass
        // `{leading: false}`. To disable execution on the trailing edge, ditto.
        _.throttle = function (func, wait, options) {
          var context, args, result;
          var timeout = null;
          var previous = 0;
          if (!options)
            options = {};
          var later = function () {
            previous = options.leading === false ? 0 : _.now();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout)
              context = args = null;
          };
          return function () {
            var now = _.now();
            if (!previous && options.leading === false)
              previous = now;
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
              if (timeout) {
                clearTimeout(timeout);
                timeout = null;
              }
              previous = now;
              result = func.apply(context, args);
              if (!timeout)
                context = args = null;
            } else if (!timeout && options.trailing !== false) {
              timeout = setTimeout(later, remaining);
            }
            return result;
          };
        };
        // Returns a function, that, as long as it continues to be invoked, will not
        // be triggered. The function will be called after it stops being called for
        // N milliseconds. If `immediate` is passed, trigger the function on the
        // leading edge, instead of the trailing.
        _.debounce = function (func, wait, immediate) {
          var timeout, args, context, timestamp, result;
          var later = function () {
            var last = _.now() - timestamp;
            if (last < wait && last >= 0) {
              timeout = setTimeout(later, wait - last);
            } else {
              timeout = null;
              if (!immediate) {
                result = func.apply(context, args);
                if (!timeout)
                  context = args = null;
              }
            }
          };
          return function () {
            context = this;
            args = arguments;
            timestamp = _.now();
            var callNow = immediate && !timeout;
            if (!timeout)
              timeout = setTimeout(later, wait);
            if (callNow) {
              result = func.apply(context, args);
              context = args = null;
            }
            return result;
          };
        };
        // Returns the first function passed as an argument to the second,
        // allowing you to adjust arguments, run code before and after, and
        // conditionally execute the original function.
        _.wrap = function (func, wrapper) {
          return _.partial(wrapper, func);
        };
        // Returns a negated version of the passed-in predicate.
        _.negate = function (predicate) {
          return function () {
            return !predicate.apply(this, arguments);
          };
        };
        // Returns a function that is the composition of a list of functions, each
        // consuming the return value of the function that follows.
        _.compose = function () {
          var args = arguments;
          var start = args.length - 1;
          return function () {
            var i = start;
            var result = args[start].apply(this, arguments);
            while (i--)
              result = args[i].call(this, result);
            return result;
          };
        };
        // Returns a function that will only be executed on and after the Nth call.
        _.after = function (times, func) {
          return function () {
            if (--times < 1) {
              return func.apply(this, arguments);
            }
          };
        };
        // Returns a function that will only be executed up to (but not including) the Nth call.
        _.before = function (times, func) {
          var memo;
          return function () {
            if (--times > 0) {
              memo = func.apply(this, arguments);
            }
            if (times <= 1)
              func = null;
            return memo;
          };
        };
        // Returns a function that will be executed at most one time, no matter how
        // often you call it. Useful for lazy initialization.
        _.once = _.partial(_.before, 2);
        // Object Functions
        // ----------------
        // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
        var hasEnumBug = !{ toString: null }.propertyIsEnumerable('toString');
        var nonEnumerableProps = [
            'valueOf',
            'isPrototypeOf',
            'toString',
            'propertyIsEnumerable',
            'hasOwnProperty',
            'toLocaleString'
          ];
        function collectNonEnumProps(obj, keys) {
          var nonEnumIdx = nonEnumerableProps.length;
          var constructor = obj.constructor;
          var proto = _.isFunction(constructor) && constructor.prototype || ObjProto;
          // Constructor is a special case.
          var prop = 'constructor';
          if (_.has(obj, prop) && !_.contains(keys, prop))
            keys.push(prop);
          while (nonEnumIdx--) {
            prop = nonEnumerableProps[nonEnumIdx];
            if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
              keys.push(prop);
            }
          }
        }
        // Retrieve the names of an object's own properties.
        // Delegates to **ECMAScript 5**'s native `Object.keys`
        _.keys = function (obj) {
          if (!_.isObject(obj))
            return [];
          if (nativeKeys)
            return nativeKeys(obj);
          var keys = [];
          for (var key in obj)
            if (_.has(obj, key))
              keys.push(key);
          // Ahem, IE < 9.
          if (hasEnumBug)
            collectNonEnumProps(obj, keys);
          return keys;
        };
        // Retrieve all the property names of an object.
        _.allKeys = function (obj) {
          if (!_.isObject(obj))
            return [];
          var keys = [];
          for (var key in obj)
            keys.push(key);
          // Ahem, IE < 9.
          if (hasEnumBug)
            collectNonEnumProps(obj, keys);
          return keys;
        };
        // Retrieve the values of an object's properties.
        _.values = function (obj) {
          var keys = _.keys(obj);
          var length = keys.length;
          var values = Array(length);
          for (var i = 0; i < length; i++) {
            values[i] = obj[keys[i]];
          }
          return values;
        };
        // Returns the results of applying the iteratee to each element of the object
        // In contrast to _.map it returns an object
        _.mapObject = function (obj, iteratee, context) {
          iteratee = cb(iteratee, context);
          var keys = _.keys(obj), length = keys.length, results = {}, currentKey;
          for (var index = 0; index < length; index++) {
            currentKey = keys[index];
            results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
          }
          return results;
        };
        // Convert an object into a list of `[key, value]` pairs.
        _.pairs = function (obj) {
          var keys = _.keys(obj);
          var length = keys.length;
          var pairs = Array(length);
          for (var i = 0; i < length; i++) {
            pairs[i] = [
              keys[i],
              obj[keys[i]]
            ];
          }
          return pairs;
        };
        // Invert the keys and values of an object. The values must be serializable.
        _.invert = function (obj) {
          var result = {};
          var keys = _.keys(obj);
          for (var i = 0, length = keys.length; i < length; i++) {
            result[obj[keys[i]]] = keys[i];
          }
          return result;
        };
        // Return a sorted list of the function names available on the object.
        // Aliased as `methods`
        _.functions = _.methods = function (obj) {
          var names = [];
          for (var key in obj) {
            if (_.isFunction(obj[key]))
              names.push(key);
          }
          return names.sort();
        };
        // Extend a given object with all the properties in passed-in object(s).
        _.extend = createAssigner(_.allKeys);
        // Assigns a given object with all the own properties in the passed-in object(s)
        // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
        _.extendOwn = _.assign = createAssigner(_.keys);
        // Returns the first key on an object that passes a predicate test
        _.findKey = function (obj, predicate, context) {
          predicate = cb(predicate, context);
          var keys = _.keys(obj), key;
          for (var i = 0, length = keys.length; i < length; i++) {
            key = keys[i];
            if (predicate(obj[key], key, obj))
              return key;
          }
        };
        // Return a copy of the object only containing the whitelisted properties.
        _.pick = function (object, oiteratee, context) {
          var result = {}, obj = object, iteratee, keys;
          if (obj == null)
            return result;
          if (_.isFunction(oiteratee)) {
            keys = _.allKeys(obj);
            iteratee = optimizeCb(oiteratee, context);
          } else {
            keys = flatten(arguments, false, false, 1);
            iteratee = function (value, key, obj) {
              return key in obj;
            };
            obj = Object(obj);
          }
          for (var i = 0, length = keys.length; i < length; i++) {
            var key = keys[i];
            var value = obj[key];
            if (iteratee(value, key, obj))
              result[key] = value;
          }
          return result;
        };
        // Return a copy of the object without the blacklisted properties.
        _.omit = function (obj, iteratee, context) {
          if (_.isFunction(iteratee)) {
            iteratee = _.negate(iteratee);
          } else {
            var keys = _.map(flatten(arguments, false, false, 1), String);
            iteratee = function (value, key) {
              return !_.contains(keys, key);
            };
          }
          return _.pick(obj, iteratee, context);
        };
        // Fill in a given object with default properties.
        _.defaults = createAssigner(_.allKeys, true);
        // Creates an object that inherits from the given prototype object.
        // If additional properties are provided then they will be added to the
        // created object.
        _.create = function (prototype, props) {
          var result = baseCreate(prototype);
          if (props)
            _.extendOwn(result, props);
          return result;
        };
        // Create a (shallow-cloned) duplicate of an object.
        _.clone = function (obj) {
          if (!_.isObject(obj))
            return obj;
          return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
        };
        // Invokes interceptor with the obj, and then returns obj.
        // The primary purpose of this method is to "tap into" a method chain, in
        // order to perform operations on intermediate results within the chain.
        _.tap = function (obj, interceptor) {
          interceptor(obj);
          return obj;
        };
        // Returns whether an object has a given set of `key:value` pairs.
        _.isMatch = function (object, attrs) {
          var keys = _.keys(attrs), length = keys.length;
          if (object == null)
            return !length;
          var obj = Object(object);
          for (var i = 0; i < length; i++) {
            var key = keys[i];
            if (attrs[key] !== obj[key] || !(key in obj))
              return false;
          }
          return true;
        };
        // Internal recursive comparison function for `isEqual`.
        var eq = function (a, b, aStack, bStack) {
          // Identical objects are equal. `0 === -0`, but they aren't identical.
          // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
          if (a === b)
            return a !== 0 || 1 / a === 1 / b;
          // A strict comparison is necessary because `null == undefined`.
          if (a == null || b == null)
            return a === b;
          // Unwrap any wrapped objects.
          if (a instanceof _)
            a = a._wrapped;
          if (b instanceof _)
            b = b._wrapped;
          // Compare `[[Class]]` names.
          var className = toString.call(a);
          if (className !== toString.call(b))
            return false;
          switch (className) {
          // Strings, numbers, regular expressions, dates, and booleans are compared by value.
          case '[object RegExp]':
          // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
          case '[object String]':
            // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
            // equivalent to `new String("5")`.
            return '' + a === '' + b;
          case '[object Number]':
            // `NaN`s are equivalent, but non-reflexive.
            // Object(NaN) is equivalent to NaN
            if (+a !== +a)
              return +b !== +b;
            // An `egal` comparison is performed for other numeric values.
            return +a === 0 ? 1 / +a === 1 / b : +a === +b;
          case '[object Date]':
          case '[object Boolean]':
            // Coerce dates and booleans to numeric primitive values. Dates are compared by their
            // millisecond representations. Note that invalid dates with millisecond representations
            // of `NaN` are not equivalent.
            return +a === +b;
          }
          var areArrays = className === '[object Array]';
          if (!areArrays) {
            if (typeof a != 'object' || typeof b != 'object')
              return false;
            // Objects with different constructors are not equivalent, but `Object`s or `Array`s
            // from different frames are.
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor && _.isFunction(bCtor) && bCtor instanceof bCtor) && ('constructor' in a && 'constructor' in b)) {
              return false;
            }
          }
          // Assume equality for cyclic structures. The algorithm for detecting cyclic
          // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
          // Initializing stack of traversed objects.
          // It's done here since we only need them for objects and arrays comparison.
          aStack = aStack || [];
          bStack = bStack || [];
          var length = aStack.length;
          while (length--) {
            // Linear search. Performance is inversely proportional to the number of
            // unique nested structures.
            if (aStack[length] === a)
              return bStack[length] === b;
          }
          // Add the first object to the stack of traversed objects.
          aStack.push(a);
          bStack.push(b);
          // Recursively compare objects and arrays.
          if (areArrays) {
            // Compare array lengths to determine if a deep comparison is necessary.
            length = a.length;
            if (length !== b.length)
              return false;
            // Deep compare the contents, ignoring non-numeric properties.
            while (length--) {
              if (!eq(a[length], b[length], aStack, bStack))
                return false;
            }
          } else {
            // Deep compare objects.
            var keys = _.keys(a), key;
            length = keys.length;
            // Ensure that both objects contain the same number of properties before comparing deep equality.
            if (_.keys(b).length !== length)
              return false;
            while (length--) {
              // Deep compare each member
              key = keys[length];
              if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack)))
                return false;
            }
          }
          // Remove the first object from the stack of traversed objects.
          aStack.pop();
          bStack.pop();
          return true;
        };
        // Perform a deep comparison to check if two objects are equal.
        _.isEqual = function (a, b) {
          return eq(a, b);
        };
        // Is a given array, string, or object empty?
        // An "empty" object has no enumerable own-properties.
        _.isEmpty = function (obj) {
          if (obj == null)
            return true;
          if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)))
            return obj.length === 0;
          return _.keys(obj).length === 0;
        };
        // Is a given value a DOM element?
        _.isElement = function (obj) {
          return !!(obj && obj.nodeType === 1);
        };
        // Is a given value an array?
        // Delegates to ECMA5's native Array.isArray
        _.isArray = nativeIsArray || function (obj) {
          return toString.call(obj) === '[object Array]';
        };
        // Is a given variable an object?
        _.isObject = function (obj) {
          var type = typeof obj;
          return type === 'function' || type === 'object' && !!obj;
        };
        // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
        _.each([
          'Arguments',
          'Function',
          'String',
          'Number',
          'Date',
          'RegExp',
          'Error'
        ], function (name) {
          _['is' + name] = function (obj) {
            return toString.call(obj) === '[object ' + name + ']';
          };
        });
        // Define a fallback version of the method in browsers (ahem, IE < 9), where
        // there isn't any inspectable "Arguments" type.
        if (!_.isArguments(arguments)) {
          _.isArguments = function (obj) {
            return _.has(obj, 'callee');
          };
        }
        // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
        // IE 11 (#1621), and in Safari 8 (#1929).
        if (typeof /./ != 'function' && typeof Int8Array != 'object') {
          _.isFunction = function (obj) {
            return typeof obj == 'function' || false;
          };
        }
        // Is a given object a finite number?
        _.isFinite = function (obj) {
          return isFinite(obj) && !isNaN(parseFloat(obj));
        };
        // Is the given value `NaN`? (NaN is the only number which does not equal itself).
        _.isNaN = function (obj) {
          return _.isNumber(obj) && obj !== +obj;
        };
        // Is a given value a boolean?
        _.isBoolean = function (obj) {
          return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
        };
        // Is a given value equal to null?
        _.isNull = function (obj) {
          return obj === null;
        };
        // Is a given variable undefined?
        _.isUndefined = function (obj) {
          return obj === void 0;
        };
        // Shortcut function for checking if an object has a given property directly
        // on itself (in other words, not on a prototype).
        _.has = function (obj, key) {
          return obj != null && hasOwnProperty.call(obj, key);
        };
        // Utility Functions
        // -----------------
        // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
        // previous owner. Returns a reference to the Underscore object.
        _.noConflict = function () {
          root._ = previousUnderscore;
          return this;
        };
        // Keep the identity function around for default iteratees.
        _.identity = function (value) {
          return value;
        };
        // Predicate-generating functions. Often useful outside of Underscore.
        _.constant = function (value) {
          return function () {
            return value;
          };
        };
        _.noop = function () {
        };
        _.property = property;
        // Generates a function for a given object that returns a given property.
        _.propertyOf = function (obj) {
          return obj == null ? function () {
          } : function (key) {
            return obj[key];
          };
        };
        // Returns a predicate for checking whether an object has a given set of
        // `key:value` pairs.
        _.matcher = _.matches = function (attrs) {
          attrs = _.extendOwn({}, attrs);
          return function (obj) {
            return _.isMatch(obj, attrs);
          };
        };
        // Run a function **n** times.
        _.times = function (n, iteratee, context) {
          var accum = Array(Math.max(0, n));
          iteratee = optimizeCb(iteratee, context, 1);
          for (var i = 0; i < n; i++)
            accum[i] = iteratee(i);
          return accum;
        };
        // Return a random integer between min and max (inclusive).
        _.random = function (min, max) {
          if (max == null) {
            max = min;
            min = 0;
          }
          return min + Math.floor(Math.random() * (max - min + 1));
        };
        // A (possibly faster) way to get the current timestamp as an integer.
        _.now = Date.now || function () {
          return new Date().getTime();
        };
        // List of HTML entities for escaping.
        var escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#x27;',
            '`': '&#x60;'
          };
        var unescapeMap = _.invert(escapeMap);
        // Functions for escaping and unescaping strings to/from HTML interpolation.
        var createEscaper = function (map) {
          var escaper = function (match) {
            return map[match];
          };
          // Regexes for identifying a key that needs to be escaped
          var source = '(?:' + _.keys(map).join('|') + ')';
          var testRegexp = RegExp(source);
          var replaceRegexp = RegExp(source, 'g');
          return function (string) {
            string = string == null ? '' : '' + string;
            return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
          };
        };
        _.escape = createEscaper(escapeMap);
        _.unescape = createEscaper(unescapeMap);
        // If the value of the named `property` is a function then invoke it with the
        // `object` as context; otherwise, return it.
        _.result = function (object, property, fallback) {
          var value = object == null ? void 0 : object[property];
          if (value === void 0) {
            value = fallback;
          }
          return _.isFunction(value) ? value.call(object) : value;
        };
        // Generate a unique integer id (unique within the entire client session).
        // Useful for temporary DOM ids.
        var idCounter = 0;
        _.uniqueId = function (prefix) {
          var id = ++idCounter + '';
          return prefix ? prefix + id : id;
        };
        // By default, Underscore uses ERB-style template delimiters, change the
        // following template settings to use alternative delimiters.
        _.templateSettings = {
          evaluate: /<%([\s\S]+?)%>/g,
          interpolate: /<%=([\s\S]+?)%>/g,
          escape: /<%-([\s\S]+?)%>/g
        };
        // When customizing `templateSettings`, if you don't want to define an
        // interpolation, evaluation or escaping regex, we need one that is
        // guaranteed not to match.
        var noMatch = /(.)^/;
        // Certain characters need to be escaped so that they can be put into a
        // string literal.
        var escapes = {
            '\'': '\'',
            '\\': '\\',
            '\r': 'r',
            '\n': 'n',
            '\u2028': 'u2028',
            '\u2029': 'u2029'
          };
        var escaper = /\\|'|\r|\n|\u2028|\u2029/g;
        var escapeChar = function (match) {
          return '\\' + escapes[match];
        };
        // JavaScript micro-templating, similar to John Resig's implementation.
        // Underscore templating handles arbitrary delimiters, preserves whitespace,
        // and correctly escapes quotes within interpolated code.
        // NB: `oldSettings` only exists for backwards compatibility.
        _.template = function (text, settings, oldSettings) {
          if (!settings && oldSettings)
            settings = oldSettings;
          settings = _.defaults({}, settings, _.templateSettings);
          // Combine delimiters into one regular expression via alternation.
          var matcher = RegExp([
              (settings.escape || noMatch).source,
              (settings.interpolate || noMatch).source,
              (settings.evaluate || noMatch).source
            ].join('|') + '|$', 'g');
          // Compile the template source, escaping string literals appropriately.
          var index = 0;
          var source = '__p+=\'';
          text.replace(matcher, function (match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset).replace(escaper, escapeChar);
            index = offset + match.length;
            if (escape) {
              source += '\'+\n((__t=(' + escape + '))==null?\'\':_.escape(__t))+\n\'';
            } else if (interpolate) {
              source += '\'+\n((__t=(' + interpolate + '))==null?\'\':__t)+\n\'';
            } else if (evaluate) {
              source += '\';\n' + evaluate + '\n__p+=\'';
            }
            // Adobe VMs need the match returned to produce the correct offest.
            return match;
          });
          source += '\';\n';
          // If a variable is not specified, place data values in local scope.
          if (!settings.variable)
            source = 'with(obj||{}){\n' + source + '}\n';
          source = 'var __t,__p=\'\',__j=Array.prototype.join,' + 'print=function(){__p+=__j.call(arguments,\'\');};\n' + source + 'return __p;\n';
          try {
            var render = new Function(settings.variable || 'obj', '_', source);
          } catch (e) {
            e.source = source;
            throw e;
          }
          var template = function (data) {
            return render.call(this, data, _);
          };
          // Provide the compiled source as a convenience for precompilation.
          var argument = settings.variable || 'obj';
          template.source = 'function(' + argument + '){\n' + source + '}';
          return template;
        };
        // Add a "chain" function. Start chaining a wrapped Underscore object.
        _.chain = function (obj) {
          var instance = _(obj);
          instance._chain = true;
          return instance;
        };
        // OOP
        // ---------------
        // If Underscore is called as a function, it returns a wrapped object that
        // can be used OO-style. This wrapper holds altered versions of all the
        // underscore functions. Wrapped objects may be chained.
        // Helper function to continue chaining intermediate results.
        var result = function (instance, obj) {
          return instance._chain ? _(obj).chain() : obj;
        };
        // Add your own custom functions to the Underscore object.
        _.mixin = function (obj) {
          _.each(_.functions(obj), function (name) {
            var func = _[name] = obj[name];
            _.prototype[name] = function () {
              var args = [this._wrapped];
              push.apply(args, arguments);
              return result(this, func.apply(_, args));
            };
          });
        };
        // Add all of the Underscore functions to the wrapper object.
        _.mixin(_);
        // Add all mutator Array functions to the wrapper.
        _.each([
          'pop',
          'push',
          'reverse',
          'shift',
          'sort',
          'splice',
          'unshift'
        ], function (name) {
          var method = ArrayProto[name];
          _.prototype[name] = function () {
            var obj = this._wrapped;
            method.apply(obj, arguments);
            if ((name === 'shift' || name === 'splice') && obj.length === 0)
              delete obj[0];
            return result(this, obj);
          };
        });
        // Add all accessor Array functions to the wrapper.
        _.each([
          'concat',
          'join',
          'slice'
        ], function (name) {
          var method = ArrayProto[name];
          _.prototype[name] = function () {
            return result(this, method.apply(this._wrapped, arguments));
          };
        });
        // Extracts the result from a wrapped and chained object.
        _.prototype.value = function () {
          return this._wrapped;
        };
        // Provide unwrapping proxy for some methods used in engine operations
        // such as arithmetic and JSON stringification.
        _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;
        _.prototype.toString = function () {
          return '' + this._wrapped;
        };
        // AMD registration happens at the end for compatibility with AMD loaders
        // that may not enforce next-turn semantics on modules. Even though general
        // practice for AMD registration is to be anonymous, underscore registers
        // as a named module because, like jQuery, it is a base library that is
        // popular enough to be bundled in a third party lib, but not be part of
        // an AMD load request. Those cases could generate an error when an
        // anonymous define() is called outside of a loader request.
        if (typeof define === 'function' && define.amd) {
          define('underscore', [], function () {
            return _;
          });
        }
      }.call(this));
    },
    {}
  ]
}, {}, [8]));
(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == 'function' && require;
        if (!u && a)
          return a(o, !0);
        if (i)
          return i(o, !0);
        var f = new Error('Cannot find module \'' + o + '\'');
        throw f.code = 'MODULE_NOT_FOUND', f;
      }
      var l = n[o] = { exports: {} };
      t[o][0].call(l.exports, function (e) {
        var n = t[o][1][e];
        return s(n ? n : e);
      }, l, l.exports, e, t, n, r);
    }
    return n[o].exports;
  }
  var i = typeof require == 'function' && require;
  for (var o = 0; o < r.length; o++)
    s(r[o]);
  return s;
}({}, {}, []));
// CodeMirror is the only global var we claim
window.CodeMirror = function () {
  'use strict';
  // BROWSER SNIFFING
  // Crude, but necessary to handle a number of hard-to-feature-detect
  // bugs and behavior differences.
  var gecko = /gecko\/\d/i.test(navigator.userAgent);
  var ie = /MSIE \d/.test(navigator.userAgent);
  var ie_lt8 = ie && (document.documentMode == null || document.documentMode < 8);
  var ie_lt9 = ie && (document.documentMode == null || document.documentMode < 9);
  var webkit = /WebKit\//.test(navigator.userAgent);
  var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(navigator.userAgent);
  var chrome = /Chrome\//.test(navigator.userAgent);
  var opera = /Opera\//.test(navigator.userAgent);
  var safari = /Apple Computer/.test(navigator.vendor);
  var khtml = /KHTML\//.test(navigator.userAgent);
  var mac_geLion = /Mac OS X 1\d\D([7-9]|\d\d)\D/.test(navigator.userAgent);
  var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(navigator.userAgent);
  var phantom = /PhantomJS/.test(navigator.userAgent);
  var ios = /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent);
  // This is woefully incomplete. Suggestions for alternative methods welcome.
  var mobile = ios || /Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(navigator.userAgent);
  var mac = ios || /Mac/.test(navigator.platform);
  var windows = /windows/i.test(navigator.platform);
  var opera_version = opera && navigator.userAgent.match(/Version\/(\d*\.\d*)/);
  if (opera_version)
    opera_version = Number(opera_version[1]);
  if (opera_version && opera_version >= 15) {
    opera = false;
    webkit = true;
  }
  // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
  var flipCtrlCmd = mac && (qtwebkit || opera && (opera_version == null || opera_version < 12.11));
  var captureMiddleClick = gecko || ie && !ie_lt9;
  // Optimize some code when these features are not used
  var sawReadOnlySpans = false, sawCollapsedSpans = false;
  // CONSTRUCTOR
  function CodeMirror(place, options) {
    if (!(this instanceof CodeMirror))
      return new CodeMirror(place, options);
    this.options = options = options || {};
    // Determine effective options based on given values and defaults.
    for (var opt in defaults)
      if (!options.hasOwnProperty(opt) && defaults.hasOwnProperty(opt))
        options[opt] = defaults[opt];
    setGuttersForLineNumbers(options);
    var docStart = typeof options.value == 'string' ? 0 : options.value.first;
    var display = this.display = makeDisplay(place, docStart);
    display.wrapper.CodeMirror = this;
    updateGutters(this);
    if (options.autofocus && !mobile)
      focusInput(this);
    this.state = {
      keyMaps: [],
      overlays: [],
      modeGen: 0,
      overwrite: false,
      focused: false,
      suppressEdits: false,
      pasteIncoming: false,
      draggingText: false,
      highlight: new Delayed()
    };
    themeChanged(this);
    if (options.lineWrapping)
      this.display.wrapper.className += ' CodeMirror-wrap';
    var doc = options.value;
    if (typeof doc == 'string')
      doc = new Doc(options.value, options.mode);
    operation(this, attachDoc)(this, doc);
    // Override magic textarea content restore that IE sometimes does
    // on our hidden textarea on reload
    if (ie)
      setTimeout(bind(resetInput, this, true), 20);
    registerEventHandlers(this);
    // IE throws unspecified error in certain cases, when
    // trying to access activeElement before onload
    var hasFocus;
    try {
      hasFocus = document.activeElement == display.input;
    } catch (e) {
    }
    if (hasFocus || options.autofocus && !mobile)
      setTimeout(bind(onFocus, this), 20);
    else
      onBlur(this);
    operation(this, function () {
      for (var opt in optionHandlers)
        if (optionHandlers.propertyIsEnumerable(opt))
          optionHandlers[opt](this, options[opt], Init);
      for (var i = 0; i < initHooks.length; ++i)
        initHooks[i](this);
    })();
  }
  // DISPLAY CONSTRUCTOR
  function makeDisplay(place, docStart) {
    var d = {};
    var input = d.input = elt('textarea', null, null, 'position: absolute; padding: 0; width: 1px; height: 1em; outline: none; font-size: 4px;');
    if (webkit)
      input.style.width = '1000px';
    else
      input.setAttribute('wrap', 'off');
    // if border: 0; -- iOS fails to open keyboard (issue #1287)
    if (ios)
      input.style.border = '1px solid black';
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    // Wraps and hides input textarea
    d.inputDiv = elt('div', [input], null, 'overflow: hidden; position: relative; width: 3px; height: 0px;');
    // The actual fake scrollbars.
    d.scrollbarH = elt('div', [elt('div', null, null, 'height: 1px')], 'CodeMirror-hscrollbar');
    d.scrollbarV = elt('div', [elt('div', null, null, 'width: 1px')], 'CodeMirror-vscrollbar');
    d.scrollbarFiller = elt('div', null, 'CodeMirror-scrollbar-filler');
    d.gutterFiller = elt('div', null, 'CodeMirror-gutter-filler');
    // DIVs containing the selection and the actual code
    d.lineDiv = elt('div', null, 'CodeMirror-code');
    d.selectionDiv = elt('div', null, null, 'position: relative; z-index: 1');
    // Blinky cursor, and element used to ensure cursor fits at the end of a line
    d.cursor = elt('div', '\xa0', 'CodeMirror-cursor');
    // Secondary cursor, shown when on a 'jump' in bi-directional text
    d.otherCursor = elt('div', '\xa0', 'CodeMirror-cursor CodeMirror-secondarycursor');
    // Used to measure text size
    d.measure = elt('div', null, 'CodeMirror-measure');
    // Wraps everything that needs to exist inside the vertically-padded coordinate system
    d.lineSpace = elt('div', [
      d.measure,
      d.selectionDiv,
      d.lineDiv,
      d.cursor,
      d.otherCursor
    ], null, 'position: relative; outline: none');
    // Moved around its parent to cover visible view
    d.mover = elt('div', [elt('div', [d.lineSpace], 'CodeMirror-lines')], null, 'position: relative');
    // Set to the height of the text, causes scrolling
    d.sizer = elt('div', [d.mover], 'CodeMirror-sizer');
    // D is needed because behavior of elts with overflow: auto and padding is inconsistent across browsers
    d.heightForcer = elt('div', null, null, 'position: absolute; height: ' + scrollerCutOff + 'px; width: 1px;');
    // Will contain the gutters, if any
    d.gutters = elt('div', null, 'CodeMirror-gutters');
    d.lineGutter = null;
    // Provides scrolling
    d.scroller = elt('div', [
      d.sizer,
      d.heightForcer,
      d.gutters
    ], 'CodeMirror-scroll');
    d.scroller.setAttribute('tabIndex', '-1');
    // The element in which the editor lives.
    d.wrapper = elt('div', [
      d.inputDiv,
      d.scrollbarH,
      d.scrollbarV,
      d.scrollbarFiller,
      d.gutterFiller,
      d.scroller
    ], 'CodeMirror');
    // Work around IE7 z-index bug
    if (ie_lt8) {
      d.gutters.style.zIndex = -1;
      d.scroller.style.paddingRight = 0;
    }
    if (place.appendChild)
      place.appendChild(d.wrapper);
    else
      place(d.wrapper);
    // Needed to hide big blue blinking cursor on Mobile Safari
    if (ios)
      input.style.width = '0px';
    if (!webkit)
      d.scroller.draggable = true;
    // Needed to handle Tab key in KHTML
    if (khtml) {
      d.inputDiv.style.height = '1px';
      d.inputDiv.style.position = 'absolute';
    }  // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
    else if (ie_lt8)
      d.scrollbarH.style.minWidth = d.scrollbarV.style.minWidth = '18px';
    // Current visible range (may be bigger than the view window).
    d.viewOffset = d.lastSizeC = 0;
    d.showingFrom = d.showingTo = docStart;
    // Used to only resize the line number gutter when necessary (when
    // the amount of lines crosses a boundary that makes its width change)
    d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
    // See readInput and resetInput
    d.prevInput = '';
    // Set to true when a non-horizontal-scrolling widget is added. As
    // an optimization, widget aligning is skipped when d is false.
    d.alignWidgets = false;
    // Flag that indicates whether we currently expect input to appear
    // (after some event like 'keypress' or 'input') and are polling
    // intensively.
    d.pollingFast = false;
    // Self-resetting timeout for the poller
    d.poll = new Delayed();
    d.cachedCharWidth = d.cachedTextHeight = null;
    d.measureLineCache = [];
    d.measureLineCachePos = 0;
    // Tracks when resetInput has punted to just putting a short
    // string instead of the (large) selection.
    d.inaccurateSelection = false;
    // Tracks the maximum line length so that the horizontal scrollbar
    // can be kept static when scrolling.
    d.maxLine = null;
    d.maxLineLength = 0;
    d.maxLineChanged = false;
    // Used for measuring wheel scrolling granularity
    d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;
    return d;
  }
  // STATE UPDATES
  // Used to get the editor into a consistent state again when options change.
  function loadMode(cm) {
    cm.doc.mode = CodeMirror.getMode(cm.options, cm.doc.modeOption);
    cm.doc.iter(function (line) {
      if (line.stateAfter)
        line.stateAfter = null;
      if (line.styles)
        line.styles = null;
    });
    cm.doc.frontier = cm.doc.first;
    startWorker(cm, 100);
    cm.state.modeGen++;
    if (cm.curOp)
      regChange(cm);
  }
  function wrappingChanged(cm) {
    if (cm.options.lineWrapping) {
      cm.display.wrapper.className += ' CodeMirror-wrap';
      cm.display.sizer.style.minWidth = '';
    } else {
      cm.display.wrapper.className = cm.display.wrapper.className.replace(' CodeMirror-wrap', '');
      computeMaxLength(cm);
    }
    estimateLineHeights(cm);
    regChange(cm);
    clearCaches(cm);
    setTimeout(function () {
      updateScrollbars(cm);
    }, 100);
  }
  function estimateHeight(cm) {
    var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
    var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
    return function (line) {
      if (lineIsHidden(cm.doc, line))
        return 0;
      else if (wrapping)
        return (Math.ceil(line.text.length / perLine) || 1) * th;
      else
        return th;
    };
  }
  function estimateLineHeights(cm) {
    var doc = cm.doc, est = estimateHeight(cm);
    doc.iter(function (line) {
      var estHeight = est(line);
      if (estHeight != line.height)
        updateLineHeight(line, estHeight);
    });
  }
  function keyMapChanged(cm) {
    var map = keyMap[cm.options.keyMap], style = map.style;
    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-keymap-\S+/g, '') + (style ? ' cm-keymap-' + style : '');
    cm.state.disableInput = map.disableInput;
  }
  function themeChanged(cm) {
    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, '') + cm.options.theme.replace(/(^|\s)\s*/g, ' cm-s-');
    clearCaches(cm);
  }
  function guttersChanged(cm) {
    updateGutters(cm);
    regChange(cm);
    setTimeout(function () {
      alignHorizontally(cm);
    }, 20);
  }
  function updateGutters(cm) {
    var gutters = cm.display.gutters, specs = cm.options.gutters;
    removeChildren(gutters);
    for (var i = 0; i < specs.length; ++i) {
      var gutterClass = specs[i];
      var gElt = gutters.appendChild(elt('div', null, 'CodeMirror-gutter ' + gutterClass));
      if (gutterClass == 'CodeMirror-linenumbers') {
        cm.display.lineGutter = gElt;
        gElt.style.width = (cm.display.lineNumWidth || 1) + 'px';
      }
    }
    gutters.style.display = i ? '' : 'none';
  }
  function lineLength(doc, line) {
    if (line.height == 0)
      return 0;
    var len = line.text.length, merged, cur = line;
    while (merged = collapsedSpanAtStart(cur)) {
      var found = merged.find();
      cur = getLine(doc, found.from.line);
      len += found.from.ch - found.to.ch;
    }
    cur = line;
    while (merged = collapsedSpanAtEnd(cur)) {
      var found = merged.find();
      len -= cur.text.length - found.from.ch;
      cur = getLine(doc, found.to.line);
      len += cur.text.length - found.to.ch;
    }
    return len;
  }
  function computeMaxLength(cm) {
    var d = cm.display, doc = cm.doc;
    d.maxLine = getLine(doc, doc.first);
    d.maxLineLength = lineLength(doc, d.maxLine);
    d.maxLineChanged = true;
    doc.iter(function (line) {
      var len = lineLength(doc, line);
      if (len > d.maxLineLength) {
        d.maxLineLength = len;
        d.maxLine = line;
      }
    });
  }
  // Make sure the gutters options contains the element
  // "CodeMirror-linenumbers" when the lineNumbers option is true.
  function setGuttersForLineNumbers(options) {
    var found = false;
    for (var i = 0; i < options.gutters.length; ++i) {
      if (options.gutters[i] == 'CodeMirror-linenumbers') {
        if (options.lineNumbers)
          found = true;
        else
          options.gutters.splice(i--, 1);
      }
    }
    if (!found && options.lineNumbers)
      options.gutters.push('CodeMirror-linenumbers');
  }
  // SCROLLBARS
  // Re-synchronize the fake scrollbars with the actual size of the
  // content. Optionally force a scrollTop.
  function updateScrollbars(cm) {
    var d = cm.display, docHeight = cm.doc.height;
    var totalHeight = docHeight + paddingVert(d);
    d.sizer.style.minHeight = d.heightForcer.style.top = totalHeight + 'px';
    d.gutters.style.height = Math.max(totalHeight, d.scroller.clientHeight - scrollerCutOff) + 'px';
    var scrollHeight = Math.max(totalHeight, d.scroller.scrollHeight);
    var needsH = d.scroller.scrollWidth > d.scroller.clientWidth + 1;
    var needsV = scrollHeight > d.scroller.clientHeight + 1;
    if (needsV) {
      d.scrollbarV.style.display = 'block';
      d.scrollbarV.style.bottom = needsH ? scrollbarWidth(d.measure) + 'px' : '0';
      d.scrollbarV.firstChild.style.height = scrollHeight - d.scroller.clientHeight + d.scrollbarV.clientHeight + 'px';
    } else
      d.scrollbarV.style.display = '';
    if (needsH) {
      d.scrollbarH.style.display = 'block';
      d.scrollbarH.style.right = needsV ? scrollbarWidth(d.measure) + 'px' : '0';
      d.scrollbarH.firstChild.style.width = d.scroller.scrollWidth - d.scroller.clientWidth + d.scrollbarH.clientWidth + 'px';
    } else
      d.scrollbarH.style.display = '';
    if (needsH && needsV) {
      d.scrollbarFiller.style.display = 'block';
      d.scrollbarFiller.style.height = d.scrollbarFiller.style.width = scrollbarWidth(d.measure) + 'px';
    } else
      d.scrollbarFiller.style.display = '';
    if (needsH && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
      d.gutterFiller.style.display = 'block';
      d.gutterFiller.style.height = scrollbarWidth(d.measure) + 'px';
      d.gutterFiller.style.width = d.gutters.offsetWidth + 'px';
    } else
      d.gutterFiller.style.display = '';
    if (mac_geLion && scrollbarWidth(d.measure) === 0)
      d.scrollbarV.style.minWidth = d.scrollbarH.style.minHeight = mac_geMountainLion ? '18px' : '12px';
  }
  function visibleLines(display, doc, viewPort) {
    var top = display.scroller.scrollTop, height = display.wrapper.clientHeight;
    if (typeof viewPort == 'number')
      top = viewPort;
    else if (viewPort) {
      top = viewPort.top;
      height = viewPort.bottom - viewPort.top;
    }
    top = Math.floor(top - paddingTop(display));
    var bottom = Math.ceil(top + height);
    return {
      from: lineAtHeight(doc, top),
      to: lineAtHeight(doc, bottom)
    };
  }
  // LINE NUMBERS
  function alignHorizontally(cm) {
    var display = cm.display;
    if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter))
      return;
    var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
    var gutterW = display.gutters.offsetWidth, l = comp + 'px';
    for (var n = display.lineDiv.firstChild; n; n = n.nextSibling)
      if (n.alignable) {
        for (var i = 0, a = n.alignable; i < a.length; ++i)
          a[i].style.left = l;
      }
    if (cm.options.fixedGutter)
      display.gutters.style.left = comp + gutterW + 'px';
  }
  function maybeUpdateLineNumberWidth(cm) {
    if (!cm.options.lineNumbers)
      return false;
    var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
    if (last.length != display.lineNumChars) {
      var test = display.measure.appendChild(elt('div', [elt('div', last)], 'CodeMirror-linenumber CodeMirror-gutter-elt'));
      var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
      display.lineGutter.style.width = '';
      display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding);
      display.lineNumWidth = display.lineNumInnerWidth + padding;
      display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
      display.lineGutter.style.width = display.lineNumWidth + 'px';
      return true;
    }
    return false;
  }
  function lineNumberFor(options, i) {
    return String(options.lineNumberFormatter(i + options.firstLineNumber));
  }
  function compensateForHScroll(display) {
    return getRect(display.scroller).left - getRect(display.sizer).left;
  }
  // DISPLAY DRAWING
  function updateDisplay(cm, changes, viewPort, forced) {
    var oldFrom = cm.display.showingFrom, oldTo = cm.display.showingTo, updated;
    var visible = visibleLines(cm.display, cm.doc, viewPort);
    for (;;) {
      if (!updateDisplayInner(cm, changes, visible, forced))
        break;
      forced = false;
      updated = true;
      updateSelection(cm);
      updateScrollbars(cm);
      // Clip forced viewport to actual scrollable area
      if (viewPort)
        viewPort = Math.min(cm.display.scroller.scrollHeight - cm.display.scroller.clientHeight, typeof viewPort == 'number' ? viewPort : viewPort.top);
      visible = visibleLines(cm.display, cm.doc, viewPort);
      if (visible.from >= cm.display.showingFrom && visible.to <= cm.display.showingTo)
        break;
      changes = [];
    }
    if (updated) {
      signalLater(cm, 'update', cm);
      if (cm.display.showingFrom != oldFrom || cm.display.showingTo != oldTo)
        signalLater(cm, 'viewportChange', cm, cm.display.showingFrom, cm.display.showingTo);
    }
    return updated;
  }
  // Uses a set of changes plus the current scroll position to
  // determine which DOM updates have to be made, and makes the
  // updates.
  function updateDisplayInner(cm, changes, visible, forced) {
    var display = cm.display, doc = cm.doc;
    if (!display.wrapper.clientWidth) {
      display.showingFrom = display.showingTo = doc.first;
      display.viewOffset = 0;
      return;
    }
    // Bail out if the visible area is already rendered and nothing changed.
    if (!forced && changes.length == 0 && visible.from > display.showingFrom && visible.to < display.showingTo)
      return;
    if (maybeUpdateLineNumberWidth(cm))
      changes = [{
          from: doc.first,
          to: doc.first + doc.size
        }];
    var gutterW = display.sizer.style.marginLeft = display.gutters.offsetWidth + 'px';
    display.scrollbarH.style.left = cm.options.fixedGutter ? gutterW : '0';
    // Used to determine which lines need their line numbers updated
    var positionsChangedFrom = Infinity;
    if (cm.options.lineNumbers)
      for (var i = 0; i < changes.length; ++i)
        if (changes[i].diff) {
          positionsChangedFrom = changes[i].from;
          break;
        }
    var end = doc.first + doc.size;
    var from = Math.max(visible.from - cm.options.viewportMargin, doc.first);
    var to = Math.min(end, visible.to + cm.options.viewportMargin);
    if (display.showingFrom < from && from - display.showingFrom < 20)
      from = Math.max(doc.first, display.showingFrom);
    if (display.showingTo > to && display.showingTo - to < 20)
      to = Math.min(end, display.showingTo);
    if (sawCollapsedSpans) {
      from = lineNo(visualLine(doc, getLine(doc, from)));
      while (to < end && lineIsHidden(doc, getLine(doc, to)))
        ++to;
    }
    // Create a range of theoretically intact lines, and punch holes
    // in that using the change info.
    var intact = [{
          from: Math.max(display.showingFrom, doc.first),
          to: Math.min(display.showingTo, end)
        }];
    if (intact[0].from >= intact[0].to)
      intact = [];
    else
      intact = computeIntact(intact, changes);
    // When merged lines are present, we might have to reduce the
    // intact ranges because changes in continued fragments of the
    // intact lines do require the lines to be redrawn.
    if (sawCollapsedSpans)
      for (var i = 0; i < intact.length; ++i) {
        var range = intact[i], merged;
        while (merged = collapsedSpanAtEnd(getLine(doc, range.to - 1))) {
          var newTo = merged.find().from.line;
          if (newTo > range.from)
            range.to = newTo;
          else {
            intact.splice(i--, 1);
            break;
          }
        }
      }
    // Clip off the parts that won't be visible
    var intactLines = 0;
    for (var i = 0; i < intact.length; ++i) {
      var range = intact[i];
      if (range.from < from)
        range.from = from;
      if (range.to > to)
        range.to = to;
      if (range.from >= range.to)
        intact.splice(i--, 1);
      else
        intactLines += range.to - range.from;
    }
    if (!forced && intactLines == to - from && from == display.showingFrom && to == display.showingTo) {
      updateViewOffset(cm);
      return;
    }
    intact.sort(function (a, b) {
      return a.from - b.from;
    });
    // Avoid crashing on IE's "unspecified error" when in iframes
    try {
      var focused = document.activeElement;
    } catch (e) {
    }
    if (intactLines < (to - from) * 0.7)
      display.lineDiv.style.display = 'none';
    patchDisplay(cm, from, to, intact, positionsChangedFrom);
    display.lineDiv.style.display = '';
    if (focused && document.activeElement != focused && focused.offsetHeight)
      focused.focus();
    var different = from != display.showingFrom || to != display.showingTo || display.lastSizeC != display.wrapper.clientHeight;
    // This is just a bogus formula that detects when the editor is
    // resized or the font size changes.
    if (different) {
      display.lastSizeC = display.wrapper.clientHeight;
      startWorker(cm, 400);
    }
    display.showingFrom = from;
    display.showingTo = to;
    updateHeightsInViewport(cm);
    updateViewOffset(cm);
    return true;
  }
  function updateHeightsInViewport(cm) {
    var display = cm.display;
    var prevBottom = display.lineDiv.offsetTop;
    for (var node = display.lineDiv.firstChild, height; node; node = node.nextSibling)
      if (node.lineObj) {
        if (ie_lt8) {
          var bot = node.offsetTop + node.offsetHeight;
          height = bot - prevBottom;
          prevBottom = bot;
        } else {
          var box = getRect(node);
          height = box.bottom - box.top;
        }
        var diff = node.lineObj.height - height;
        if (height < 2)
          height = textHeight(display);
        if (diff > 0.001 || diff < -0.001) {
          updateLineHeight(node.lineObj, height);
          var widgets = node.lineObj.widgets;
          if (widgets)
            for (var i = 0; i < widgets.length; ++i)
              widgets[i].height = widgets[i].node.offsetHeight;
        }
      }
  }
  function updateViewOffset(cm) {
    var off = cm.display.viewOffset = heightAtLine(cm, getLine(cm.doc, cm.display.showingFrom));
    // Position the mover div to align with the current virtual scroll position
    cm.display.mover.style.top = off + 'px';
  }
  function computeIntact(intact, changes) {
    for (var i = 0, l = changes.length || 0; i < l; ++i) {
      var change = changes[i], intact2 = [], diff = change.diff || 0;
      for (var j = 0, l2 = intact.length; j < l2; ++j) {
        var range = intact[j];
        if (change.to <= range.from && change.diff) {
          intact2.push({
            from: range.from + diff,
            to: range.to + diff
          });
        } else if (change.to <= range.from || change.from >= range.to) {
          intact2.push(range);
        } else {
          if (change.from > range.from)
            intact2.push({
              from: range.from,
              to: change.from
            });
          if (change.to < range.to)
            intact2.push({
              from: change.to + diff,
              to: range.to + diff
            });
        }
      }
      intact = intact2;
    }
    return intact;
  }
  function getDimensions(cm) {
    var d = cm.display, left = {}, width = {};
    for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
      left[cm.options.gutters[i]] = n.offsetLeft;
      width[cm.options.gutters[i]] = n.offsetWidth;
    }
    return {
      fixedPos: compensateForHScroll(d),
      gutterTotalWidth: d.gutters.offsetWidth,
      gutterLeft: left,
      gutterWidth: width,
      wrapperWidth: d.wrapper.clientWidth
    };
  }
  function patchDisplay(cm, from, to, intact, updateNumbersFrom) {
    var dims = getDimensions(cm);
    var display = cm.display, lineNumbers = cm.options.lineNumbers;
    if (!intact.length && (!webkit || !cm.display.currentWheelTarget))
      removeChildren(display.lineDiv);
    var container = display.lineDiv, cur = container.firstChild;
    function rm(node) {
      var next = node.nextSibling;
      if (webkit && mac && cm.display.currentWheelTarget == node) {
        node.style.display = 'none';
        node.lineObj = null;
      } else {
        node.parentNode.removeChild(node);
      }
      return next;
    }
    var nextIntact = intact.shift(), lineN = from;
    cm.doc.iter(from, to, function (line) {
      if (nextIntact && nextIntact.to == lineN)
        nextIntact = intact.shift();
      if (lineIsHidden(cm.doc, line)) {
        if (line.height != 0)
          updateLineHeight(line, 0);
        if (line.widgets && cur.previousSibling)
          for (var i = 0; i < line.widgets.length; ++i) {
            var w = line.widgets[i];
            if (w.showIfHidden) {
              var prev = cur.previousSibling;
              if (/pre/i.test(prev.nodeName)) {
                var wrap = elt('div', null, null, 'position: relative');
                prev.parentNode.replaceChild(wrap, prev);
                wrap.appendChild(prev);
                prev = wrap;
              }
              var wnode = prev.appendChild(elt('div', [w.node], 'CodeMirror-linewidget'));
              if (!w.handleMouseEvents)
                wnode.ignoreEvents = true;
              positionLineWidget(w, wnode, prev, dims);
            }
          }
      } else if (nextIntact && nextIntact.from <= lineN && nextIntact.to > lineN) {
        // This line is intact. Skip to the actual node. Update its
        // line number if needed.
        while (cur.lineObj != line)
          cur = rm(cur);
        if (lineNumbers && updateNumbersFrom <= lineN && cur.lineNumber)
          setTextContent(cur.lineNumber, lineNumberFor(cm.options, lineN));
        cur = cur.nextSibling;
      } else {
        // For lines with widgets, make an attempt to find and reuse
        // the existing element, so that widgets aren't needlessly
        // removed and re-inserted into the dom
        if (line.widgets)
          for (var j = 0, search = cur, reuse; search && j < 20; ++j, search = search.nextSibling)
            if (search.lineObj == line && /div/i.test(search.nodeName)) {
              reuse = search;
              break;
            }
        // This line needs to be generated.
        var lineNode = buildLineElement(cm, line, lineN, dims, reuse);
        if (lineNode != reuse) {
          container.insertBefore(lineNode, cur);
        } else {
          while (cur != reuse)
            cur = rm(cur);
          cur = cur.nextSibling;
        }
        lineNode.lineObj = line;
      }
      ++lineN;
    });
    while (cur)
      cur = rm(cur);
  }
  function buildLineElement(cm, line, lineNo, dims, reuse) {
    var lineElement = lineContent(cm, line);
    var markers = line.gutterMarkers, display = cm.display, wrap;
    if (!cm.options.lineNumbers && !markers && !line.bgClass && !line.wrapClass && !line.widgets)
      return lineElement;
    // Lines with gutter elements, widgets or a background class need
    // to be wrapped again, and have the extra elements added to the
    // wrapper div
    if (reuse) {
      reuse.alignable = null;
      var isOk = true, widgetsSeen = 0, insertBefore = null;
      for (var n = reuse.firstChild, next; n; n = next) {
        next = n.nextSibling;
        if (!/\bCodeMirror-linewidget\b/.test(n.className)) {
          reuse.removeChild(n);
        } else {
          for (var i = 0; i < line.widgets.length; ++i) {
            var widget = line.widgets[i];
            if (widget.node == n.firstChild) {
              if (!widget.above && !insertBefore)
                insertBefore = n;
              positionLineWidget(widget, n, reuse, dims);
              ++widgetsSeen;
              break;
            }
          }
          if (i == line.widgets.length) {
            isOk = false;
            break;
          }
        }
      }
      reuse.insertBefore(lineElement, insertBefore);
      if (isOk && widgetsSeen == line.widgets.length) {
        wrap = reuse;
        reuse.className = line.wrapClass || '';
      }
    }
    if (!wrap) {
      wrap = elt('div', null, line.wrapClass, 'position: relative');
      wrap.appendChild(lineElement);
    }
    // Kludge to make sure the styled element lies behind the selection (by z-index)
    if (line.bgClass)
      wrap.insertBefore(elt('div', null, line.bgClass + ' CodeMirror-linebackground'), wrap.firstChild);
    if (cm.options.lineNumbers || markers) {
      var gutterWrap = wrap.insertBefore(elt('div', null, null, 'position: absolute; left: ' + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + 'px'), wrap.firstChild);
      if (cm.options.fixedGutter)
        (wrap.alignable || (wrap.alignable = [])).push(gutterWrap);
      if (cm.options.lineNumbers && (!markers || !markers['CodeMirror-linenumbers']))
        wrap.lineNumber = gutterWrap.appendChild(elt('div', lineNumberFor(cm.options, lineNo), 'CodeMirror-linenumber CodeMirror-gutter-elt', 'left: ' + dims.gutterLeft['CodeMirror-linenumbers'] + 'px; width: ' + display.lineNumInnerWidth + 'px'));
      if (markers)
        for (var k = 0; k < cm.options.gutters.length; ++k) {
          var id = cm.options.gutters[k], found = markers.hasOwnProperty(id) && markers[id];
          if (found)
            gutterWrap.appendChild(elt('div', [found], 'CodeMirror-gutter-elt', 'left: ' + dims.gutterLeft[id] + 'px; width: ' + dims.gutterWidth[id] + 'px'));
        }
    }
    if (ie_lt8)
      wrap.style.zIndex = 2;
    if (line.widgets && wrap != reuse)
      for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
        var widget = ws[i], node = elt('div', [widget.node], 'CodeMirror-linewidget');
        if (!widget.handleMouseEvents)
          node.ignoreEvents = true;
        positionLineWidget(widget, node, wrap, dims);
        if (widget.above)
          wrap.insertBefore(node, cm.options.lineNumbers && line.height != 0 ? gutterWrap : lineElement);
        else
          wrap.appendChild(node);
        signalLater(widget, 'redraw');
      }
    return wrap;
  }
  function positionLineWidget(widget, node, wrap, dims) {
    if (widget.noHScroll) {
      (wrap.alignable || (wrap.alignable = [])).push(node);
      var width = dims.wrapperWidth;
      node.style.left = dims.fixedPos + 'px';
      if (!widget.coverGutter) {
        width -= dims.gutterTotalWidth;
        node.style.paddingLeft = dims.gutterTotalWidth + 'px';
      }
      node.style.width = width + 'px';
    }
    if (widget.coverGutter) {
      node.style.zIndex = 5;
      node.style.position = 'relative';
      if (!widget.noHScroll)
        node.style.marginLeft = -dims.gutterTotalWidth + 'px';
    }
  }
  // SELECTION / CURSOR
  function updateSelection(cm) {
    var display = cm.display;
    var collapsed = posEq(cm.doc.sel.from, cm.doc.sel.to);
    if (collapsed || cm.options.showCursorWhenSelecting)
      updateSelectionCursor(cm);
    else
      display.cursor.style.display = display.otherCursor.style.display = 'none';
    if (!collapsed)
      updateSelectionRange(cm);
    else
      display.selectionDiv.style.display = 'none';
    // Move the hidden textarea near the cursor to prevent scrolling artifacts
    if (cm.options.moveInputWithCursor) {
      var headPos = cursorCoords(cm, cm.doc.sel.head, 'div');
      var wrapOff = getRect(display.wrapper), lineOff = getRect(display.lineDiv);
      display.inputDiv.style.top = Math.max(0, Math.min(display.wrapper.clientHeight - 10, headPos.top + lineOff.top - wrapOff.top)) + 'px';
      display.inputDiv.style.left = Math.max(0, Math.min(display.wrapper.clientWidth - 10, headPos.left + lineOff.left - wrapOff.left)) + 'px';
    }
  }
  // No selection, plain cursor
  function updateSelectionCursor(cm) {
    var display = cm.display, pos = cursorCoords(cm, cm.doc.sel.head, 'div');
    display.cursor.style.left = pos.left + 'px';
    display.cursor.style.top = pos.top + 'px';
    display.cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + 'px';
    display.cursor.style.display = '';
    if (pos.other) {
      display.otherCursor.style.display = '';
      display.otherCursor.style.left = pos.other.left + 'px';
      display.otherCursor.style.top = pos.other.top + 'px';
      display.otherCursor.style.height = (pos.other.bottom - pos.other.top) * 0.85 + 'px';
    } else {
      display.otherCursor.style.display = 'none';
    }
  }
  // Highlight selection
  function updateSelectionRange(cm) {
    var display = cm.display, doc = cm.doc, sel = cm.doc.sel;
    var fragment = document.createDocumentFragment();
    var clientWidth = display.lineSpace.offsetWidth, pl = paddingLeft(cm.display);
    function add(left, top, width, bottom) {
      if (top < 0)
        top = 0;
      fragment.appendChild(elt('div', null, 'CodeMirror-selected', 'position: absolute; left: ' + left + 'px; top: ' + top + 'px; width: ' + (width == null ? clientWidth - left : width) + 'px; height: ' + (bottom - top) + 'px'));
    }
    function drawForLine(line, fromArg, toArg) {
      var lineObj = getLine(doc, line);
      var lineLen = lineObj.text.length;
      var start, end;
      function coords(ch, bias) {
        return charCoords(cm, Pos(line, ch), 'div', lineObj, bias);
      }
      iterateBidiSections(getOrder(lineObj), fromArg || 0, toArg == null ? lineLen : toArg, function (from, to, dir) {
        var leftPos = coords(from, 'left'), rightPos, left, right;
        if (from == to) {
          rightPos = leftPos;
          left = right = leftPos.left;
        } else {
          rightPos = coords(to - 1, 'right');
          if (dir == 'rtl') {
            var tmp = leftPos;
            leftPos = rightPos;
            rightPos = tmp;
          }
          left = leftPos.left;
          right = rightPos.right;
        }
        if (fromArg == null && from == 0)
          left = pl;
        if (rightPos.top - leftPos.top > 3) {
          // Different lines, draw top part
          add(left, leftPos.top, null, leftPos.bottom);
          left = pl;
          if (leftPos.bottom < rightPos.top)
            add(left, leftPos.bottom, null, rightPos.top);
        }
        if (toArg == null && to == lineLen)
          right = clientWidth;
        if (!start || leftPos.top < start.top || leftPos.top == start.top && leftPos.left < start.left)
          start = leftPos;
        if (!end || rightPos.bottom > end.bottom || rightPos.bottom == end.bottom && rightPos.right > end.right)
          end = rightPos;
        if (left < pl + 1)
          left = pl;
        add(left, rightPos.top, right - left, rightPos.bottom);
      });
      return {
        start: start,
        end: end
      };
    }
    if (sel.from.line == sel.to.line) {
      drawForLine(sel.from.line, sel.from.ch, sel.to.ch);
    } else {
      var fromLine = getLine(doc, sel.from.line), toLine = getLine(doc, sel.to.line);
      var singleVLine = visualLine(doc, fromLine) == visualLine(doc, toLine);
      var leftEnd = drawForLine(sel.from.line, sel.from.ch, singleVLine ? fromLine.text.length : null).end;
      var rightStart = drawForLine(sel.to.line, singleVLine ? 0 : null, sel.to.ch).start;
      if (singleVLine) {
        if (leftEnd.top < rightStart.top - 2) {
          add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
          add(pl, rightStart.top, rightStart.left, rightStart.bottom);
        } else {
          add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
        }
      }
      if (leftEnd.bottom < rightStart.top)
        add(pl, leftEnd.bottom, null, rightStart.top);
    }
    removeChildrenAndAdd(display.selectionDiv, fragment);
    display.selectionDiv.style.display = '';
  }
  // Cursor-blinking
  function restartBlink(cm) {
    if (!cm.state.focused)
      return;
    var display = cm.display;
    clearInterval(display.blinker);
    var on = true;
    display.cursor.style.visibility = display.otherCursor.style.visibility = '';
    display.blinker = setInterval(function () {
      display.cursor.style.visibility = display.otherCursor.style.visibility = (on = !on) ? '' : 'hidden';
    }, cm.options.cursorBlinkRate);
  }
  // HIGHLIGHT WORKER
  function startWorker(cm, time) {
    if (cm.doc.mode.startState && cm.doc.frontier < cm.display.showingTo)
      cm.state.highlight.set(time, bind(highlightWorker, cm));
  }
  function highlightWorker(cm) {
    var doc = cm.doc;
    if (doc.frontier < doc.first)
      doc.frontier = doc.first;
    if (doc.frontier >= cm.display.showingTo)
      return;
    var end = +new Date() + cm.options.workTime;
    var state = copyState(doc.mode, getStateBefore(cm, doc.frontier));
    var changed = [], prevChange;
    doc.iter(doc.frontier, Math.min(doc.first + doc.size, cm.display.showingTo + 500), function (line) {
      if (doc.frontier >= cm.display.showingFrom) {
        // Visible
        var oldStyles = line.styles;
        line.styles = highlightLine(cm, line, state);
        var ischange = !oldStyles || oldStyles.length != line.styles.length;
        for (var i = 0; !ischange && i < oldStyles.length; ++i)
          ischange = oldStyles[i] != line.styles[i];
        if (ischange) {
          if (prevChange && prevChange.end == doc.frontier)
            prevChange.end++;
          else
            changed.push(prevChange = {
              start: doc.frontier,
              end: doc.frontier + 1
            });
        }
        line.stateAfter = copyState(doc.mode, state);
      } else {
        processLine(cm, line, state);
        line.stateAfter = doc.frontier % 5 == 0 ? copyState(doc.mode, state) : null;
      }
      ++doc.frontier;
      if (+new Date() > end) {
        startWorker(cm, cm.options.workDelay);
        return true;
      }
    });
    if (changed.length)
      operation(cm, function () {
        for (var i = 0; i < changed.length; ++i)
          regChange(this, changed[i].start, changed[i].end);
      })();
  }
  // Finds the line to start with when starting a parse. Tries to
  // find a line with a stateAfter, so that it can start with a
  // valid state. If that fails, it returns the line with the
  // smallest indentation, which tends to need the least context to
  // parse correctly.
  function findStartLine(cm, n, precise) {
    var minindent, minline, doc = cm.doc;
    for (var search = n, lim = n - 100; search > lim; --search) {
      if (search <= doc.first)
        return doc.first;
      var line = getLine(doc, search - 1);
      if (line.stateAfter && (!precise || search <= doc.frontier))
        return search;
      var indented = countColumn(line.text, null, cm.options.tabSize);
      if (minline == null || minindent > indented) {
        minline = search - 1;
        minindent = indented;
      }
    }
    return minline;
  }
  function getStateBefore(cm, n, precise) {
    var doc = cm.doc, display = cm.display;
    if (!doc.mode.startState)
      return true;
    var pos = findStartLine(cm, n, precise), state = pos > doc.first && getLine(doc, pos - 1).stateAfter;
    if (!state)
      state = startState(doc.mode);
    else
      state = copyState(doc.mode, state);
    doc.iter(pos, n, function (line) {
      processLine(cm, line, state);
      var save = pos == n - 1 || pos % 5 == 0 || pos >= display.showingFrom && pos < display.showingTo;
      line.stateAfter = save ? copyState(doc.mode, state) : null;
      ++pos;
    });
    return state;
  }
  // POSITION MEASUREMENT
  function paddingTop(display) {
    return display.lineSpace.offsetTop;
  }
  function paddingVert(display) {
    return display.mover.offsetHeight - display.lineSpace.offsetHeight;
  }
  function paddingLeft(display) {
    var e = removeChildrenAndAdd(display.measure, elt('pre', null, null, 'text-align: left')).appendChild(elt('span', 'x'));
    return e.offsetLeft;
  }
  function measureChar(cm, line, ch, data, bias) {
    var dir = -1;
    data = data || measureLine(cm, line);
    for (var pos = ch;; pos += dir) {
      var r = data[pos];
      if (r)
        break;
      if (dir < 0 && pos == 0)
        dir = 1;
    }
    bias = pos > ch ? 'left' : pos < ch ? 'right' : bias;
    if (bias == 'left' && r.leftSide)
      r = r.leftSide;
    else if (bias == 'right' && r.rightSide)
      r = r.rightSide;
    return {
      left: pos < ch ? r.right : r.left,
      right: pos > ch ? r.left : r.right,
      top: r.top,
      bottom: r.bottom
    };
  }
  function findCachedMeasurement(cm, line) {
    var cache = cm.display.measureLineCache;
    for (var i = 0; i < cache.length; ++i) {
      var memo = cache[i];
      if (memo.text == line.text && memo.markedSpans == line.markedSpans && cm.display.scroller.clientWidth == memo.width && memo.classes == line.textClass + '|' + line.bgClass + '|' + line.wrapClass)
        return memo;
    }
  }
  function clearCachedMeasurement(cm, line) {
    var exists = findCachedMeasurement(cm, line);
    if (exists)
      exists.text = exists.measure = exists.markedSpans = null;
  }
  function measureLine(cm, line) {
    // First look in the cache
    var cached = findCachedMeasurement(cm, line);
    if (cached)
      return cached.measure;
    // Failing that, recompute and store result in cache
    var measure = measureLineInner(cm, line);
    var cache = cm.display.measureLineCache;
    var memo = {
        text: line.text,
        width: cm.display.scroller.clientWidth,
        markedSpans: line.markedSpans,
        measure: measure,
        classes: line.textClass + '|' + line.bgClass + '|' + line.wrapClass
      };
    if (cache.length == 16)
      cache[++cm.display.measureLineCachePos % 16] = memo;
    else
      cache.push(memo);
    return measure;
  }
  function measureLineInner(cm, line) {
    var display = cm.display, measure = emptyArray(line.text.length);
    var pre = lineContent(cm, line, measure, true);
    // IE does not cache element positions of inline elements between
    // calls to getBoundingClientRect. This makes the loop below,
    // which gathers the positions of all the characters on the line,
    // do an amount of layout work quadratic to the number of
    // characters. When line wrapping is off, we try to improve things
    // by first subdividing the line into a bunch of inline blocks, so
    // that IE can reuse most of the layout information from caches
    // for those blocks. This does interfere with line wrapping, so it
    // doesn't work when wrapping is on, but in that case the
    // situation is slightly better, since IE does cache line-wrapping
    // information and only recomputes per-line.
    if (ie && !ie_lt8 && !cm.options.lineWrapping && pre.childNodes.length > 100) {
      var fragment = document.createDocumentFragment();
      var chunk = 10, n = pre.childNodes.length;
      for (var i = 0, chunks = Math.ceil(n / chunk); i < chunks; ++i) {
        var wrap = elt('div', null, null, 'display: inline-block');
        for (var j = 0; j < chunk && n; ++j) {
          wrap.appendChild(pre.firstChild);
          --n;
        }
        fragment.appendChild(wrap);
      }
      pre.appendChild(fragment);
    }
    removeChildrenAndAdd(display.measure, pre);
    var outer = getRect(display.lineDiv);
    var vranges = [], data = emptyArray(line.text.length), maxBot = pre.offsetHeight;
    // Work around an IE7/8 bug where it will sometimes have randomly
    // replaced our pre with a clone at this point.
    if (ie_lt9 && display.measure.first != pre)
      removeChildrenAndAdd(display.measure, pre);
    function measureRect(rect) {
      var top = rect.top - outer.top, bot = rect.bottom - outer.top;
      if (bot > maxBot)
        bot = maxBot;
      if (top < 0)
        top = 0;
      for (var i = vranges.length - 2; i >= 0; i -= 2) {
        var rtop = vranges[i], rbot = vranges[i + 1];
        if (rtop > bot || rbot < top)
          continue;
        if (rtop <= top && rbot >= bot || top <= rtop && bot >= rbot || Math.min(bot, rbot) - Math.max(top, rtop) >= bot - top >> 1) {
          vranges[i] = Math.min(top, rtop);
          vranges[i + 1] = Math.max(bot, rbot);
          break;
        }
      }
      if (i < 0) {
        i = vranges.length;
        vranges.push(top, bot);
      }
      return {
        left: rect.left - outer.left,
        right: rect.right - outer.left,
        top: i,
        bottom: null
      };
    }
    function finishRect(rect) {
      rect.bottom = vranges[rect.top + 1];
      rect.top = vranges[rect.top];
    }
    for (var i = 0, cur; i < measure.length; ++i)
      if (cur = measure[i]) {
        var node = cur, rect = null;
        // A widget might wrap, needs special care
        if (/\bCodeMirror-widget\b/.test(cur.className) && cur.getClientRects) {
          if (cur.firstChild.nodeType == 1)
            node = cur.firstChild;
          var rects = node.getClientRects();
          if (rects.length > 1) {
            rect = data[i] = measureRect(rects[0]);
            rect.rightSide = measureRect(rects[rects.length - 1]);
          }
        }
        if (!rect)
          rect = data[i] = measureRect(getRect(node));
        if (cur.measureRight)
          rect.right = getRect(cur.measureRight).left;
        if (cur.leftSide)
          rect.leftSide = measureRect(getRect(cur.leftSide));
      }
    for (var i = 0, cur; i < data.length; ++i)
      if (cur = data[i]) {
        finishRect(cur);
        if (cur.leftSide)
          finishRect(cur.leftSide);
        if (cur.rightSide)
          finishRect(cur.rightSide);
      }
    return data;
  }
  function measureLineWidth(cm, line) {
    var hasBadSpan = false;
    if (line.markedSpans)
      for (var i = 0; i < line.markedSpans; ++i) {
        var sp = line.markedSpans[i];
        if (sp.collapsed && (sp.to == null || sp.to == line.text.length))
          hasBadSpan = true;
      }
    var cached = !hasBadSpan && findCachedMeasurement(cm, line);
    if (cached)
      return measureChar(cm, line, line.text.length, cached.measure, 'right').right;
    var pre = lineContent(cm, line, null, true);
    var end = pre.appendChild(zeroWidthElement(cm.display.measure));
    removeChildrenAndAdd(cm.display.measure, pre);
    return getRect(end).right - getRect(cm.display.lineDiv).left;
  }
  function clearCaches(cm) {
    cm.display.measureLineCache.length = cm.display.measureLineCachePos = 0;
    cm.display.cachedCharWidth = cm.display.cachedTextHeight = null;
    if (!cm.options.lineWrapping)
      cm.display.maxLineChanged = true;
    cm.display.lineNumChars = null;
  }
  function pageScrollX() {
    return window.pageXOffset || (document.documentElement || document.body).scrollLeft;
  }
  function pageScrollY() {
    return window.pageYOffset || (document.documentElement || document.body).scrollTop;
  }
  // Context is one of "line", "div" (display.lineDiv), "local"/null (editor), or "page"
  function intoCoordSystem(cm, lineObj, rect, context) {
    if (lineObj.widgets)
      for (var i = 0; i < lineObj.widgets.length; ++i)
        if (lineObj.widgets[i].above) {
          var size = widgetHeight(lineObj.widgets[i]);
          rect.top += size;
          rect.bottom += size;
        }
    if (context == 'line')
      return rect;
    if (!context)
      context = 'local';
    var yOff = heightAtLine(cm, lineObj);
    if (context == 'local')
      yOff += paddingTop(cm.display);
    else
      yOff -= cm.display.viewOffset;
    if (context == 'page' || context == 'window') {
      var lOff = getRect(cm.display.lineSpace);
      yOff += lOff.top + (context == 'window' ? 0 : pageScrollY());
      var xOff = lOff.left + (context == 'window' ? 0 : pageScrollX());
      rect.left += xOff;
      rect.right += xOff;
    }
    rect.top += yOff;
    rect.bottom += yOff;
    return rect;
  }
  // Context may be "window", "page", "div", or "local"/null
  // Result is in "div" coords
  function fromCoordSystem(cm, coords, context) {
    if (context == 'div')
      return coords;
    var left = coords.left, top = coords.top;
    // First move into "page" coordinate system
    if (context == 'page') {
      left -= pageScrollX();
      top -= pageScrollY();
    } else if (context == 'local' || !context) {
      var localBox = getRect(cm.display.sizer);
      left += localBox.left;
      top += localBox.top;
    }
    var lineSpaceBox = getRect(cm.display.lineSpace);
    return {
      left: left - lineSpaceBox.left,
      top: top - lineSpaceBox.top
    };
  }
  function charCoords(cm, pos, context, lineObj, bias) {
    if (!lineObj)
      lineObj = getLine(cm.doc, pos.line);
    return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, null, bias), context);
  }
  function cursorCoords(cm, pos, context, lineObj, measurement) {
    lineObj = lineObj || getLine(cm.doc, pos.line);
    if (!measurement)
      measurement = measureLine(cm, lineObj);
    function get(ch, right) {
      var m = measureChar(cm, lineObj, ch, measurement, right ? 'right' : 'left');
      if (right)
        m.left = m.right;
      else
        m.right = m.left;
      return intoCoordSystem(cm, lineObj, m, context);
    }
    function getBidi(ch, partPos) {
      var part = order[partPos], right = part.level % 2;
      if (ch == bidiLeft(part) && partPos && part.level < order[partPos - 1].level) {
        part = order[--partPos];
        ch = bidiRight(part) - (part.level % 2 ? 0 : 1);
        right = true;
      } else if (ch == bidiRight(part) && partPos < order.length - 1 && part.level < order[partPos + 1].level) {
        part = order[++partPos];
        ch = bidiLeft(part) - part.level % 2;
        right = false;
      }
      if (right && ch == part.to && ch > part.from)
        return get(ch - 1);
      return get(ch, right);
    }
    var order = getOrder(lineObj), ch = pos.ch;
    if (!order)
      return get(ch);
    var partPos = getBidiPartAt(order, ch);
    var val = getBidi(ch, partPos);
    if (bidiOther != null)
      val.other = getBidi(ch, bidiOther);
    return val;
  }
  function PosWithInfo(line, ch, outside, xRel) {
    var pos = new Pos(line, ch);
    pos.xRel = xRel;
    if (outside)
      pos.outside = true;
    return pos;
  }
  // Coords must be lineSpace-local
  function coordsChar(cm, x, y) {
    var doc = cm.doc;
    y += cm.display.viewOffset;
    if (y < 0)
      return PosWithInfo(doc.first, 0, true, -1);
    var lineNo = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
    if (lineNo > last)
      return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, true, 1);
    if (x < 0)
      x = 0;
    for (;;) {
      var lineObj = getLine(doc, lineNo);
      var found = coordsCharInner(cm, lineObj, lineNo, x, y);
      var merged = collapsedSpanAtEnd(lineObj);
      var mergedPos = merged && merged.find();
      if (merged && (found.ch > mergedPos.from.ch || found.ch == mergedPos.from.ch && found.xRel > 0))
        lineNo = mergedPos.to.line;
      else
        return found;
    }
  }
  function coordsCharInner(cm, lineObj, lineNo, x, y) {
    var innerOff = y - heightAtLine(cm, lineObj);
    var wrongLine = false, adjust = 2 * cm.display.wrapper.clientWidth;
    var measurement = measureLine(cm, lineObj);
    function getX(ch) {
      var sp = cursorCoords(cm, Pos(lineNo, ch), 'line', lineObj, measurement);
      wrongLine = true;
      if (innerOff > sp.bottom)
        return sp.left - adjust;
      else if (innerOff < sp.top)
        return sp.left + adjust;
      else
        wrongLine = false;
      return sp.left;
    }
    var bidi = getOrder(lineObj), dist = lineObj.text.length;
    var from = lineLeft(lineObj), to = lineRight(lineObj);
    var fromX = getX(from), fromOutside = wrongLine, toX = getX(to), toOutside = wrongLine;
    if (x > toX)
      return PosWithInfo(lineNo, to, toOutside, 1);
    // Do a binary search between these bounds.
    for (;;) {
      if (bidi ? to == from || to == moveVisually(lineObj, from, 1) : to - from <= 1) {
        var ch = x < fromX || x - fromX <= toX - x ? from : to;
        var xDiff = x - (ch == from ? fromX : toX);
        while (isExtendingChar.test(lineObj.text.charAt(ch)))
          ++ch;
        var pos = PosWithInfo(lineNo, ch, ch == from ? fromOutside : toOutside, xDiff < 0 ? -1 : xDiff ? 1 : 0);
        return pos;
      }
      var step = Math.ceil(dist / 2), middle = from + step;
      if (bidi) {
        middle = from;
        for (var i = 0; i < step; ++i)
          middle = moveVisually(lineObj, middle, 1);
      }
      var middleX = getX(middle);
      if (middleX > x) {
        to = middle;
        toX = middleX;
        if (toOutside = wrongLine)
          toX += 1000;
        dist = step;
      } else {
        from = middle;
        fromX = middleX;
        fromOutside = wrongLine;
        dist -= step;
      }
    }
  }
  var measureText;
  function textHeight(display) {
    if (display.cachedTextHeight != null)
      return display.cachedTextHeight;
    if (measureText == null) {
      measureText = elt('pre');
      // Measure a bunch of lines, for browsers that compute
      // fractional heights.
      for (var i = 0; i < 49; ++i) {
        measureText.appendChild(document.createTextNode('x'));
        measureText.appendChild(elt('br'));
      }
      measureText.appendChild(document.createTextNode('x'));
    }
    removeChildrenAndAdd(display.measure, measureText);
    var height = measureText.offsetHeight / 50;
    if (height > 3)
      display.cachedTextHeight = height;
    removeChildren(display.measure);
    return height || 1;
  }
  function charWidth(display) {
    if (display.cachedCharWidth != null)
      return display.cachedCharWidth;
    var anchor = elt('span', 'x');
    var pre = elt('pre', [anchor]);
    removeChildrenAndAdd(display.measure, pre);
    var width = anchor.offsetWidth;
    if (width > 2)
      display.cachedCharWidth = width;
    return width || 10;
  }
  // OPERATIONS
  // Operations are used to wrap changes in such a way that each
  // change won't have to update the cursor and display (which would
  // be awkward, slow, and error-prone), but instead updates are
  // batched and then all combined and executed at once.
  var nextOpId = 0;
  function startOperation(cm) {
    cm.curOp = {
      changes: [],
      forceUpdate: false,
      updateInput: null,
      userSelChange: null,
      textChanged: null,
      selectionChanged: false,
      cursorActivity: false,
      updateMaxLine: false,
      updateScrollPos: false,
      id: ++nextOpId
    };
    if (!delayedCallbackDepth++)
      delayedCallbacks = [];
  }
  function endOperation(cm) {
    var op = cm.curOp, doc = cm.doc, display = cm.display;
    cm.curOp = null;
    if (op.updateMaxLine)
      computeMaxLength(cm);
    if (display.maxLineChanged && !cm.options.lineWrapping && display.maxLine) {
      var width = measureLineWidth(cm, display.maxLine);
      display.sizer.style.minWidth = Math.max(0, width + 3 + scrollerCutOff) + 'px';
      display.maxLineChanged = false;
      var maxScrollLeft = Math.max(0, display.sizer.offsetLeft + display.sizer.offsetWidth - display.scroller.clientWidth);
      if (maxScrollLeft < doc.scrollLeft && !op.updateScrollPos)
        setScrollLeft(cm, Math.min(display.scroller.scrollLeft, maxScrollLeft), true);
    }
    var newScrollPos, updated;
    if (op.updateScrollPos) {
      newScrollPos = op.updateScrollPos;
    } else if (op.selectionChanged && display.scroller.clientHeight) {
      // don't rescroll if not visible
      var coords = cursorCoords(cm, doc.sel.head);
      newScrollPos = calculateScrollPos(cm, coords.left, coords.top, coords.left, coords.bottom);
    }
    if (op.changes.length || op.forceUpdate || newScrollPos && newScrollPos.scrollTop != null) {
      updated = updateDisplay(cm, op.changes, newScrollPos && newScrollPos.scrollTop, op.forceUpdate);
      if (cm.display.scroller.offsetHeight)
        cm.doc.scrollTop = cm.display.scroller.scrollTop;
    }
    if (!updated && op.selectionChanged)
      updateSelection(cm);
    if (op.updateScrollPos) {
      display.scroller.scrollTop = display.scrollbarV.scrollTop = doc.scrollTop = newScrollPos.scrollTop;
      display.scroller.scrollLeft = display.scrollbarH.scrollLeft = doc.scrollLeft = newScrollPos.scrollLeft;
      alignHorizontally(cm);
      if (op.scrollToPos)
        scrollPosIntoView(cm, clipPos(cm.doc, op.scrollToPos), op.scrollToPosMargin);
    } else if (newScrollPos) {
      scrollCursorIntoView(cm);
    }
    if (op.selectionChanged)
      restartBlink(cm);
    if (cm.state.focused && op.updateInput)
      resetInput(cm, op.userSelChange);
    var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
    if (hidden)
      for (var i = 0; i < hidden.length; ++i)
        if (!hidden[i].lines.length)
          signal(hidden[i], 'hide');
    if (unhidden)
      for (var i = 0; i < unhidden.length; ++i)
        if (unhidden[i].lines.length)
          signal(unhidden[i], 'unhide');
    var delayed;
    if (!--delayedCallbackDepth) {
      delayed = delayedCallbacks;
      delayedCallbacks = null;
    }
    if (op.textChanged)
      signal(cm, 'change', cm, op.textChanged);
    if (op.cursorActivity)
      signal(cm, 'cursorActivity', cm);
    if (delayed)
      for (var i = 0; i < delayed.length; ++i)
        delayed[i]();
  }
  // Wraps a function in an operation. Returns the wrapped function.
  function operation(cm1, f) {
    return function () {
      var cm = cm1 || this, withOp = !cm.curOp;
      if (withOp)
        startOperation(cm);
      try {
        var result = f.apply(cm, arguments);
      } finally {
        if (withOp)
          endOperation(cm);
      }
      return result;
    };
  }
  function docOperation(f) {
    return function () {
      var withOp = this.cm && !this.cm.curOp, result;
      if (withOp)
        startOperation(this.cm);
      try {
        result = f.apply(this, arguments);
      } finally {
        if (withOp)
          endOperation(this.cm);
      }
      return result;
    };
  }
  function runInOp(cm, f) {
    var withOp = !cm.curOp, result;
    if (withOp)
      startOperation(cm);
    try {
      result = f();
    } finally {
      if (withOp)
        endOperation(cm);
    }
    return result;
  }
  function regChange(cm, from, to, lendiff) {
    if (from == null)
      from = cm.doc.first;
    if (to == null)
      to = cm.doc.first + cm.doc.size;
    cm.curOp.changes.push({
      from: from,
      to: to,
      diff: lendiff
    });
  }
  // INPUT HANDLING
  function slowPoll(cm) {
    if (cm.display.pollingFast)
      return;
    cm.display.poll.set(cm.options.pollInterval, function () {
      readInput(cm);
      if (cm.state.focused)
        slowPoll(cm);
    });
  }
  function fastPoll(cm) {
    var missed = false;
    cm.display.pollingFast = true;
    function p() {
      var changed = readInput(cm);
      if (!changed && !missed) {
        missed = true;
        cm.display.poll.set(60, p);
      } else {
        cm.display.pollingFast = false;
        slowPoll(cm);
      }
    }
    cm.display.poll.set(20, p);
  }
  // prevInput is a hack to work with IME. If we reset the textarea
  // on every change, that breaks IME. So we look for changes
  // compared to the previous content instead. (Modern browsers have
  // events that indicate IME taking place, but these are not widely
  // supported or compatible enough yet to rely on.)
  function readInput(cm) {
    var input = cm.display.input, prevInput = cm.display.prevInput, doc = cm.doc, sel = doc.sel;
    if (!cm.state.focused || hasSelection(input) || isReadOnly(cm) || cm.state.disableInput)
      return false;
    var text = input.value;
    if (text == prevInput && posEq(sel.from, sel.to))
      return false;
    if (ie && !ie_lt9 && cm.display.inputHasSelection === text) {
      resetInput(cm, true);
      return false;
    }
    var withOp = !cm.curOp;
    if (withOp)
      startOperation(cm);
    sel.shift = false;
    var same = 0, l = Math.min(prevInput.length, text.length);
    while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same))
      ++same;
    var from = sel.from, to = sel.to;
    if (same < prevInput.length)
      from = Pos(from.line, from.ch - (prevInput.length - same));
    else if (cm.state.overwrite && posEq(from, to) && !cm.state.pasteIncoming)
      to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + (text.length - same)));
    var updateInput = cm.curOp.updateInput;
    var changeEvent = {
        from: from,
        to: to,
        text: splitLines(text.slice(same)),
        origin: cm.state.pasteIncoming ? 'paste' : '+input'
      };
    makeChange(cm.doc, changeEvent, 'end');
    cm.curOp.updateInput = updateInput;
    signalLater(cm, 'inputRead', cm, changeEvent);
    if (text.length > 1000 || text.indexOf('\n') > -1)
      input.value = cm.display.prevInput = '';
    else
      cm.display.prevInput = text;
    if (withOp)
      endOperation(cm);
    cm.state.pasteIncoming = false;
    return true;
  }
  function resetInput(cm, user) {
    var minimal, selected, doc = cm.doc;
    if (!posEq(doc.sel.from, doc.sel.to)) {
      cm.display.prevInput = '';
      minimal = hasCopyEvent && (doc.sel.to.line - doc.sel.from.line > 100 || (selected = cm.getSelection()).length > 1000);
      var content = minimal ? '-' : selected || cm.getSelection();
      cm.display.input.value = content;
      if (cm.state.focused)
        selectInput(cm.display.input);
      if (ie && !ie_lt9)
        cm.display.inputHasSelection = content;
    } else if (user) {
      cm.display.prevInput = cm.display.input.value = '';
      if (ie && !ie_lt9)
        cm.display.inputHasSelection = null;
    }
    cm.display.inaccurateSelection = minimal;
  }
  function focusInput(cm) {
    if (cm.options.readOnly != 'nocursor' && (!mobile || document.activeElement != cm.display.input))
      cm.display.input.focus();
  }
  function isReadOnly(cm) {
    return cm.options.readOnly || cm.doc.cantEdit;
  }
  // EVENT HANDLERS
  function registerEventHandlers(cm) {
    var d = cm.display;
    on(d.scroller, 'mousedown', operation(cm, onMouseDown));
    if (ie)
      on(d.scroller, 'dblclick', operation(cm, function (e) {
        if (signalDOMEvent(cm, e))
          return;
        var pos = posFromMouse(cm, e);
        if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e))
          return;
        e_preventDefault(e);
        var word = findWordAt(getLine(cm.doc, pos.line).text, pos);
        extendSelection(cm.doc, word.from, word.to);
      }));
    else
      on(d.scroller, 'dblclick', function (e) {
        signalDOMEvent(cm, e) || e_preventDefault(e);
      });
    on(d.lineSpace, 'selectstart', function (e) {
      if (!eventInWidget(d, e))
        e_preventDefault(e);
    });
    // Gecko browsers fire contextmenu *after* opening the menu, at
    // which point we can't mess with it anymore. Context menu is
    // handled in onMouseDown for Gecko.
    if (!captureMiddleClick)
      on(d.scroller, 'contextmenu', function (e) {
        onContextMenu(cm, e);
      });
    on(d.scroller, 'scroll', function () {
      if (d.scroller.clientHeight) {
        setScrollTop(cm, d.scroller.scrollTop);
        setScrollLeft(cm, d.scroller.scrollLeft, true);
        signal(cm, 'scroll', cm);
      }
    });
    on(d.scrollbarV, 'scroll', function () {
      if (d.scroller.clientHeight)
        setScrollTop(cm, d.scrollbarV.scrollTop);
    });
    on(d.scrollbarH, 'scroll', function () {
      if (d.scroller.clientHeight)
        setScrollLeft(cm, d.scrollbarH.scrollLeft);
    });
    on(d.scroller, 'mousewheel', function (e) {
      onScrollWheel(cm, e);
    });
    on(d.scroller, 'DOMMouseScroll', function (e) {
      onScrollWheel(cm, e);
    });
    function reFocus() {
      if (cm.state.focused)
        setTimeout(bind(focusInput, cm), 0);
    }
    on(d.scrollbarH, 'mousedown', reFocus);
    on(d.scrollbarV, 'mousedown', reFocus);
    // Prevent wrapper from ever scrolling
    on(d.wrapper, 'scroll', function () {
      d.wrapper.scrollTop = d.wrapper.scrollLeft = 0;
    });
    var resizeTimer;
    function onResize() {
      if (resizeTimer == null)
        resizeTimer = setTimeout(function () {
          resizeTimer = null;
          // Might be a text scaling operation, clear size caches.
          d.cachedCharWidth = d.cachedTextHeight = knownScrollbarWidth = null;
          clearCaches(cm);
          runInOp(cm, bind(regChange, cm));
        }, 100);
    }
    on(window, 'resize', onResize);
    // Above handler holds on to the editor and its data structures.
    // Here we poll to unregister it when the editor is no longer in
    // the document, so that it can be garbage-collected.
    function unregister() {
      for (var p = d.wrapper.parentNode; p && p != document.body; p = p.parentNode) {
      }
      if (p)
        setTimeout(unregister, 5000);
      else
        off(window, 'resize', onResize);
    }
    setTimeout(unregister, 5000);
    on(d.input, 'keyup', operation(cm, function (e) {
      if (signalDOMEvent(cm, e) || cm.options.onKeyEvent && cm.options.onKeyEvent(cm, addStop(e)))
        return;
      if (e.keyCode == 16)
        cm.doc.sel.shift = false;
    }));
    on(d.input, 'input', bind(fastPoll, cm));
    on(d.input, 'keydown', operation(cm, onKeyDown));
    on(d.input, 'keypress', operation(cm, onKeyPress));
    on(d.input, 'focus', bind(onFocus, cm));
    on(d.input, 'blur', bind(onBlur, cm));
    function drag_(e) {
      if (signalDOMEvent(cm, e) || cm.options.onDragEvent && cm.options.onDragEvent(cm, addStop(e)))
        return;
      e_stop(e);
    }
    if (cm.options.dragDrop) {
      on(d.scroller, 'dragstart', function (e) {
        onDragStart(cm, e);
      });
      on(d.scroller, 'dragenter', drag_);
      on(d.scroller, 'dragover', drag_);
      on(d.scroller, 'drop', operation(cm, onDrop));
    }
    on(d.scroller, 'paste', function (e) {
      if (eventInWidget(d, e))
        return;
      focusInput(cm);
      fastPoll(cm);
    });
    on(d.input, 'paste', function () {
      cm.state.pasteIncoming = true;
      fastPoll(cm);
    });
    function prepareCopy() {
      if (d.inaccurateSelection) {
        d.prevInput = '';
        d.inaccurateSelection = false;
        d.input.value = cm.getSelection();
        selectInput(d.input);
      }
    }
    on(d.input, 'cut', prepareCopy);
    on(d.input, 'copy', prepareCopy);
    // Needed to handle Tab key in KHTML
    if (khtml)
      on(d.sizer, 'mouseup', function () {
        if (document.activeElement == d.input)
          d.input.blur();
        focusInput(cm);
      });
  }
  function eventInWidget(display, e) {
    for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
      if (!n || n.ignoreEvents || n.parentNode == display.sizer && n != display.mover)
        return true;
    }
  }
  function posFromMouse(cm, e, liberal) {
    var display = cm.display;
    if (!liberal) {
      var target = e_target(e);
      if (target == display.scrollbarH || target == display.scrollbarH.firstChild || target == display.scrollbarV || target == display.scrollbarV.firstChild || target == display.scrollbarFiller || target == display.gutterFiller)
        return null;
    }
    var x, y, space = getRect(display.lineSpace);
    // Fails unpredictably on IE[67] when mouse is dragged around quickly.
    try {
      x = e.clientX;
      y = e.clientY;
    } catch (e) {
      return null;
    }
    return coordsChar(cm, x - space.left, y - space.top);
  }
  var lastClick, lastDoubleClick;
  function onMouseDown(e) {
    if (signalDOMEvent(this, e))
      return;
    var cm = this, display = cm.display, doc = cm.doc, sel = doc.sel;
    sel.shift = e.shiftKey;
    if (eventInWidget(display, e)) {
      if (!webkit) {
        display.scroller.draggable = false;
        setTimeout(function () {
          display.scroller.draggable = true;
        }, 100);
      }
      return;
    }
    if (clickInGutter(cm, e))
      return;
    var start = posFromMouse(cm, e);
    switch (e_button(e)) {
    case 3:
      if (captureMiddleClick)
        onContextMenu.call(cm, cm, e);
      return;
    case 2:
      if (start)
        extendSelection(cm.doc, start);
      setTimeout(bind(focusInput, cm), 20);
      e_preventDefault(e);
      return;
    }
    // For button 1, if it was clicked inside the editor
    // (posFromMouse returning non-null), we have to adjust the
    // selection.
    if (!start) {
      if (e_target(e) == display.scroller)
        e_preventDefault(e);
      return;
    }
    if (!cm.state.focused)
      onFocus(cm);
    var now = +new Date(), type = 'single';
    if (lastDoubleClick && lastDoubleClick.time > now - 400 && posEq(lastDoubleClick.pos, start)) {
      type = 'triple';
      e_preventDefault(e);
      setTimeout(bind(focusInput, cm), 20);
      selectLine(cm, start.line);
    } else if (lastClick && lastClick.time > now - 400 && posEq(lastClick.pos, start)) {
      type = 'double';
      lastDoubleClick = {
        time: now,
        pos: start
      };
      e_preventDefault(e);
      var word = findWordAt(getLine(doc, start.line).text, start);
      extendSelection(cm.doc, word.from, word.to);
    } else {
      lastClick = {
        time: now,
        pos: start
      };
    }
    var last = start;
    if (cm.options.dragDrop && dragAndDrop && !isReadOnly(cm) && !posEq(sel.from, sel.to) && !posLess(start, sel.from) && !posLess(sel.to, start) && type == 'single') {
      var dragEnd = operation(cm, function (e2) {
          if (webkit)
            display.scroller.draggable = false;
          cm.state.draggingText = false;
          off(document, 'mouseup', dragEnd);
          off(display.scroller, 'drop', dragEnd);
          if (Math.abs(e.clientX - e2.clientX) + Math.abs(e.clientY - e2.clientY) < 10) {
            e_preventDefault(e2);
            extendSelection(cm.doc, start);
            focusInput(cm);
          }
        });
      // Let the drag handler handle this.
      if (webkit)
        display.scroller.draggable = true;
      cm.state.draggingText = dragEnd;
      // IE's approach to draggable
      if (display.scroller.dragDrop)
        display.scroller.dragDrop();
      on(document, 'mouseup', dragEnd);
      on(display.scroller, 'drop', dragEnd);
      return;
    }
    e_preventDefault(e);
    if (type == 'single')
      extendSelection(cm.doc, clipPos(doc, start));
    var startstart = sel.from, startend = sel.to, lastPos = start;
    function doSelect(cur) {
      if (posEq(lastPos, cur))
        return;
      lastPos = cur;
      if (type == 'single') {
        extendSelection(cm.doc, clipPos(doc, start), cur);
        return;
      }
      startstart = clipPos(doc, startstart);
      startend = clipPos(doc, startend);
      if (type == 'double') {
        var word = findWordAt(getLine(doc, cur.line).text, cur);
        if (posLess(cur, startstart))
          extendSelection(cm.doc, word.from, startend);
        else
          extendSelection(cm.doc, startstart, word.to);
      } else if (type == 'triple') {
        if (posLess(cur, startstart))
          extendSelection(cm.doc, startend, clipPos(doc, Pos(cur.line, 0)));
        else
          extendSelection(cm.doc, startstart, clipPos(doc, Pos(cur.line + 1, 0)));
      }
    }
    var editorSize = getRect(display.wrapper);
    // Used to ensure timeout re-tries don't fire when another extend
    // happened in the meantime (clearTimeout isn't reliable -- at
    // least on Chrome, the timeouts still happen even when cleared,
    // if the clear happens after their scheduled firing time).
    var counter = 0;
    function extend(e) {
      var curCount = ++counter;
      var cur = posFromMouse(cm, e, true);
      if (!cur)
        return;
      if (!posEq(cur, last)) {
        if (!cm.state.focused)
          onFocus(cm);
        last = cur;
        doSelect(cur);
        var visible = visibleLines(display, doc);
        if (cur.line >= visible.to || cur.line < visible.from)
          setTimeout(operation(cm, function () {
            if (counter == curCount)
              extend(e);
          }), 150);
      } else {
        var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
        if (outside)
          setTimeout(operation(cm, function () {
            if (counter != curCount)
              return;
            display.scroller.scrollTop += outside;
            extend(e);
          }), 50);
      }
    }
    function done(e) {
      counter = Infinity;
      e_preventDefault(e);
      focusInput(cm);
      off(document, 'mousemove', move);
      off(document, 'mouseup', up);
    }
    var move = operation(cm, function (e) {
        if (!ie && !e_button(e))
          done(e);
        else
          extend(e);
      });
    var up = operation(cm, done);
    on(document, 'mousemove', move);
    on(document, 'mouseup', up);
  }
  function clickInGutter(cm, e) {
    var display = cm.display;
    try {
      var mX = e.clientX, mY = e.clientY;
    } catch (e) {
      return false;
    }
    if (mX >= Math.floor(getRect(display.gutters).right))
      return false;
    e_preventDefault(e);
    if (!hasHandler(cm, 'gutterClick'))
      return true;
    var lineBox = getRect(display.lineDiv);
    if (mY > lineBox.bottom)
      return true;
    mY -= lineBox.top - display.viewOffset;
    for (var i = 0; i < cm.options.gutters.length; ++i) {
      var g = display.gutters.childNodes[i];
      if (g && getRect(g).right >= mX) {
        var line = lineAtHeight(cm.doc, mY);
        var gutter = cm.options.gutters[i];
        signalLater(cm, 'gutterClick', cm, line, gutter, e);
        break;
      }
    }
    return true;
  }
  // Kludge to work around strange IE behavior where it'll sometimes
  // re-fire a series of drag-related events right after the drop (#1551)
  var lastDrop = 0;
  function onDrop(e) {
    var cm = this;
    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e) || cm.options.onDragEvent && cm.options.onDragEvent(cm, addStop(e)))
      return;
    e_preventDefault(e);
    if (ie)
      lastDrop = +new Date();
    var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files;
    if (!pos || isReadOnly(cm))
      return;
    if (files && files.length && window.FileReader && window.File) {
      var n = files.length, text = Array(n), read = 0;
      var loadFile = function (file, i) {
        var reader = new FileReader();
        reader.onload = function () {
          text[i] = reader.result;
          if (++read == n) {
            pos = clipPos(cm.doc, pos);
            makeChange(cm.doc, {
              from: pos,
              to: pos,
              text: splitLines(text.join('\n')),
              origin: 'paste'
            }, 'around');
          }
        };
        reader.readAsText(file);
      };
      for (var i = 0; i < n; ++i)
        loadFile(files[i], i);
    } else {
      // Don't do a replace if the drop happened inside of the selected text.
      if (cm.state.draggingText && !(posLess(pos, cm.doc.sel.from) || posLess(cm.doc.sel.to, pos))) {
        cm.state.draggingText(e);
        // Ensure the editor is re-focused
        setTimeout(bind(focusInput, cm), 20);
        return;
      }
      try {
        var text = e.dataTransfer.getData('Text');
        if (text) {
          var curFrom = cm.doc.sel.from, curTo = cm.doc.sel.to;
          setSelection(cm.doc, pos, pos);
          if (cm.state.draggingText)
            replaceRange(cm.doc, '', curFrom, curTo, 'paste');
          cm.replaceSelection(text, null, 'paste');
          focusInput(cm);
          onFocus(cm);
        }
      } catch (e) {
      }
    }
  }
  function onDragStart(cm, e) {
    if (ie && (!cm.state.draggingText || +new Date() - lastDrop < 100)) {
      e_stop(e);
      return;
    }
    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e))
      return;
    var txt = cm.getSelection();
    e.dataTransfer.setData('Text', txt);
    // Use dummy image instead of default browsers image.
    // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
    if (e.dataTransfer.setDragImage && !safari) {
      var img = elt('img', null, null, 'position: fixed; left: 0; top: 0;');
      if (opera) {
        img.width = img.height = 1;
        cm.display.wrapper.appendChild(img);
        // Force a relayout, or Opera won't use our image for some obscure reason
        img._top = img.offsetTop;
      }
      e.dataTransfer.setDragImage(img, 0, 0);
      if (opera)
        img.parentNode.removeChild(img);
    }
  }
  function setScrollTop(cm, val) {
    if (Math.abs(cm.doc.scrollTop - val) < 2)
      return;
    cm.doc.scrollTop = val;
    if (!gecko)
      updateDisplay(cm, [], val);
    if (cm.display.scroller.scrollTop != val)
      cm.display.scroller.scrollTop = val;
    if (cm.display.scrollbarV.scrollTop != val)
      cm.display.scrollbarV.scrollTop = val;
    if (gecko)
      updateDisplay(cm, []);
    startWorker(cm, 100);
  }
  function setScrollLeft(cm, val, isScroller) {
    if (isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2)
      return;
    val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth);
    cm.doc.scrollLeft = val;
    alignHorizontally(cm);
    if (cm.display.scroller.scrollLeft != val)
      cm.display.scroller.scrollLeft = val;
    if (cm.display.scrollbarH.scrollLeft != val)
      cm.display.scrollbarH.scrollLeft = val;
  }
  // Since the delta values reported on mouse wheel events are
  // unstandardized between browsers and even browser versions, and
  // generally horribly unpredictable, this code starts by measuring
  // the scroll effect that the first few mouse wheel events have,
  // and, from that, detects the way it can convert deltas to pixel
  // offsets afterwards.
  //
  // The reason we want to know the amount a wheel event will scroll
  // is that it gives us a chance to update the display before the
  // actual scrolling happens, reducing flickering.
  var wheelSamples = 0, wheelPixelsPerUnit = null;
  // Fill in a browser-detected starting value on browsers where we
  // know one. These don't have to be accurate -- the result of them
  // being wrong would just be a slight flicker on the first wheel
  // scroll (if it is large enough).
  if (ie)
    wheelPixelsPerUnit = -0.53;
  else if (gecko)
    wheelPixelsPerUnit = 15;
  else if (chrome)
    wheelPixelsPerUnit = -0.7;
  else if (safari)
    wheelPixelsPerUnit = -1 / 3;
  function onScrollWheel(cm, e) {
    var dx = e.wheelDeltaX, dy = e.wheelDeltaY;
    if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS)
      dx = e.detail;
    if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS)
      dy = e.detail;
    else if (dy == null)
      dy = e.wheelDelta;
    var display = cm.display, scroll = display.scroller;
    // Quit if there's nothing to scroll here
    if (!(dx && scroll.scrollWidth > scroll.clientWidth || dy && scroll.scrollHeight > scroll.clientHeight))
      return;
    // Webkit browsers on OS X abort momentum scrolls when the target
    // of the scroll event is removed from the scrollable element.
    // This hack (see related code in patchDisplay) makes sure the
    // element is kept around.
    if (dy && mac && webkit) {
      for (var cur = e.target; cur != scroll; cur = cur.parentNode) {
        if (cur.lineObj) {
          cm.display.currentWheelTarget = cur;
          break;
        }
      }
    }
    // On some browsers, horizontal scrolling will cause redraws to
    // happen before the gutter has been realigned, causing it to
    // wriggle around in a most unseemly way. When we have an
    // estimated pixels/delta value, we just handle horizontal
    // scrolling entirely here. It'll be slightly off from native, but
    // better than glitching out.
    if (dx && !gecko && !opera && wheelPixelsPerUnit != null) {
      if (dy)
        setScrollTop(cm, Math.max(0, Math.min(scroll.scrollTop + dy * wheelPixelsPerUnit, scroll.scrollHeight - scroll.clientHeight)));
      setScrollLeft(cm, Math.max(0, Math.min(scroll.scrollLeft + dx * wheelPixelsPerUnit, scroll.scrollWidth - scroll.clientWidth)));
      e_preventDefault(e);
      display.wheelStartX = null;
      // Abort measurement, if in progress
      return;
    }
    if (dy && wheelPixelsPerUnit != null) {
      var pixels = dy * wheelPixelsPerUnit;
      var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight;
      if (pixels < 0)
        top = Math.max(0, top + pixels - 50);
      else
        bot = Math.min(cm.doc.height, bot + pixels + 50);
      updateDisplay(cm, [], {
        top: top,
        bottom: bot
      });
    }
    if (wheelSamples < 20) {
      if (display.wheelStartX == null) {
        display.wheelStartX = scroll.scrollLeft;
        display.wheelStartY = scroll.scrollTop;
        display.wheelDX = dx;
        display.wheelDY = dy;
        setTimeout(function () {
          if (display.wheelStartX == null)
            return;
          var movedX = scroll.scrollLeft - display.wheelStartX;
          var movedY = scroll.scrollTop - display.wheelStartY;
          var sample = movedY && display.wheelDY && movedY / display.wheelDY || movedX && display.wheelDX && movedX / display.wheelDX;
          display.wheelStartX = display.wheelStartY = null;
          if (!sample)
            return;
          wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
          ++wheelSamples;
        }, 200);
      } else {
        display.wheelDX += dx;
        display.wheelDY += dy;
      }
    }
  }
  function doHandleBinding(cm, bound, dropShift) {
    if (typeof bound == 'string') {
      bound = commands[bound];
      if (!bound)
        return false;
    }
    // Ensure previous input has been read, so that the handler sees a
    // consistent view of the document
    if (cm.display.pollingFast && readInput(cm))
      cm.display.pollingFast = false;
    var doc = cm.doc, prevShift = doc.sel.shift, done = false;
    try {
      if (isReadOnly(cm))
        cm.state.suppressEdits = true;
      if (dropShift)
        doc.sel.shift = false;
      done = bound(cm) != Pass;
    } finally {
      doc.sel.shift = prevShift;
      cm.state.suppressEdits = false;
    }
    return done;
  }
  function allKeyMaps(cm) {
    var maps = cm.state.keyMaps.slice(0);
    if (cm.options.extraKeys)
      maps.push(cm.options.extraKeys);
    maps.push(cm.options.keyMap);
    return maps;
  }
  var maybeTransition;
  function handleKeyBinding(cm, e) {
    // Handle auto keymap transitions
    var startMap = getKeyMap(cm.options.keyMap), next = startMap.auto;
    clearTimeout(maybeTransition);
    if (next && !isModifierKey(e))
      maybeTransition = setTimeout(function () {
        if (getKeyMap(cm.options.keyMap) == startMap) {
          cm.options.keyMap = next.call ? next.call(null, cm) : next;
          keyMapChanged(cm);
        }
      }, 50);
    var name = keyName(e, true), handled = false;
    if (!name)
      return false;
    var keymaps = allKeyMaps(cm);
    if (e.shiftKey) {
      // First try to resolve full name (including 'Shift-'). Failing
      // that, see if there is a cursor-motion command (starting with
      // 'go') bound to the keyname without 'Shift-'.
      handled = lookupKey('Shift-' + name, keymaps, function (b) {
        return doHandleBinding(cm, b, true);
      }) || lookupKey(name, keymaps, function (b) {
        if (typeof b == 'string' ? /^go[A-Z]/.test(b) : b.motion)
          return doHandleBinding(cm, b);
      });
    } else {
      handled = lookupKey(name, keymaps, function (b) {
        return doHandleBinding(cm, b);
      });
    }
    if (handled) {
      e_preventDefault(e);
      restartBlink(cm);
      if (ie_lt9) {
        e.oldKeyCode = e.keyCode;
        e.keyCode = 0;
      }
      signalLater(cm, 'keyHandled', cm, name, e);
    }
    return handled;
  }
  function handleCharBinding(cm, e, ch) {
    var handled = lookupKey('\'' + ch + '\'', allKeyMaps(cm), function (b) {
        return doHandleBinding(cm, b, true);
      });
    if (handled) {
      e_preventDefault(e);
      restartBlink(cm);
      signalLater(cm, 'keyHandled', cm, '\'' + ch + '\'', e);
    }
    return handled;
  }
  var lastStoppedKey = null;
  function onKeyDown(e) {
    var cm = this;
    if (!cm.state.focused)
      onFocus(cm);
    if (ie && e.keyCode == 27) {
      e.returnValue = false;
    }
    if (signalDOMEvent(cm, e) || cm.options.onKeyEvent && cm.options.onKeyEvent(cm, addStop(e)))
      return;
    var code = e.keyCode;
    // IE does strange things with escape.
    cm.doc.sel.shift = code == 16 || e.shiftKey;
    // First give onKeyEvent option a chance to handle this.
    var handled = handleKeyBinding(cm, e);
    if (opera) {
      lastStoppedKey = handled ? code : null;
      // Opera has no cut event... we try to at least catch the key combo
      if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
        cm.replaceSelection('');
    }
  }
  function onKeyPress(e) {
    var cm = this;
    if (signalDOMEvent(cm, e) || cm.options.onKeyEvent && cm.options.onKeyEvent(cm, addStop(e)))
      return;
    var keyCode = e.keyCode, charCode = e.charCode;
    if (opera && keyCode == lastStoppedKey) {
      lastStoppedKey = null;
      e_preventDefault(e);
      return;
    }
    if ((opera && (!e.which || e.which < 10) || khtml) && handleKeyBinding(cm, e))
      return;
    var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
    if (this.options.electricChars && this.doc.mode.electricChars && this.options.smartIndent && !isReadOnly(this) && this.doc.mode.electricChars.indexOf(ch) > -1)
      setTimeout(operation(cm, function () {
        indentLine(cm, cm.doc.sel.to.line, 'smart');
      }), 75);
    if (handleCharBinding(cm, e, ch))
      return;
    if (ie && !ie_lt9)
      cm.display.inputHasSelection = null;
    fastPoll(cm);
  }
  function onFocus(cm) {
    if (cm.options.readOnly == 'nocursor')
      return;
    if (!cm.state.focused) {
      signal(cm, 'focus', cm);
      cm.state.focused = true;
      if (cm.display.wrapper.className.search(/\bCodeMirror-focused\b/) == -1)
        cm.display.wrapper.className += ' CodeMirror-focused';
      resetInput(cm, true);
    }
    slowPoll(cm);
    restartBlink(cm);
  }
  function onBlur(cm) {
    if (cm.state.focused) {
      signal(cm, 'blur', cm);
      cm.state.focused = false;
      cm.display.wrapper.className = cm.display.wrapper.className.replace(' CodeMirror-focused', '');
    }
    clearInterval(cm.display.blinker);
    setTimeout(function () {
      if (!cm.state.focused)
        cm.doc.sel.shift = false;
    }, 150);
  }
  var detectingSelectAll;
  function onContextMenu(cm, e) {
    if (signalDOMEvent(cm, e, 'contextmenu'))
      return;
    var display = cm.display, sel = cm.doc.sel;
    if (eventInWidget(display, e))
      return;
    var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop;
    if (!pos || opera)
      return;
    // Opera is difficult.
    if (posEq(sel.from, sel.to) || posLess(pos, sel.from) || !posLess(pos, sel.to))
      operation(cm, setSelection)(cm.doc, pos, pos);
    var oldCSS = display.input.style.cssText;
    display.inputDiv.style.position = 'absolute';
    display.input.style.cssText = 'position: fixed; width: 30px; height: 30px; top: ' + (e.clientY - 5) + 'px; left: ' + (e.clientX - 5) + 'px; z-index: 1000; background: white; outline: none;' + 'border-width: 0; outline: none; overflow: hidden; opacity: .05; -ms-opacity: .05; filter: alpha(opacity=5);';
    focusInput(cm);
    resetInput(cm, true);
    // Adds "Select all" to context menu in FF
    if (posEq(sel.from, sel.to))
      display.input.value = display.prevInput = ' ';
    function prepareSelectAllHack() {
      if (display.input.selectionStart != null) {
        var extval = display.input.value = ' ' + (posEq(sel.from, sel.to) ? '' : display.input.value);
        display.prevInput = ' ';
        display.input.selectionStart = 1;
        display.input.selectionEnd = extval.length;
      }
    }
    function rehide() {
      display.inputDiv.style.position = 'relative';
      display.input.style.cssText = oldCSS;
      if (ie_lt9)
        display.scrollbarV.scrollTop = display.scroller.scrollTop = scrollPos;
      slowPoll(cm);
      // Try to detect the user choosing select-all
      if (display.input.selectionStart != null) {
        if (!ie || ie_lt9)
          prepareSelectAllHack();
        clearTimeout(detectingSelectAll);
        var i = 0, poll = function () {
            if (display.prevInput == ' ' && display.input.selectionStart == 0)
              operation(cm, commands.selectAll)(cm);
            else if (i++ < 10)
              detectingSelectAll = setTimeout(poll, 500);
            else
              resetInput(cm);
          };
        detectingSelectAll = setTimeout(poll, 200);
      }
    }
    if (ie && !ie_lt9)
      prepareSelectAllHack();
    if (captureMiddleClick) {
      e_stop(e);
      var mouseup = function () {
        off(window, 'mouseup', mouseup);
        setTimeout(rehide, 20);
      };
      on(window, 'mouseup', mouseup);
    } else {
      setTimeout(rehide, 50);
    }
  }
  // UPDATING
  var changeEnd = CodeMirror.changeEnd = function (change) {
      if (!change.text)
        return change.to;
      return Pos(change.from.line + change.text.length - 1, lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0));
    };
  // Make sure a position will be valid after the given change.
  function clipPostChange(doc, change, pos) {
    if (!posLess(change.from, pos))
      return clipPos(doc, pos);
    var diff = change.text.length - 1 - (change.to.line - change.from.line);
    if (pos.line > change.to.line + diff) {
      var preLine = pos.line - diff, lastLine = doc.first + doc.size - 1;
      if (preLine > lastLine)
        return Pos(lastLine, getLine(doc, lastLine).text.length);
      return clipToLen(pos, getLine(doc, preLine).text.length);
    }
    if (pos.line == change.to.line + diff)
      return clipToLen(pos, lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0) + getLine(doc, change.to.line).text.length - change.to.ch);
    var inside = pos.line - change.from.line;
    return clipToLen(pos, change.text[inside].length + (inside ? 0 : change.from.ch));
  }
  // Hint can be null|"end"|"start"|"around"|{anchor,head}
  function computeSelAfterChange(doc, change, hint) {
    if (hint && typeof hint == 'object')
      // Assumed to be {anchor, head} object
      return {
        anchor: clipPostChange(doc, change, hint.anchor),
        head: clipPostChange(doc, change, hint.head)
      };
    if (hint == 'start')
      return {
        anchor: change.from,
        head: change.from
      };
    var end = changeEnd(change);
    if (hint == 'around')
      return {
        anchor: change.from,
        head: end
      };
    if (hint == 'end')
      return {
        anchor: end,
        head: end
      };
    // hint is null, leave the selection alone as much as possible
    var adjustPos = function (pos) {
      if (posLess(pos, change.from))
        return pos;
      if (!posLess(change.to, pos))
        return end;
      var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch;
      if (pos.line == change.to.line)
        ch += end.ch - change.to.ch;
      return Pos(line, ch);
    };
    return {
      anchor: adjustPos(doc.sel.anchor),
      head: adjustPos(doc.sel.head)
    };
  }
  function filterChange(doc, change, update) {
    var obj = {
        canceled: false,
        from: change.from,
        to: change.to,
        text: change.text,
        origin: change.origin,
        cancel: function () {
          this.canceled = true;
        }
      };
    if (update)
      obj.update = function (from, to, text, origin) {
        if (from)
          this.from = clipPos(doc, from);
        if (to)
          this.to = clipPos(doc, to);
        if (text)
          this.text = text;
        if (origin !== undefined)
          this.origin = origin;
      };
    signal(doc, 'beforeChange', doc, obj);
    if (doc.cm)
      signal(doc.cm, 'beforeChange', doc.cm, obj);
    if (obj.canceled)
      return null;
    return {
      from: obj.from,
      to: obj.to,
      text: obj.text,
      origin: obj.origin
    };
  }
  // Replace the range from from to to by the strings in replacement.
  // change is a {from, to, text [, origin]} object
  function makeChange(doc, change, selUpdate, ignoreReadOnly) {
    if (doc.cm) {
      if (!doc.cm.curOp)
        return operation(doc.cm, makeChange)(doc, change, selUpdate, ignoreReadOnly);
      if (doc.cm.state.suppressEdits)
        return;
    }
    if (hasHandler(doc, 'beforeChange') || doc.cm && hasHandler(doc.cm, 'beforeChange')) {
      change = filterChange(doc, change, true);
      if (!change)
        return;
    }
    // Possibly split or suppress the update based on the presence
    // of read-only spans in its range.
    var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
    if (split) {
      for (var i = split.length - 1; i >= 1; --i)
        makeChangeNoReadonly(doc, {
          from: split[i].from,
          to: split[i].to,
          text: ['']
        });
      if (split.length)
        makeChangeNoReadonly(doc, {
          from: split[0].from,
          to: split[0].to,
          text: change.text
        }, selUpdate);
    } else {
      makeChangeNoReadonly(doc, change, selUpdate);
    }
  }
  function makeChangeNoReadonly(doc, change, selUpdate) {
    var selAfter = computeSelAfterChange(doc, change, selUpdate);
    addToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);
    makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
    var rebased = [];
    linkedDocs(doc, function (doc, sharedHist) {
      if (!sharedHist && indexOf(rebased, doc.history) == -1) {
        rebaseHist(doc.history, change);
        rebased.push(doc.history);
      }
      makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
    });
  }
  function makeChangeFromHistory(doc, type) {
    if (doc.cm && doc.cm.state.suppressEdits)
      return;
    var hist = doc.history;
    var event = (type == 'undo' ? hist.done : hist.undone).pop();
    if (!event)
      return;
    var anti = {
        changes: [],
        anchorBefore: event.anchorAfter,
        headBefore: event.headAfter,
        anchorAfter: event.anchorBefore,
        headAfter: event.headBefore,
        generation: hist.generation
      };
    (type == 'undo' ? hist.undone : hist.done).push(anti);
    hist.generation = event.generation || ++hist.maxGeneration;
    var filter = hasHandler(doc, 'beforeChange') || doc.cm && hasHandler(doc.cm, 'beforeChange');
    for (var i = event.changes.length - 1; i >= 0; --i) {
      var change = event.changes[i];
      change.origin = type;
      if (filter && !filterChange(doc, change, false)) {
        (type == 'undo' ? hist.done : hist.undone).length = 0;
        return;
      }
      anti.changes.push(historyChangeFromChange(doc, change));
      var after = i ? computeSelAfterChange(doc, change, null) : {
          anchor: event.anchorBefore,
          head: event.headBefore
        };
      makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
      var rebased = [];
      linkedDocs(doc, function (doc, sharedHist) {
        if (!sharedHist && indexOf(rebased, doc.history) == -1) {
          rebaseHist(doc.history, change);
          rebased.push(doc.history);
        }
        makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
      });
    }
  }
  function shiftDoc(doc, distance) {
    function shiftPos(pos) {
      return Pos(pos.line + distance, pos.ch);
    }
    doc.first += distance;
    if (doc.cm)
      regChange(doc.cm, doc.first, doc.first, distance);
    doc.sel.head = shiftPos(doc.sel.head);
    doc.sel.anchor = shiftPos(doc.sel.anchor);
    doc.sel.from = shiftPos(doc.sel.from);
    doc.sel.to = shiftPos(doc.sel.to);
  }
  function makeChangeSingleDoc(doc, change, selAfter, spans) {
    if (doc.cm && !doc.cm.curOp)
      return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans);
    if (change.to.line < doc.first) {
      shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
      return;
    }
    if (change.from.line > doc.lastLine())
      return;
    // Clip the change to the size of this doc
    if (change.from.line < doc.first) {
      var shift = change.text.length - 1 - (doc.first - change.from.line);
      shiftDoc(doc, shift);
      change = {
        from: Pos(doc.first, 0),
        to: Pos(change.to.line + shift, change.to.ch),
        text: [lst(change.text)],
        origin: change.origin
      };
    }
    var last = doc.lastLine();
    if (change.to.line > last) {
      change = {
        from: change.from,
        to: Pos(last, getLine(doc, last).text.length),
        text: [change.text[0]],
        origin: change.origin
      };
    }
    change.removed = getBetween(doc, change.from, change.to);
    if (!selAfter)
      selAfter = computeSelAfterChange(doc, change, null);
    if (doc.cm)
      makeChangeSingleDocInEditor(doc.cm, change, spans, selAfter);
    else
      updateDoc(doc, change, spans, selAfter);
  }
  function makeChangeSingleDocInEditor(cm, change, spans, selAfter) {
    var doc = cm.doc, display = cm.display, from = change.from, to = change.to;
    var recomputeMaxLength = false, checkWidthStart = from.line;
    if (!cm.options.lineWrapping) {
      checkWidthStart = lineNo(visualLine(doc, getLine(doc, from.line)));
      doc.iter(checkWidthStart, to.line + 1, function (line) {
        if (line == display.maxLine) {
          recomputeMaxLength = true;
          return true;
        }
      });
    }
    if (!posLess(doc.sel.head, change.from) && !posLess(change.to, doc.sel.head))
      cm.curOp.cursorActivity = true;
    updateDoc(doc, change, spans, selAfter, estimateHeight(cm));
    if (!cm.options.lineWrapping) {
      doc.iter(checkWidthStart, from.line + change.text.length, function (line) {
        var len = lineLength(doc, line);
        if (len > display.maxLineLength) {
          display.maxLine = line;
          display.maxLineLength = len;
          display.maxLineChanged = true;
          recomputeMaxLength = false;
        }
      });
      if (recomputeMaxLength)
        cm.curOp.updateMaxLine = true;
    }
    // Adjust frontier, schedule worker
    doc.frontier = Math.min(doc.frontier, from.line);
    startWorker(cm, 400);
    var lendiff = change.text.length - (to.line - from.line) - 1;
    // Remember that these lines changed, for updating the display
    regChange(cm, from.line, to.line + 1, lendiff);
    if (hasHandler(cm, 'change')) {
      var changeObj = {
          from: from,
          to: to,
          text: change.text,
          removed: change.removed,
          origin: change.origin
        };
      if (cm.curOp.textChanged) {
        for (var cur = cm.curOp.textChanged; cur.next; cur = cur.next) {
        }
        cur.next = changeObj;
      } else
        cm.curOp.textChanged = changeObj;
    }
  }
  function replaceRange(doc, code, from, to, origin) {
    if (!to)
      to = from;
    if (posLess(to, from)) {
      var tmp = to;
      to = from;
      from = tmp;
    }
    if (typeof code == 'string')
      code = splitLines(code);
    makeChange(doc, {
      from: from,
      to: to,
      text: code,
      origin: origin
    }, null);
  }
  // POSITION OBJECT
  function Pos(line, ch) {
    if (!(this instanceof Pos))
      return new Pos(line, ch);
    this.line = line;
    this.ch = ch;
  }
  CodeMirror.Pos = Pos;
  function posEq(a, b) {
    return a.line == b.line && a.ch == b.ch;
  }
  function posLess(a, b) {
    return a.line < b.line || a.line == b.line && a.ch < b.ch;
  }
  function copyPos(x) {
    return Pos(x.line, x.ch);
  }
  // SELECTION
  function clipLine(doc, n) {
    return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1));
  }
  function clipPos(doc, pos) {
    if (pos.line < doc.first)
      return Pos(doc.first, 0);
    var last = doc.first + doc.size - 1;
    if (pos.line > last)
      return Pos(last, getLine(doc, last).text.length);
    return clipToLen(pos, getLine(doc, pos.line).text.length);
  }
  function clipToLen(pos, linelen) {
    var ch = pos.ch;
    if (ch == null || ch > linelen)
      return Pos(pos.line, linelen);
    else if (ch < 0)
      return Pos(pos.line, 0);
    else
      return pos;
  }
  function isLine(doc, l) {
    return l >= doc.first && l < doc.first + doc.size;
  }
  // If shift is held, this will move the selection anchor. Otherwise,
  // it'll set the whole selection.
  function extendSelection(doc, pos, other, bias) {
    if (doc.sel.shift || doc.sel.extend) {
      var anchor = doc.sel.anchor;
      if (other) {
        var posBefore = posLess(pos, anchor);
        if (posBefore != posLess(other, anchor)) {
          anchor = pos;
          pos = other;
        } else if (posBefore != posLess(pos, other)) {
          pos = other;
        }
      }
      setSelection(doc, anchor, pos, bias);
    } else {
      setSelection(doc, pos, other || pos, bias);
    }
    if (doc.cm)
      doc.cm.curOp.userSelChange = true;
  }
  function filterSelectionChange(doc, anchor, head) {
    var obj = {
        anchor: anchor,
        head: head
      };
    signal(doc, 'beforeSelectionChange', doc, obj);
    if (doc.cm)
      signal(doc.cm, 'beforeSelectionChange', doc.cm, obj);
    obj.anchor = clipPos(doc, obj.anchor);
    obj.head = clipPos(doc, obj.head);
    return obj;
  }
  // Update the selection. Last two args are only used by
  // updateDoc, since they have to be expressed in the line
  // numbers before the update.
  function setSelection(doc, anchor, head, bias, checkAtomic) {
    if (!checkAtomic && hasHandler(doc, 'beforeSelectionChange') || doc.cm && hasHandler(doc.cm, 'beforeSelectionChange')) {
      var filtered = filterSelectionChange(doc, anchor, head);
      head = filtered.head;
      anchor = filtered.anchor;
    }
    var sel = doc.sel;
    sel.goalColumn = null;
    // Skip over atomic spans.
    if (checkAtomic || !posEq(anchor, sel.anchor))
      anchor = skipAtomic(doc, anchor, bias, checkAtomic != 'push');
    if (checkAtomic || !posEq(head, sel.head))
      head = skipAtomic(doc, head, bias, checkAtomic != 'push');
    if (posEq(sel.anchor, anchor) && posEq(sel.head, head))
      return;
    sel.anchor = anchor;
    sel.head = head;
    var inv = posLess(head, anchor);
    sel.from = inv ? head : anchor;
    sel.to = inv ? anchor : head;
    if (doc.cm)
      doc.cm.curOp.updateInput = doc.cm.curOp.selectionChanged = doc.cm.curOp.cursorActivity = true;
    signalLater(doc, 'cursorActivity', doc);
  }
  function reCheckSelection(cm) {
    setSelection(cm.doc, cm.doc.sel.from, cm.doc.sel.to, null, 'push');
  }
  function skipAtomic(doc, pos, bias, mayClear) {
    var flipped = false, curPos = pos;
    var dir = bias || 1;
    doc.cantEdit = false;
    search:
      for (;;) {
        var line = getLine(doc, curPos.line);
        if (line.markedSpans) {
          for (var i = 0; i < line.markedSpans.length; ++i) {
            var sp = line.markedSpans[i], m = sp.marker;
            if ((sp.from == null || (m.inclusiveLeft ? sp.from <= curPos.ch : sp.from < curPos.ch)) && (sp.to == null || (m.inclusiveRight ? sp.to >= curPos.ch : sp.to > curPos.ch))) {
              if (mayClear) {
                signal(m, 'beforeCursorEnter');
                if (m.explicitlyCleared) {
                  if (!line.markedSpans)
                    break;
                  else {
                    --i;
                    continue;
                  }
                }
              }
              if (!m.atomic)
                continue;
              var newPos = m.find()[dir < 0 ? 'from' : 'to'];
              if (posEq(newPos, curPos)) {
                newPos.ch += dir;
                if (newPos.ch < 0) {
                  if (newPos.line > doc.first)
                    newPos = clipPos(doc, Pos(newPos.line - 1));
                  else
                    newPos = null;
                } else if (newPos.ch > line.text.length) {
                  if (newPos.line < doc.first + doc.size - 1)
                    newPos = Pos(newPos.line + 1, 0);
                  else
                    newPos = null;
                }
                if (!newPos) {
                  if (flipped) {
                    // Driven in a corner -- no valid cursor position found at all
                    // -- try again *with* clearing, if we didn't already
                    if (!mayClear)
                      return skipAtomic(doc, pos, bias, true);
                    // Otherwise, turn off editing until further notice, and return the start of the doc
                    doc.cantEdit = true;
                    return Pos(doc.first, 0);
                  }
                  flipped = true;
                  newPos = pos;
                  dir = -dir;
                }
              }
              curPos = newPos;
              continue search;
            }
          }
        }
        return curPos;
      }
  }
  // SCROLLING
  function scrollCursorIntoView(cm) {
    var coords = scrollPosIntoView(cm, cm.doc.sel.head, cm.options.cursorScrollMargin);
    if (!cm.state.focused)
      return;
    var display = cm.display, box = getRect(display.sizer), doScroll = null;
    if (coords.top + box.top < 0)
      doScroll = true;
    else if (coords.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight))
      doScroll = false;
    if (doScroll != null && !phantom) {
      var hidden = display.cursor.style.display == 'none';
      if (hidden) {
        display.cursor.style.display = '';
        display.cursor.style.left = coords.left + 'px';
        display.cursor.style.top = coords.top - display.viewOffset + 'px';
      }
      display.cursor.scrollIntoView(doScroll);
      if (hidden)
        display.cursor.style.display = 'none';
    }
  }
  function scrollPosIntoView(cm, pos, margin) {
    if (margin == null)
      margin = 0;
    for (;;) {
      var changed = false, coords = cursorCoords(cm, pos);
      var scrollPos = calculateScrollPos(cm, coords.left, coords.top - margin, coords.left, coords.bottom + margin);
      var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft;
      if (scrollPos.scrollTop != null) {
        setScrollTop(cm, scrollPos.scrollTop);
        if (Math.abs(cm.doc.scrollTop - startTop) > 1)
          changed = true;
      }
      if (scrollPos.scrollLeft != null) {
        setScrollLeft(cm, scrollPos.scrollLeft);
        if (Math.abs(cm.doc.scrollLeft - startLeft) > 1)
          changed = true;
      }
      if (!changed)
        return coords;
    }
  }
  function scrollIntoView(cm, x1, y1, x2, y2) {
    var scrollPos = calculateScrollPos(cm, x1, y1, x2, y2);
    if (scrollPos.scrollTop != null)
      setScrollTop(cm, scrollPos.scrollTop);
    if (scrollPos.scrollLeft != null)
      setScrollLeft(cm, scrollPos.scrollLeft);
  }
  function calculateScrollPos(cm, x1, y1, x2, y2) {
    var display = cm.display, snapMargin = textHeight(cm.display);
    if (y1 < 0)
      y1 = 0;
    var screen = display.scroller.clientHeight - scrollerCutOff, screentop = display.scroller.scrollTop, result = {};
    var docBottom = cm.doc.height + paddingVert(display);
    var atTop = y1 < snapMargin, atBottom = y2 > docBottom - snapMargin;
    if (y1 < screentop) {
      result.scrollTop = atTop ? 0 : y1;
    } else if (y2 > screentop + screen) {
      var newTop = Math.min(y1, (atBottom ? docBottom : y2) - screen);
      if (newTop != screentop)
        result.scrollTop = newTop;
    }
    var screenw = display.scroller.clientWidth - scrollerCutOff, screenleft = display.scroller.scrollLeft;
    x1 += display.gutters.offsetWidth;
    x2 += display.gutters.offsetWidth;
    var gutterw = display.gutters.offsetWidth;
    var atLeft = x1 < gutterw + 10;
    if (x1 < screenleft + gutterw || atLeft) {
      if (atLeft)
        x1 = 0;
      result.scrollLeft = Math.max(0, x1 - 10 - gutterw);
    } else if (x2 > screenw + screenleft - 3) {
      result.scrollLeft = x2 + 10 - screenw;
    }
    return result;
  }
  function updateScrollPos(cm, left, top) {
    cm.curOp.updateScrollPos = {
      scrollLeft: left == null ? cm.doc.scrollLeft : left,
      scrollTop: top == null ? cm.doc.scrollTop : top
    };
  }
  function addToScrollPos(cm, left, top) {
    var pos = cm.curOp.updateScrollPos || (cm.curOp.updateScrollPos = {
        scrollLeft: cm.doc.scrollLeft,
        scrollTop: cm.doc.scrollTop
      });
    var scroll = cm.display.scroller;
    pos.scrollTop = Math.max(0, Math.min(scroll.scrollHeight - scroll.clientHeight, pos.scrollTop + top));
    pos.scrollLeft = Math.max(0, Math.min(scroll.scrollWidth - scroll.clientWidth, pos.scrollLeft + left));
  }
  // API UTILITIES
  function indentLine(cm, n, how, aggressive) {
    var doc = cm.doc;
    if (how == null)
      how = 'add';
    if (how == 'smart') {
      if (!cm.doc.mode.indent)
        how = 'prev';
      else
        var state = getStateBefore(cm, n);
    }
    var tabSize = cm.options.tabSize;
    var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize);
    var curSpaceString = line.text.match(/^\s*/)[0], indentation;
    if (how == 'smart') {
      indentation = cm.doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
      if (indentation == Pass) {
        if (!aggressive)
          return;
        how = 'prev';
      }
    }
    if (how == 'prev') {
      if (n > doc.first)
        indentation = countColumn(getLine(doc, n - 1).text, null, tabSize);
      else
        indentation = 0;
    } else if (how == 'add') {
      indentation = curSpace + cm.options.indentUnit;
    } else if (how == 'subtract') {
      indentation = curSpace - cm.options.indentUnit;
    } else if (typeof how == 'number') {
      indentation = curSpace + how;
    }
    indentation = Math.max(0, indentation);
    var indentString = '', pos = 0;
    if (cm.options.indentWithTabs)
      for (var i = Math.floor(indentation / tabSize); i; --i) {
        pos += tabSize;
        indentString += '\t';
      }
    if (pos < indentation)
      indentString += spaceStr(indentation - pos);
    if (indentString != curSpaceString)
      replaceRange(cm.doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), '+input');
    line.stateAfter = null;
  }
  function changeLine(cm, handle, op) {
    var no = handle, line = handle, doc = cm.doc;
    if (typeof handle == 'number')
      line = getLine(doc, clipLine(doc, handle));
    else
      no = lineNo(handle);
    if (no == null)
      return null;
    if (op(line, no))
      regChange(cm, no, no + 1);
    else
      return null;
    return line;
  }
  function findPosH(doc, pos, dir, unit, visually) {
    var line = pos.line, ch = pos.ch, origDir = dir;
    var lineObj = getLine(doc, line);
    var possible = true;
    function findNextLine() {
      var l = line + dir;
      if (l < doc.first || l >= doc.first + doc.size)
        return possible = false;
      line = l;
      return lineObj = getLine(doc, l);
    }
    function moveOnce(boundToLine) {
      var next = (visually ? moveVisually : moveLogically)(lineObj, ch, dir, true);
      if (next == null) {
        if (!boundToLine && findNextLine()) {
          if (visually)
            ch = (dir < 0 ? lineRight : lineLeft)(lineObj);
          else
            ch = dir < 0 ? lineObj.text.length : 0;
        } else
          return possible = false;
      } else
        ch = next;
      return true;
    }
    if (unit == 'char')
      moveOnce();
    else if (unit == 'column')
      moveOnce(true);
    else if (unit == 'word' || unit == 'group') {
      var sawType = null, group = unit == 'group';
      for (var first = true;; first = false) {
        if (dir < 0 && !moveOnce(!first))
          break;
        var cur = lineObj.text.charAt(ch) || '\n';
        var type = isWordChar(cur) ? 'w' : !group ? null : /\s/.test(cur) ? null : 'p';
        if (sawType && sawType != type) {
          if (dir < 0) {
            dir = 1;
            moveOnce();
          }
          break;
        }
        if (type)
          sawType = type;
        if (dir > 0 && !moveOnce(!first))
          break;
      }
    }
    var result = skipAtomic(doc, Pos(line, ch), origDir, true);
    if (!possible)
      result.hitSide = true;
    return result;
  }
  function findPosV(cm, pos, dir, unit) {
    var doc = cm.doc, x = pos.left, y;
    if (unit == 'page') {
      var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
      y = pos.top + dir * (pageSize - (dir < 0 ? 1.5 : 0.5) * textHeight(cm.display));
    } else if (unit == 'line') {
      y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
    }
    for (;;) {
      var target = coordsChar(cm, x, y);
      if (!target.outside)
        break;
      if (dir < 0 ? y <= 0 : y >= doc.height) {
        target.hitSide = true;
        break;
      }
      y += dir * 5;
    }
    return target;
  }
  function findWordAt(line, pos) {
    var start = pos.ch, end = pos.ch;
    if (line) {
      if ((pos.xRel < 0 || end == line.length) && start)
        --start;
      else
        ++end;
      var startChar = line.charAt(start);
      var check = isWordChar(startChar) ? isWordChar : /\s/.test(startChar) ? function (ch) {
          return /\s/.test(ch);
        } : function (ch) {
          return !/\s/.test(ch) && !isWordChar(ch);
        };
      while (start > 0 && check(line.charAt(start - 1)))
        --start;
      while (end < line.length && check(line.charAt(end)))
        ++end;
    }
    return {
      from: Pos(pos.line, start),
      to: Pos(pos.line, end)
    };
  }
  function selectLine(cm, line) {
    extendSelection(cm.doc, Pos(line, 0), clipPos(cm.doc, Pos(line + 1, 0)));
  }
  // PROTOTYPE
  // The publicly visible API. Note that operation(null, f) means
  // 'wrap f in an operation, performed on its `this` parameter'
  CodeMirror.prototype = {
    constructor: CodeMirror,
    focus: function () {
      window.focus();
      focusInput(this);
      onFocus(this);
      fastPoll(this);
    },
    setOption: function (option, value) {
      var options = this.options, old = options[option];
      if (options[option] == value && option != 'mode')
        return;
      options[option] = value;
      if (optionHandlers.hasOwnProperty(option))
        operation(this, optionHandlers[option])(this, value, old);
    },
    getOption: function (option) {
      return this.options[option];
    },
    getDoc: function () {
      return this.doc;
    },
    addKeyMap: function (map, bottom) {
      this.state.keyMaps[bottom ? 'push' : 'unshift'](map);
    },
    removeKeyMap: function (map) {
      var maps = this.state.keyMaps;
      for (var i = 0; i < maps.length; ++i)
        if (maps[i] == map || typeof maps[i] != 'string' && maps[i].name == map) {
          maps.splice(i, 1);
          return true;
        }
    },
    addOverlay: operation(null, function (spec, options) {
      var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
      if (mode.startState)
        throw new Error('Overlays may not be stateful.');
      this.state.overlays.push({
        mode: mode,
        modeSpec: spec,
        opaque: options && options.opaque
      });
      this.state.modeGen++;
      regChange(this);
    }),
    removeOverlay: operation(null, function (spec) {
      var overlays = this.state.overlays;
      for (var i = 0; i < overlays.length; ++i) {
        var cur = overlays[i].modeSpec;
        if (cur == spec || typeof spec == 'string' && cur.name == spec) {
          overlays.splice(i, 1);
          this.state.modeGen++;
          regChange(this);
          return;
        }
      }
    }),
    indentLine: operation(null, function (n, dir, aggressive) {
      if (typeof dir != 'string' && typeof dir != 'number') {
        if (dir == null)
          dir = this.options.smartIndent ? 'smart' : 'prev';
        else
          dir = dir ? 'add' : 'subtract';
      }
      if (isLine(this.doc, n))
        indentLine(this, n, dir, aggressive);
    }),
    indentSelection: operation(null, function (how) {
      var sel = this.doc.sel;
      if (posEq(sel.from, sel.to))
        return indentLine(this, sel.from.line, how);
      var e = sel.to.line - (sel.to.ch ? 0 : 1);
      for (var i = sel.from.line; i <= e; ++i)
        indentLine(this, i, how);
    }),
    getTokenAt: function (pos, precise) {
      var doc = this.doc;
      pos = clipPos(doc, pos);
      var state = getStateBefore(this, pos.line, precise), mode = this.doc.mode;
      var line = getLine(doc, pos.line);
      var stream = new StringStream(line.text, this.options.tabSize);
      while (stream.pos < pos.ch && !stream.eol()) {
        stream.start = stream.pos;
        var style = mode.token(stream, state);
      }
      return {
        start: stream.start,
        end: stream.pos,
        string: stream.current(),
        className: style || null,
        type: style || null,
        state: state
      };
    },
    getTokenTypeAt: function (pos) {
      pos = clipPos(this.doc, pos);
      var styles = getLineStyles(this, getLine(this.doc, pos.line));
      var before = 0, after = (styles.length - 1) / 2, ch = pos.ch;
      if (ch == 0)
        return styles[2];
      for (;;) {
        var mid = before + after >> 1;
        if ((mid ? styles[mid * 2 - 1] : 0) >= ch)
          after = mid;
        else if (styles[mid * 2 + 1] < ch)
          before = mid + 1;
        else
          return styles[mid * 2 + 2];
      }
    },
    getModeAt: function (pos) {
      var mode = this.doc.mode;
      if (!mode.innerMode)
        return mode;
      return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode;
    },
    getHelper: function (pos, type) {
      if (!helpers.hasOwnProperty(type))
        return;
      var help = helpers[type], mode = this.getModeAt(pos);
      return mode[type] && help[mode[type]] || mode.helperType && help[mode.helperType] || help[mode.name];
    },
    getStateAfter: function (line, precise) {
      var doc = this.doc;
      line = clipLine(doc, line == null ? doc.first + doc.size - 1 : line);
      return getStateBefore(this, line + 1, precise);
    },
    cursorCoords: function (start, mode) {
      var pos, sel = this.doc.sel;
      if (start == null)
        pos = sel.head;
      else if (typeof start == 'object')
        pos = clipPos(this.doc, start);
      else
        pos = start ? sel.from : sel.to;
      return cursorCoords(this, pos, mode || 'page');
    },
    charCoords: function (pos, mode) {
      return charCoords(this, clipPos(this.doc, pos), mode || 'page');
    },
    coordsChar: function (coords, mode) {
      coords = fromCoordSystem(this, coords, mode || 'page');
      return coordsChar(this, coords.left, coords.top);
    },
    lineAtHeight: function (height, mode) {
      height = fromCoordSystem(this, {
        top: height,
        left: 0
      }, mode || 'page').top;
      return lineAtHeight(this.doc, height + this.display.viewOffset);
    },
    heightAtLine: function (line, mode) {
      var end = false, last = this.doc.first + this.doc.size - 1;
      if (line < this.doc.first)
        line = this.doc.first;
      else if (line > last) {
        line = last;
        end = true;
      }
      var lineObj = getLine(this.doc, line);
      return intoCoordSystem(this, getLine(this.doc, line), {
        top: 0,
        left: 0
      }, mode || 'page').top + (end ? lineObj.height : 0);
    },
    defaultTextHeight: function () {
      return textHeight(this.display);
    },
    defaultCharWidth: function () {
      return charWidth(this.display);
    },
    setGutterMarker: operation(null, function (line, gutterID, value) {
      return changeLine(this, line, function (line) {
        var markers = line.gutterMarkers || (line.gutterMarkers = {});
        markers[gutterID] = value;
        if (!value && isEmpty(markers))
          line.gutterMarkers = null;
        return true;
      });
    }),
    clearGutter: operation(null, function (gutterID) {
      var cm = this, doc = cm.doc, i = doc.first;
      doc.iter(function (line) {
        if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
          line.gutterMarkers[gutterID] = null;
          regChange(cm, i, i + 1);
          if (isEmpty(line.gutterMarkers))
            line.gutterMarkers = null;
        }
        ++i;
      });
    }),
    addLineClass: operation(null, function (handle, where, cls) {
      return changeLine(this, handle, function (line) {
        var prop = where == 'text' ? 'textClass' : where == 'background' ? 'bgClass' : 'wrapClass';
        if (!line[prop])
          line[prop] = cls;
        else if (new RegExp('(?:^|\\s)' + cls + '(?:$|\\s)').test(line[prop]))
          return false;
        else
          line[prop] += ' ' + cls;
        return true;
      });
    }),
    removeLineClass: operation(null, function (handle, where, cls) {
      return changeLine(this, handle, function (line) {
        var prop = where == 'text' ? 'textClass' : where == 'background' ? 'bgClass' : 'wrapClass';
        var cur = line[prop];
        if (!cur)
          return false;
        else if (cls == null)
          line[prop] = null;
        else {
          var found = cur.match(new RegExp('(?:^|\\s+)' + cls + '(?:$|\\s+)'));
          if (!found)
            return false;
          var end = found.index + found[0].length;
          line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? '' : ' ') + cur.slice(end) || null;
        }
        return true;
      });
    }),
    addLineWidget: operation(null, function (handle, node, options) {
      return addLineWidget(this, handle, node, options);
    }),
    removeLineWidget: function (widget) {
      widget.clear();
    },
    lineInfo: function (line) {
      if (typeof line == 'number') {
        if (!isLine(this.doc, line))
          return null;
        var n = line;
        line = getLine(this.doc, line);
        if (!line)
          return null;
      } else {
        var n = lineNo(line);
        if (n == null)
          return null;
      }
      return {
        line: n,
        handle: line,
        text: line.text,
        gutterMarkers: line.gutterMarkers,
        textClass: line.textClass,
        bgClass: line.bgClass,
        wrapClass: line.wrapClass,
        widgets: line.widgets
      };
    },
    getViewport: function () {
      return {
        from: this.display.showingFrom,
        to: this.display.showingTo
      };
    },
    addWidget: function (pos, node, scroll, vert, horiz) {
      var display = this.display;
      pos = cursorCoords(this, clipPos(this.doc, pos));
      var top = pos.bottom, left = pos.left;
      node.style.position = 'absolute';
      display.sizer.appendChild(node);
      if (vert == 'over') {
        top = pos.top;
      } else if (vert == 'above' || vert == 'near') {
        var vspace = Math.max(display.wrapper.clientHeight, this.doc.height), hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
        // Default to positioning above (if specified and possible); otherwise default to positioning below
        if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
          top = pos.top - node.offsetHeight;
        else if (pos.bottom + node.offsetHeight <= vspace)
          top = pos.bottom;
        if (left + node.offsetWidth > hspace)
          left = hspace - node.offsetWidth;
      }
      node.style.top = top + 'px';
      node.style.left = node.style.right = '';
      if (horiz == 'right') {
        left = display.sizer.clientWidth - node.offsetWidth;
        node.style.right = '0px';
      } else {
        if (horiz == 'left')
          left = 0;
        else if (horiz == 'middle')
          left = (display.sizer.clientWidth - node.offsetWidth) / 2;
        node.style.left = left + 'px';
      }
      if (scroll)
        scrollIntoView(this, left, top, left + node.offsetWidth, top + node.offsetHeight);
    },
    triggerOnKeyDown: operation(null, onKeyDown),
    execCommand: function (cmd) {
      return commands[cmd](this);
    },
    findPosH: function (from, amount, unit, visually) {
      var dir = 1;
      if (amount < 0) {
        dir = -1;
        amount = -amount;
      }
      for (var i = 0, cur = clipPos(this.doc, from); i < amount; ++i) {
        cur = findPosH(this.doc, cur, dir, unit, visually);
        if (cur.hitSide)
          break;
      }
      return cur;
    },
    moveH: operation(null, function (dir, unit) {
      var sel = this.doc.sel, pos;
      if (sel.shift || sel.extend || posEq(sel.from, sel.to))
        pos = findPosH(this.doc, sel.head, dir, unit, this.options.rtlMoveVisually);
      else
        pos = dir < 0 ? sel.from : sel.to;
      extendSelection(this.doc, pos, pos, dir);
    }),
    deleteH: operation(null, function (dir, unit) {
      var sel = this.doc.sel;
      if (!posEq(sel.from, sel.to))
        replaceRange(this.doc, '', sel.from, sel.to, '+delete');
      else
        replaceRange(this.doc, '', sel.from, findPosH(this.doc, sel.head, dir, unit, false), '+delete');
      this.curOp.userSelChange = true;
    }),
    findPosV: function (from, amount, unit, goalColumn) {
      var dir = 1, x = goalColumn;
      if (amount < 0) {
        dir = -1;
        amount = -amount;
      }
      for (var i = 0, cur = clipPos(this.doc, from); i < amount; ++i) {
        var coords = cursorCoords(this, cur, 'div');
        if (x == null)
          x = coords.left;
        else
          coords.left = x;
        cur = findPosV(this, coords, dir, unit);
        if (cur.hitSide)
          break;
      }
      return cur;
    },
    moveV: operation(null, function (dir, unit) {
      var sel = this.doc.sel;
      var pos = cursorCoords(this, sel.head, 'div');
      if (sel.goalColumn != null)
        pos.left = sel.goalColumn;
      var target = findPosV(this, pos, dir, unit);
      if (unit == 'page')
        addToScrollPos(this, 0, charCoords(this, target, 'div').top - pos.top);
      extendSelection(this.doc, target, target, dir);
      sel.goalColumn = pos.left;
    }),
    toggleOverwrite: function (value) {
      if (value != null && value == this.state.overwrite)
        return;
      if (this.state.overwrite = !this.state.overwrite)
        this.display.cursor.className += ' CodeMirror-overwrite';
      else
        this.display.cursor.className = this.display.cursor.className.replace(' CodeMirror-overwrite', '');
    },
    hasFocus: function () {
      return this.state.focused;
    },
    scrollTo: operation(null, function (x, y) {
      updateScrollPos(this, x, y);
    }),
    getScrollInfo: function () {
      var scroller = this.display.scroller, co = scrollerCutOff;
      return {
        left: scroller.scrollLeft,
        top: scroller.scrollTop,
        height: scroller.scrollHeight - co,
        width: scroller.scrollWidth - co,
        clientHeight: scroller.clientHeight - co,
        clientWidth: scroller.clientWidth - co
      };
    },
    scrollIntoView: operation(null, function (pos, margin) {
      if (typeof pos == 'number')
        pos = Pos(pos, 0);
      if (!margin)
        margin = 0;
      var coords = pos;
      if (!pos || pos.line != null) {
        this.curOp.scrollToPos = pos ? clipPos(this.doc, pos) : this.doc.sel.head;
        this.curOp.scrollToPosMargin = margin;
        coords = cursorCoords(this, this.curOp.scrollToPos);
      }
      var sPos = calculateScrollPos(this, coords.left, coords.top - margin, coords.right, coords.bottom + margin);
      updateScrollPos(this, sPos.scrollLeft, sPos.scrollTop);
    }),
    setSize: operation(null, function (width, height) {
      function interpret(val) {
        return typeof val == 'number' || /^\d+$/.test(String(val)) ? val + 'px' : val;
      }
      if (width != null)
        this.display.wrapper.style.width = interpret(width);
      if (height != null)
        this.display.wrapper.style.height = interpret(height);
      if (this.options.lineWrapping)
        this.display.measureLineCache.length = this.display.measureLineCachePos = 0;
      this.curOp.forceUpdate = true;
    }),
    operation: function (f) {
      return runInOp(this, f);
    },
    refresh: operation(null, function () {
      clearCaches(this);
      updateScrollPos(this, this.doc.scrollLeft, this.doc.scrollTop);
      regChange(this);
    }),
    swapDoc: operation(null, function (doc) {
      var old = this.doc;
      old.cm = null;
      attachDoc(this, doc);
      clearCaches(this);
      resetInput(this, true);
      updateScrollPos(this, doc.scrollLeft, doc.scrollTop);
      return old;
    }),
    getInputField: function () {
      return this.display.input;
    },
    getWrapperElement: function () {
      return this.display.wrapper;
    },
    getScrollerElement: function () {
      return this.display.scroller;
    },
    getGutterElement: function () {
      return this.display.gutters;
    }
  };
  eventMixin(CodeMirror);
  // OPTION DEFAULTS
  var optionHandlers = CodeMirror.optionHandlers = {};
  // The default configuration options.
  var defaults = CodeMirror.defaults = {};
  function option(name, deflt, handle, notOnInit) {
    CodeMirror.defaults[name] = deflt;
    if (handle)
      optionHandlers[name] = notOnInit ? function (cm, val, old) {
        if (old != Init)
          handle(cm, val, old);
      } : handle;
  }
  var Init = CodeMirror.Init = {
      toString: function () {
        return 'CodeMirror.Init';
      }
    };
  // These two are, on init, called from the constructor because they
  // have to be initialized before the editor can start at all.
  option('value', '', function (cm, val) {
    cm.setValue(val);
  }, true);
  option('mode', null, function (cm, val) {
    cm.doc.modeOption = val;
    loadMode(cm);
  }, true);
  option('indentUnit', 2, loadMode, true);
  option('indentWithTabs', false);
  option('smartIndent', true);
  option('tabSize', 4, function (cm) {
    loadMode(cm);
    clearCaches(cm);
    regChange(cm);
  }, true);
  option('electricChars', true);
  option('rtlMoveVisually', !windows);
  option('theme', 'default', function (cm) {
    themeChanged(cm);
    guttersChanged(cm);
  }, true);
  option('keyMap', 'default', keyMapChanged);
  option('extraKeys', null);
  option('onKeyEvent', null);
  option('onDragEvent', null);
  option('lineWrapping', false, wrappingChanged, true);
  option('gutters', [], function (cm) {
    setGuttersForLineNumbers(cm.options);
    guttersChanged(cm);
  }, true);
  option('fixedGutter', true, function (cm, val) {
    cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + 'px' : '0';
    cm.refresh();
  }, true);
  option('coverGutterNextToScrollbar', false, updateScrollbars, true);
  option('lineNumbers', false, function (cm) {
    setGuttersForLineNumbers(cm.options);
    guttersChanged(cm);
  }, true);
  option('firstLineNumber', 1, guttersChanged, true);
  option('lineNumberFormatter', function (integer) {
    return integer;
  }, guttersChanged, true);
  option('showCursorWhenSelecting', false, updateSelection, true);
  option('readOnly', false, function (cm, val) {
    if (val == 'nocursor') {
      onBlur(cm);
      cm.display.input.blur();
    } else if (!val)
      resetInput(cm, true);
  });
  option('dragDrop', true);
  option('cursorBlinkRate', 530);
  option('cursorScrollMargin', 0);
  option('cursorHeight', 1);
  option('workTime', 100);
  option('workDelay', 100);
  option('flattenSpans', true);
  option('pollInterval', 100);
  option('undoDepth', 40, function (cm, val) {
    cm.doc.history.undoDepth = val;
  });
  option('historyEventDelay', 500);
  option('viewportMargin', 10, function (cm) {
    cm.refresh();
  }, true);
  option('maxHighlightLength', 10000, function (cm) {
    loadMode(cm);
    cm.refresh();
  }, true);
  option('moveInputWithCursor', true, function (cm, val) {
    if (!val)
      cm.display.inputDiv.style.top = cm.display.inputDiv.style.left = 0;
  });
  option('tabindex', null, function (cm, val) {
    cm.display.input.tabIndex = val || '';
  });
  option('autofocus', null);
  // MODE DEFINITION AND QUERYING
  // Known modes, by name and by MIME
  var modes = CodeMirror.modes = {}, mimeModes = CodeMirror.mimeModes = {};
  CodeMirror.defineMode = function (name, mode) {
    if (!CodeMirror.defaults.mode && name != 'null')
      CodeMirror.defaults.mode = name;
    if (arguments.length > 2) {
      mode.dependencies = [];
      for (var i = 2; i < arguments.length; ++i)
        mode.dependencies.push(arguments[i]);
    }
    modes[name] = mode;
  };
  CodeMirror.defineMIME = function (mime, spec) {
    mimeModes[mime] = spec;
  };
  CodeMirror.resolveMode = function (spec) {
    if (typeof spec == 'string' && mimeModes.hasOwnProperty(spec)) {
      spec = mimeModes[spec];
    } else if (spec && typeof spec.name == 'string' && mimeModes.hasOwnProperty(spec.name)) {
      var found = mimeModes[spec.name];
      spec = createObj(found, spec);
      spec.name = found.name;
    } else if (typeof spec == 'string' && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
      return CodeMirror.resolveMode('application/xml');
    }
    if (typeof spec == 'string')
      return { name: spec };
    else
      return spec || { name: 'null' };
  };
  CodeMirror.getMode = function (options, spec) {
    var spec = CodeMirror.resolveMode(spec);
    var mfactory = modes[spec.name];
    if (!mfactory)
      return CodeMirror.getMode(options, 'text/plain');
    var modeObj = mfactory(options, spec);
    if (modeExtensions.hasOwnProperty(spec.name)) {
      var exts = modeExtensions[spec.name];
      for (var prop in exts) {
        if (!exts.hasOwnProperty(prop))
          continue;
        if (modeObj.hasOwnProperty(prop))
          modeObj['_' + prop] = modeObj[prop];
        modeObj[prop] = exts[prop];
      }
    }
    modeObj.name = spec.name;
    return modeObj;
  };
  CodeMirror.defineMode('null', function () {
    return {
      token: function (stream) {
        stream.skipToEnd();
      }
    };
  });
  CodeMirror.defineMIME('text/plain', 'null');
  var modeExtensions = CodeMirror.modeExtensions = {};
  CodeMirror.extendMode = function (mode, properties) {
    var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : modeExtensions[mode] = {};
    copyObj(properties, exts);
  };
  // EXTENSIONS
  CodeMirror.defineExtension = function (name, func) {
    CodeMirror.prototype[name] = func;
  };
  CodeMirror.defineDocExtension = function (name, func) {
    Doc.prototype[name] = func;
  };
  CodeMirror.defineOption = option;
  var initHooks = [];
  CodeMirror.defineInitHook = function (f) {
    initHooks.push(f);
  };
  var helpers = CodeMirror.helpers = {};
  CodeMirror.registerHelper = function (type, name, value) {
    if (!helpers.hasOwnProperty(type))
      helpers[type] = CodeMirror[type] = {};
    helpers[type][name] = value;
  };
  // UTILITIES
  CodeMirror.isWordChar = isWordChar;
  // MODE STATE HANDLING
  // Utility functions for working with state. Exported because modes
  // sometimes need to do this.
  function copyState(mode, state) {
    if (state === true)
      return state;
    if (mode.copyState)
      return mode.copyState(state);
    var nstate = {};
    for (var n in state) {
      var val = state[n];
      if (val instanceof Array)
        val = val.concat([]);
      nstate[n] = val;
    }
    return nstate;
  }
  CodeMirror.copyState = copyState;
  function startState(mode, a1, a2) {
    return mode.startState ? mode.startState(a1, a2) : true;
  }
  CodeMirror.startState = startState;
  CodeMirror.innerMode = function (mode, state) {
    while (mode.innerMode) {
      var info = mode.innerMode(state);
      if (!info || info.mode == mode)
        break;
      state = info.state;
      mode = info.mode;
    }
    return info || {
      mode: mode,
      state: state
    };
  };
  // STANDARD COMMANDS
  var commands = CodeMirror.commands = {
      selectAll: function (cm) {
        cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()));
      },
      killLine: function (cm) {
        var from = cm.getCursor(true), to = cm.getCursor(false), sel = !posEq(from, to);
        if (!sel && cm.getLine(from.line).length == from.ch)
          cm.replaceRange('', from, Pos(from.line + 1, 0), '+delete');
        else
          cm.replaceRange('', from, sel ? to : Pos(from.line), '+delete');
      },
      deleteLine: function (cm) {
        var l = cm.getCursor().line;
        cm.replaceRange('', Pos(l, 0), Pos(l), '+delete');
      },
      delLineLeft: function (cm) {
        var cur = cm.getCursor();
        cm.replaceRange('', Pos(cur.line, 0), cur, '+delete');
      },
      undo: function (cm) {
        cm.undo();
      },
      redo: function (cm) {
        cm.redo();
      },
      goDocStart: function (cm) {
        cm.extendSelection(Pos(cm.firstLine(), 0));
      },
      goDocEnd: function (cm) {
        cm.extendSelection(Pos(cm.lastLine()));
      },
      goLineStart: function (cm) {
        cm.extendSelection(lineStart(cm, cm.getCursor().line));
      },
      goLineStartSmart: function (cm) {
        var cur = cm.getCursor(), start = lineStart(cm, cur.line);
        var line = cm.getLineHandle(start.line);
        var order = getOrder(line);
        if (!order || order[0].level == 0) {
          var firstNonWS = Math.max(0, line.text.search(/\S/));
          var inWS = cur.line == start.line && cur.ch <= firstNonWS && cur.ch;
          cm.extendSelection(Pos(start.line, inWS ? 0 : firstNonWS));
        } else
          cm.extendSelection(start);
      },
      goLineEnd: function (cm) {
        cm.extendSelection(lineEnd(cm, cm.getCursor().line));
      },
      goLineRight: function (cm) {
        var top = cm.charCoords(cm.getCursor(), 'div').top + 5;
        cm.extendSelection(cm.coordsChar({
          left: cm.display.lineDiv.offsetWidth + 100,
          top: top
        }, 'div'));
      },
      goLineLeft: function (cm) {
        var top = cm.charCoords(cm.getCursor(), 'div').top + 5;
        cm.extendSelection(cm.coordsChar({
          left: 0,
          top: top
        }, 'div'));
      },
      goLineUp: function (cm) {
        cm.moveV(-1, 'line');
      },
      goLineDown: function (cm) {
        cm.moveV(1, 'line');
      },
      goPageUp: function (cm) {
        cm.moveV(-1, 'page');
      },
      goPageDown: function (cm) {
        cm.moveV(1, 'page');
      },
      goCharLeft: function (cm) {
        cm.moveH(-1, 'char');
      },
      goCharRight: function (cm) {
        cm.moveH(1, 'char');
      },
      goColumnLeft: function (cm) {
        cm.moveH(-1, 'column');
      },
      goColumnRight: function (cm) {
        cm.moveH(1, 'column');
      },
      goWordLeft: function (cm) {
        cm.moveH(-1, 'word');
      },
      goGroupRight: function (cm) {
        cm.moveH(1, 'group');
      },
      goGroupLeft: function (cm) {
        cm.moveH(-1, 'group');
      },
      goWordRight: function (cm) {
        cm.moveH(1, 'word');
      },
      delCharBefore: function (cm) {
        cm.deleteH(-1, 'char');
      },
      delCharAfter: function (cm) {
        cm.deleteH(1, 'char');
      },
      delWordBefore: function (cm) {
        cm.deleteH(-1, 'word');
      },
      delWordAfter: function (cm) {
        cm.deleteH(1, 'word');
      },
      delGroupBefore: function (cm) {
        cm.deleteH(-1, 'group');
      },
      delGroupAfter: function (cm) {
        cm.deleteH(1, 'group');
      },
      indentAuto: function (cm) {
        cm.indentSelection('smart');
      },
      indentMore: function (cm) {
        cm.indentSelection('add');
      },
      indentLess: function (cm) {
        cm.indentSelection('subtract');
      },
      insertTab: function (cm) {
        cm.replaceSelection('\t', 'end', '+input');
      },
      defaultTab: function (cm) {
        if (cm.somethingSelected())
          cm.indentSelection('add');
        else
          cm.replaceSelection('\t', 'end', '+input');
      },
      transposeChars: function (cm) {
        var cur = cm.getCursor(), line = cm.getLine(cur.line);
        if (cur.ch > 0 && cur.ch < line.length - 1)
          cm.replaceRange(line.charAt(cur.ch) + line.charAt(cur.ch - 1), Pos(cur.line, cur.ch - 1), Pos(cur.line, cur.ch + 1));
      },
      newlineAndIndent: function (cm) {
        operation(cm, function () {
          cm.replaceSelection('\n', 'end', '+input');
          cm.indentLine(cm.getCursor().line, null, true);
        })();
      },
      toggleOverwrite: function (cm) {
        cm.toggleOverwrite();
      }
    };
  // STANDARD KEYMAPS
  var keyMap = CodeMirror.keyMap = {};
  keyMap.basic = {
    'Left': 'goCharLeft',
    'Right': 'goCharRight',
    'Up': 'goLineUp',
    'Down': 'goLineDown',
    'End': 'goLineEnd',
    'Home': 'goLineStartSmart',
    'PageUp': 'goPageUp',
    'PageDown': 'goPageDown',
    'Delete': 'delCharAfter',
    'Backspace': 'delCharBefore',
    'Tab': 'defaultTab',
    'Shift-Tab': 'indentAuto',
    'Enter': 'newlineAndIndent',
    'Insert': 'toggleOverwrite'
  };
  // Note that the save and find-related commands aren't defined by
  // default. Unknown commands are simply ignored.
  keyMap.pcDefault = {
    'Ctrl-A': 'selectAll',
    'Ctrl-D': 'deleteLine',
    'Ctrl-Z': 'undo',
    'Shift-Ctrl-Z': 'redo',
    'Ctrl-Y': 'redo',
    'Ctrl-Home': 'goDocStart',
    'Alt-Up': 'goDocStart',
    'Ctrl-End': 'goDocEnd',
    'Ctrl-Down': 'goDocEnd',
    'Ctrl-Left': 'goGroupLeft',
    'Ctrl-Right': 'goGroupRight',
    'Alt-Left': 'goLineStart',
    'Alt-Right': 'goLineEnd',
    'Ctrl-Backspace': 'delGroupBefore',
    'Ctrl-Delete': 'delGroupAfter',
    'Ctrl-S': 'save',
    'Ctrl-F': 'find',
    'Ctrl-G': 'findNext',
    'Shift-Ctrl-G': 'findPrev',
    'Shift-Ctrl-F': 'replace',
    'Shift-Ctrl-R': 'replaceAll',
    'Ctrl-[': 'indentLess',
    'Ctrl-]': 'indentMore',
    fallthrough: 'basic'
  };
  keyMap.macDefault = {
    'Cmd-A': 'selectAll',
    'Cmd-D': 'deleteLine',
    'Cmd-Z': 'undo',
    'Shift-Cmd-Z': 'redo',
    'Cmd-Y': 'redo',
    'Cmd-Up': 'goDocStart',
    'Cmd-End': 'goDocEnd',
    'Cmd-Down': 'goDocEnd',
    'Alt-Left': 'goGroupLeft',
    'Alt-Right': 'goGroupRight',
    'Cmd-Left': 'goLineStart',
    'Cmd-Right': 'goLineEnd',
    'Alt-Backspace': 'delGroupBefore',
    'Ctrl-Alt-Backspace': 'delGroupAfter',
    'Alt-Delete': 'delGroupAfter',
    'Cmd-S': 'save',
    'Cmd-F': 'find',
    'Cmd-G': 'findNext',
    'Shift-Cmd-G': 'findPrev',
    'Cmd-Alt-F': 'replace',
    'Shift-Cmd-Alt-F': 'replaceAll',
    'Cmd-[': 'indentLess',
    'Cmd-]': 'indentMore',
    'Cmd-Backspace': 'delLineLeft',
    fallthrough: [
      'basic',
      'emacsy'
    ]
  };
  keyMap['default'] = mac ? keyMap.macDefault : keyMap.pcDefault;
  keyMap.emacsy = {
    'Ctrl-F': 'goCharRight',
    'Ctrl-B': 'goCharLeft',
    'Ctrl-P': 'goLineUp',
    'Ctrl-N': 'goLineDown',
    'Alt-F': 'goWordRight',
    'Alt-B': 'goWordLeft',
    'Ctrl-A': 'goLineStart',
    'Ctrl-E': 'goLineEnd',
    'Ctrl-V': 'goPageDown',
    'Shift-Ctrl-V': 'goPageUp',
    'Ctrl-D': 'delCharAfter',
    'Ctrl-H': 'delCharBefore',
    'Alt-D': 'delWordAfter',
    'Alt-Backspace': 'delWordBefore',
    'Ctrl-K': 'killLine',
    'Ctrl-T': 'transposeChars'
  };
  // KEYMAP DISPATCH
  function getKeyMap(val) {
    if (typeof val == 'string')
      return keyMap[val];
    else
      return val;
  }
  function lookupKey(name, maps, handle) {
    function lookup(map) {
      map = getKeyMap(map);
      var found = map[name];
      if (found === false)
        return 'stop';
      if (found != null && handle(found))
        return true;
      if (map.nofallthrough)
        return 'stop';
      var fallthrough = map.fallthrough;
      if (fallthrough == null)
        return false;
      if (Object.prototype.toString.call(fallthrough) != '[object Array]')
        return lookup(fallthrough);
      for (var i = 0, e = fallthrough.length; i < e; ++i) {
        var done = lookup(fallthrough[i]);
        if (done)
          return done;
      }
      return false;
    }
    for (var i = 0; i < maps.length; ++i) {
      var done = lookup(maps[i]);
      if (done)
        return done != 'stop';
    }
  }
  function isModifierKey(event) {
    var name = keyNames[event.keyCode];
    return name == 'Ctrl' || name == 'Alt' || name == 'Shift' || name == 'Mod';
  }
  function keyName(event, noShift) {
    if (opera && event.keyCode == 34 && event['char'])
      return false;
    var name = keyNames[event.keyCode];
    if (name == null || event.altGraphKey)
      return false;
    if (event.altKey)
      name = 'Alt-' + name;
    if (flipCtrlCmd ? event.metaKey : event.ctrlKey)
      name = 'Ctrl-' + name;
    if (flipCtrlCmd ? event.ctrlKey : event.metaKey)
      name = 'Cmd-' + name;
    if (!noShift && event.shiftKey)
      name = 'Shift-' + name;
    return name;
  }
  CodeMirror.lookupKey = lookupKey;
  CodeMirror.isModifierKey = isModifierKey;
  CodeMirror.keyName = keyName;
  // FROMTEXTAREA
  CodeMirror.fromTextArea = function (textarea, options) {
    if (!options)
      options = {};
    options.value = textarea.value;
    if (!options.tabindex && textarea.tabindex)
      options.tabindex = textarea.tabindex;
    if (!options.placeholder && textarea.placeholder)
      options.placeholder = textarea.placeholder;
    // Set autofocus to true if this textarea is focused, or if it has
    // autofocus and no other element is focused.
    if (options.autofocus == null) {
      var hasFocus = document.body;
      // doc.activeElement occasionally throws on IE
      try {
        hasFocus = document.activeElement;
      } catch (e) {
      }
      options.autofocus = hasFocus == textarea || textarea.getAttribute('autofocus') != null && hasFocus == document.body;
    }
    function save() {
      textarea.value = cm.getValue();
    }
    if (textarea.form) {
      on(textarea.form, 'submit', save);
      // Deplorable hack to make the submit method do the right thing.
      if (!options.leaveSubmitMethodAlone) {
        var form = textarea.form, realSubmit = form.submit;
        try {
          var wrappedSubmit = form.submit = function () {
              save();
              form.submit = realSubmit;
              form.submit();
              form.submit = wrappedSubmit;
            };
        } catch (e) {
        }
      }
    }
    textarea.style.display = 'none';
    var cm = CodeMirror(function (node) {
        textarea.parentNode.insertBefore(node, textarea.nextSibling);
      }, options);
    cm.save = save;
    cm.getTextArea = function () {
      return textarea;
    };
    cm.toTextArea = function () {
      save();
      textarea.parentNode.removeChild(cm.getWrapperElement());
      textarea.style.display = '';
      if (textarea.form) {
        off(textarea.form, 'submit', save);
        if (typeof textarea.form.submit == 'function')
          textarea.form.submit = realSubmit;
      }
    };
    return cm;
  };
  // STRING STREAM
  // Fed to the mode parsers, provides helper functions to make
  // parsers more succinct.
  // The character stream used by a mode's parser.
  function StringStream(string, tabSize) {
    this.pos = this.start = 0;
    this.string = string;
    this.tabSize = tabSize || 8;
    this.lastColumnPos = this.lastColumnValue = 0;
  }
  StringStream.prototype = {
    eol: function () {
      return this.pos >= this.string.length;
    },
    sol: function () {
      return this.pos == 0;
    },
    peek: function () {
      return this.string.charAt(this.pos) || undefined;
    },
    next: function () {
      if (this.pos < this.string.length)
        return this.string.charAt(this.pos++);
    },
    eat: function (match) {
      var ch = this.string.charAt(this.pos);
      if (typeof match == 'string')
        var ok = ch == match;
      else
        var ok = ch && (match.test ? match.test(ch) : match(ch));
      if (ok) {
        ++this.pos;
        return ch;
      }
    },
    eatWhile: function (match) {
      var start = this.pos;
      while (this.eat(match)) {
      }
      return this.pos > start;
    },
    eatSpace: function () {
      var start = this.pos;
      while (/[\s\u00a0]/.test(this.string.charAt(this.pos)))
        ++this.pos;
      return this.pos > start;
    },
    skipToEnd: function () {
      this.pos = this.string.length;
    },
    skipTo: function (ch) {
      var found = this.string.indexOf(ch, this.pos);
      if (found > -1) {
        this.pos = found;
        return true;
      }
    },
    backUp: function (n) {
      this.pos -= n;
    },
    column: function () {
      if (this.lastColumnPos < this.start) {
        this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
        this.lastColumnPos = this.start;
      }
      return this.lastColumnValue;
    },
    indentation: function () {
      return countColumn(this.string, null, this.tabSize);
    },
    match: function (pattern, consume, caseInsensitive) {
      if (typeof pattern == 'string') {
        var cased = function (str) {
          return caseInsensitive ? str.toLowerCase() : str;
        };
        var substr = this.string.substr(this.pos, pattern.length);
        if (cased(substr) == cased(pattern)) {
          if (consume !== false)
            this.pos += pattern.length;
          return true;
        }
      } else {
        var match = this.string.slice(this.pos).match(pattern);
        if (match && match.index > 0)
          return null;
        if (match && consume !== false)
          this.pos += match[0].length;
        return match;
      }
    },
    current: function () {
      return this.string.slice(this.start, this.pos);
    }
  };
  CodeMirror.StringStream = StringStream;
  // TEXTMARKERS
  function TextMarker(doc, type) {
    this.lines = [];
    this.type = type;
    this.doc = doc;
  }
  CodeMirror.TextMarker = TextMarker;
  eventMixin(TextMarker);
  TextMarker.prototype.clear = function () {
    if (this.explicitlyCleared)
      return;
    var cm = this.doc.cm, withOp = cm && !cm.curOp;
    if (withOp)
      startOperation(cm);
    if (hasHandler(this, 'clear')) {
      var found = this.find();
      if (found)
        signalLater(this, 'clear', found.from, found.to);
    }
    var min = null, max = null;
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this.lines[i];
      var span = getMarkedSpanFor(line.markedSpans, this);
      if (span.to != null)
        max = lineNo(line);
      line.markedSpans = removeMarkedSpan(line.markedSpans, span);
      if (span.from != null)
        min = lineNo(line);
      else if (this.collapsed && !lineIsHidden(this.doc, line) && cm)
        updateLineHeight(line, textHeight(cm.display));
    }
    if (cm && this.collapsed && !cm.options.lineWrapping)
      for (var i = 0; i < this.lines.length; ++i) {
        var visual = visualLine(cm.doc, this.lines[i]), len = lineLength(cm.doc, visual);
        if (len > cm.display.maxLineLength) {
          cm.display.maxLine = visual;
          cm.display.maxLineLength = len;
          cm.display.maxLineChanged = true;
        }
      }
    if (min != null && cm)
      regChange(cm, min, max + 1);
    this.lines.length = 0;
    this.explicitlyCleared = true;
    if (this.atomic && this.doc.cantEdit) {
      this.doc.cantEdit = false;
      if (cm)
        reCheckSelection(cm);
    }
    if (withOp)
      endOperation(cm);
  };
  TextMarker.prototype.find = function () {
    var from, to;
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this.lines[i];
      var span = getMarkedSpanFor(line.markedSpans, this);
      if (span.from != null || span.to != null) {
        var found = lineNo(line);
        if (span.from != null)
          from = Pos(found, span.from);
        if (span.to != null)
          to = Pos(found, span.to);
      }
    }
    if (this.type == 'bookmark')
      return from;
    return from && {
      from: from,
      to: to
    };
  };
  TextMarker.prototype.changed = function () {
    var pos = this.find(), cm = this.doc.cm;
    if (!pos || !cm)
      return;
    var line = getLine(this.doc, pos.from.line);
    clearCachedMeasurement(cm, line);
    if (pos.from.line >= cm.display.showingFrom && pos.from.line < cm.display.showingTo) {
      for (var node = cm.display.lineDiv.firstChild; node; node = node.nextSibling)
        if (node.lineObj == line) {
          if (node.offsetHeight != line.height)
            updateLineHeight(line, node.offsetHeight);
          break;
        }
      runInOp(cm, function () {
        cm.curOp.selectionChanged = cm.curOp.forceUpdate = cm.curOp.updateMaxLine = true;
      });
    }
  };
  TextMarker.prototype.attachLine = function (line) {
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp;
      if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
        (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this);
    }
    this.lines.push(line);
  };
  TextMarker.prototype.detachLine = function (line) {
    this.lines.splice(indexOf(this.lines, line), 1);
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp;
      (op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
    }
  };
  function markText(doc, from, to, options, type) {
    if (options && options.shared)
      return markTextShared(doc, from, to, options, type);
    if (doc.cm && !doc.cm.curOp)
      return operation(doc.cm, markText)(doc, from, to, options, type);
    var marker = new TextMarker(doc, type);
    if (type == 'range' && !posLess(from, to))
      return marker;
    if (options)
      copyObj(options, marker);
    if (marker.replacedWith) {
      marker.collapsed = true;
      marker.replacedWith = elt('span', [marker.replacedWith], 'CodeMirror-widget');
      if (!options.handleMouseEvents)
        marker.replacedWith.ignoreEvents = true;
    }
    if (marker.collapsed)
      sawCollapsedSpans = true;
    if (marker.addToHistory)
      addToHistory(doc, {
        from: from,
        to: to,
        origin: 'markText'
      }, {
        head: doc.sel.head,
        anchor: doc.sel.anchor
      }, NaN);
    var curLine = from.line, size = 0, collapsedAtStart, collapsedAtEnd, cm = doc.cm, updateMaxLine;
    doc.iter(curLine, to.line + 1, function (line) {
      if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(doc, line) == cm.display.maxLine)
        updateMaxLine = true;
      var span = {
          from: null,
          to: null,
          marker: marker
        };
      size += line.text.length;
      if (curLine == from.line) {
        span.from = from.ch;
        size -= from.ch;
      }
      if (curLine == to.line) {
        span.to = to.ch;
        size -= line.text.length - to.ch;
      }
      if (marker.collapsed) {
        if (curLine == to.line)
          collapsedAtEnd = collapsedSpanAt(line, to.ch);
        if (curLine == from.line)
          collapsedAtStart = collapsedSpanAt(line, from.ch);
        else
          updateLineHeight(line, 0);
      }
      addMarkedSpan(line, span);
      ++curLine;
    });
    if (marker.collapsed)
      doc.iter(from.line, to.line + 1, function (line) {
        if (lineIsHidden(doc, line))
          updateLineHeight(line, 0);
      });
    if (marker.clearOnEnter)
      on(marker, 'beforeCursorEnter', function () {
        marker.clear();
      });
    if (marker.readOnly) {
      sawReadOnlySpans = true;
      if (doc.history.done.length || doc.history.undone.length)
        doc.clearHistory();
    }
    if (marker.collapsed) {
      if (collapsedAtStart != collapsedAtEnd)
        throw new Error('Inserting collapsed marker overlapping an existing one');
      marker.size = size;
      marker.atomic = true;
    }
    if (cm) {
      if (updateMaxLine)
        cm.curOp.updateMaxLine = true;
      if (marker.className || marker.title || marker.startStyle || marker.endStyle || marker.collapsed)
        regChange(cm, from.line, to.line + 1);
      if (marker.atomic)
        reCheckSelection(cm);
    }
    return marker;
  }
  // SHARED TEXTMARKERS
  function SharedTextMarker(markers, primary) {
    this.markers = markers;
    this.primary = primary;
    for (var i = 0, me = this; i < markers.length; ++i) {
      markers[i].parent = this;
      on(markers[i], 'clear', function () {
        me.clear();
      });
    }
  }
  CodeMirror.SharedTextMarker = SharedTextMarker;
  eventMixin(SharedTextMarker);
  SharedTextMarker.prototype.clear = function () {
    if (this.explicitlyCleared)
      return;
    this.explicitlyCleared = true;
    for (var i = 0; i < this.markers.length; ++i)
      this.markers[i].clear();
    signalLater(this, 'clear');
  };
  SharedTextMarker.prototype.find = function () {
    return this.primary.find();
  };
  function markTextShared(doc, from, to, options, type) {
    options = copyObj(options);
    options.shared = false;
    var markers = [markText(doc, from, to, options, type)], primary = markers[0];
    var widget = options.replacedWith;
    linkedDocs(doc, function (doc) {
      if (widget)
        options.replacedWith = widget.cloneNode(true);
      markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type));
      for (var i = 0; i < doc.linked.length; ++i)
        if (doc.linked[i].isParent)
          return;
      primary = lst(markers);
    });
    return new SharedTextMarker(markers, primary);
  }
  // TEXTMARKER SPANS
  function getMarkedSpanFor(spans, marker) {
    if (spans)
      for (var i = 0; i < spans.length; ++i) {
        var span = spans[i];
        if (span.marker == marker)
          return span;
      }
  }
  function removeMarkedSpan(spans, span) {
    for (var r, i = 0; i < spans.length; ++i)
      if (spans[i] != span)
        (r || (r = [])).push(spans[i]);
    return r;
  }
  function addMarkedSpan(line, span) {
    line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span];
    span.marker.attachLine(line);
  }
  function markedSpansBefore(old, startCh, isInsert) {
    if (old)
      for (var i = 0, nw; i < old.length; ++i) {
        var span = old[i], marker = span.marker;
        var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
        if (startsBefore || marker.type == 'bookmark' && span.from == startCh && (!isInsert || !span.marker.insertLeft)) {
          var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh);
          (nw || (nw = [])).push({
            from: span.from,
            to: endsAfter ? null : span.to,
            marker: marker
          });
        }
      }
    return nw;
  }
  function markedSpansAfter(old, endCh, isInsert) {
    if (old)
      for (var i = 0, nw; i < old.length; ++i) {
        var span = old[i], marker = span.marker;
        var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
        if (endsAfter || marker.type == 'bookmark' && span.from == endCh && (!isInsert || span.marker.insertLeft)) {
          var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh);
          (nw || (nw = [])).push({
            from: startsBefore ? null : span.from - endCh,
            to: span.to == null ? null : span.to - endCh,
            marker: marker
          });
        }
      }
    return nw;
  }
  function stretchSpansOverChange(doc, change) {
    var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
    var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
    if (!oldFirst && !oldLast)
      return null;
    var startCh = change.from.ch, endCh = change.to.ch, isInsert = posEq(change.from, change.to);
    // Get the spans that 'stick out' on both sides
    var first = markedSpansBefore(oldFirst, startCh, isInsert);
    var last = markedSpansAfter(oldLast, endCh, isInsert);
    // Next, merge those two ends
    var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0);
    if (first) {
      // Fix up .to properties of first
      for (var i = 0; i < first.length; ++i) {
        var span = first[i];
        if (span.to == null) {
          var found = getMarkedSpanFor(last, span.marker);
          if (!found)
            span.to = startCh;
          else if (sameLine)
            span.to = found.to == null ? null : found.to + offset;
        }
      }
    }
    if (last) {
      // Fix up .from in last (or move them into first in case of sameLine)
      for (var i = 0; i < last.length; ++i) {
        var span = last[i];
        if (span.to != null)
          span.to += offset;
        if (span.from == null) {
          var found = getMarkedSpanFor(first, span.marker);
          if (!found) {
            span.from = offset;
            if (sameLine)
              (first || (first = [])).push(span);
          }
        } else {
          span.from += offset;
          if (sameLine)
            (first || (first = [])).push(span);
        }
      }
    }
    if (sameLine && first) {
      // Make sure we didn't create any zero-length spans
      for (var i = 0; i < first.length; ++i)
        if (first[i].from != null && first[i].from == first[i].to && first[i].marker.type != 'bookmark')
          first.splice(i--, 1);
      if (!first.length)
        first = null;
    }
    var newMarkers = [first];
    if (!sameLine) {
      // Fill gap with whole-line-spans
      var gap = change.text.length - 2, gapMarkers;
      if (gap > 0 && first)
        for (var i = 0; i < first.length; ++i)
          if (first[i].to == null)
            (gapMarkers || (gapMarkers = [])).push({
              from: null,
              to: null,
              marker: first[i].marker
            });
      for (var i = 0; i < gap; ++i)
        newMarkers.push(gapMarkers);
      newMarkers.push(last);
    }
    return newMarkers;
  }
  function mergeOldSpans(doc, change) {
    var old = getOldSpans(doc, change);
    var stretched = stretchSpansOverChange(doc, change);
    if (!old)
      return stretched;
    if (!stretched)
      return old;
    for (var i = 0; i < old.length; ++i) {
      var oldCur = old[i], stretchCur = stretched[i];
      if (oldCur && stretchCur) {
        spans:
          for (var j = 0; j < stretchCur.length; ++j) {
            var span = stretchCur[j];
            for (var k = 0; k < oldCur.length; ++k)
              if (oldCur[k].marker == span.marker)
                continue spans;
            oldCur.push(span);
          }
      } else if (stretchCur) {
        old[i] = stretchCur;
      }
    }
    return old;
  }
  function removeReadOnlyRanges(doc, from, to) {
    var markers = null;
    doc.iter(from.line, to.line + 1, function (line) {
      if (line.markedSpans)
        for (var i = 0; i < line.markedSpans.length; ++i) {
          var mark = line.markedSpans[i].marker;
          if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
            (markers || (markers = [])).push(mark);
        }
    });
    if (!markers)
      return null;
    var parts = [{
          from: from,
          to: to
        }];
    for (var i = 0; i < markers.length; ++i) {
      var mk = markers[i], m = mk.find();
      for (var j = 0; j < parts.length; ++j) {
        var p = parts[j];
        if (posLess(p.to, m.from) || posLess(m.to, p.from))
          continue;
        var newParts = [
            j,
            1
          ];
        if (posLess(p.from, m.from) || !mk.inclusiveLeft && posEq(p.from, m.from))
          newParts.push({
            from: p.from,
            to: m.from
          });
        if (posLess(m.to, p.to) || !mk.inclusiveRight && posEq(p.to, m.to))
          newParts.push({
            from: m.to,
            to: p.to
          });
        parts.splice.apply(parts, newParts);
        j += newParts.length - 1;
      }
    }
    return parts;
  }
  function collapsedSpanAt(line, ch) {
    var sps = sawCollapsedSpans && line.markedSpans, found;
    if (sps)
      for (var sp, i = 0; i < sps.length; ++i) {
        sp = sps[i];
        if (!sp.marker.collapsed)
          continue;
        if ((sp.from == null || sp.from < ch) && (sp.to == null || sp.to > ch) && (!found || found.width < sp.marker.width))
          found = sp.marker;
      }
    return found;
  }
  function collapsedSpanAtStart(line) {
    return collapsedSpanAt(line, -1);
  }
  function collapsedSpanAtEnd(line) {
    return collapsedSpanAt(line, line.text.length + 1);
  }
  function visualLine(doc, line) {
    var merged;
    while (merged = collapsedSpanAtStart(line))
      line = getLine(doc, merged.find().from.line);
    return line;
  }
  function lineIsHidden(doc, line) {
    var sps = sawCollapsedSpans && line.markedSpans;
    if (sps)
      for (var sp, i = 0; i < sps.length; ++i) {
        sp = sps[i];
        if (!sp.marker.collapsed)
          continue;
        if (sp.from == null)
          return true;
        if (sp.marker.replacedWith)
          continue;
        if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
          return true;
      }
  }
  function lineIsHiddenInner(doc, line, span) {
    if (span.to == null) {
      var end = span.marker.find().to, endLine = getLine(doc, end.line);
      return lineIsHiddenInner(doc, endLine, getMarkedSpanFor(endLine.markedSpans, span.marker));
    }
    if (span.marker.inclusiveRight && span.to == line.text.length)
      return true;
    for (var sp, i = 0; i < line.markedSpans.length; ++i) {
      sp = line.markedSpans[i];
      if (sp.marker.collapsed && !sp.marker.replacedWith && sp.from == span.to && (sp.marker.inclusiveLeft || span.marker.inclusiveRight) && lineIsHiddenInner(doc, line, sp))
        return true;
    }
  }
  function detachMarkedSpans(line) {
    var spans = line.markedSpans;
    if (!spans)
      return;
    for (var i = 0; i < spans.length; ++i)
      spans[i].marker.detachLine(line);
    line.markedSpans = null;
  }
  function attachMarkedSpans(line, spans) {
    if (!spans)
      return;
    for (var i = 0; i < spans.length; ++i)
      spans[i].marker.attachLine(line);
    line.markedSpans = spans;
  }
  // LINE WIDGETS
  var LineWidget = CodeMirror.LineWidget = function (cm, node, options) {
      if (options)
        for (var opt in options)
          if (options.hasOwnProperty(opt))
            this[opt] = options[opt];
      this.cm = cm;
      this.node = node;
    };
  eventMixin(LineWidget);
  function widgetOperation(f) {
    return function () {
      var withOp = !this.cm.curOp;
      if (withOp)
        startOperation(this.cm);
      try {
        var result = f.apply(this, arguments);
      } finally {
        if (withOp)
          endOperation(this.cm);
      }
      return result;
    };
  }
  LineWidget.prototype.clear = widgetOperation(function () {
    var ws = this.line.widgets, no = lineNo(this.line);
    if (no == null || !ws)
      return;
    for (var i = 0; i < ws.length; ++i)
      if (ws[i] == this)
        ws.splice(i--, 1);
    if (!ws.length)
      this.line.widgets = null;
    var aboveVisible = heightAtLine(this.cm, this.line) < this.cm.doc.scrollTop;
    updateLineHeight(this.line, Math.max(0, this.line.height - widgetHeight(this)));
    if (aboveVisible)
      addToScrollPos(this.cm, 0, -this.height);
    regChange(this.cm, no, no + 1);
  });
  LineWidget.prototype.changed = widgetOperation(function () {
    var oldH = this.height;
    this.height = null;
    var diff = widgetHeight(this) - oldH;
    if (!diff)
      return;
    updateLineHeight(this.line, this.line.height + diff);
    var no = lineNo(this.line);
    regChange(this.cm, no, no + 1);
  });
  function widgetHeight(widget) {
    if (widget.height != null)
      return widget.height;
    if (!widget.node.parentNode || widget.node.parentNode.nodeType != 1)
      removeChildrenAndAdd(widget.cm.display.measure, elt('div', [widget.node], null, 'position: relative'));
    return widget.height = widget.node.offsetHeight;
  }
  function addLineWidget(cm, handle, node, options) {
    var widget = new LineWidget(cm, node, options);
    if (widget.noHScroll)
      cm.display.alignWidgets = true;
    changeLine(cm, handle, function (line) {
      var widgets = line.widgets || (line.widgets = []);
      if (widget.insertAt == null)
        widgets.push(widget);
      else
        widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget);
      widget.line = line;
      if (!lineIsHidden(cm.doc, line) || widget.showIfHidden) {
        var aboveVisible = heightAtLine(cm, line) < cm.doc.scrollTop;
        updateLineHeight(line, line.height + widgetHeight(widget));
        if (aboveVisible)
          addToScrollPos(cm, 0, widget.height);
      }
      return true;
    });
    return widget;
  }
  // LINE DATA STRUCTURE
  // Line objects. These hold state related to a line, including
  // highlighting info (the styles array).
  var Line = CodeMirror.Line = function (text, markedSpans, estimateHeight) {
      this.text = text;
      attachMarkedSpans(this, markedSpans);
      this.height = estimateHeight ? estimateHeight(this) : 1;
    };
  eventMixin(Line);
  function updateLine(line, text, markedSpans, estimateHeight) {
    line.text = text;
    if (line.stateAfter)
      line.stateAfter = null;
    if (line.styles)
      line.styles = null;
    if (line.order != null)
      line.order = null;
    detachMarkedSpans(line);
    attachMarkedSpans(line, markedSpans);
    var estHeight = estimateHeight ? estimateHeight(line) : 1;
    if (estHeight != line.height)
      updateLineHeight(line, estHeight);
  }
  function cleanUpLine(line) {
    line.parent = null;
    detachMarkedSpans(line);
  }
  // Run the given mode's parser over a line, update the styles
  // array, which contains alternating fragments of text and CSS
  // classes.
  function runMode(cm, text, mode, state, f) {
    var flattenSpans = mode.flattenSpans;
    if (flattenSpans == null)
      flattenSpans = cm.options.flattenSpans;
    var curStart = 0, curStyle = null;
    var stream = new StringStream(text, cm.options.tabSize), style;
    if (text == '' && mode.blankLine)
      mode.blankLine(state);
    while (!stream.eol()) {
      if (stream.pos > cm.options.maxHighlightLength) {
        flattenSpans = false;
        // Webkit seems to refuse to render text nodes longer than 57444 characters
        stream.pos = Math.min(text.length, stream.start + 50000);
        style = null;
      } else {
        style = mode.token(stream, state);
      }
      if (!flattenSpans || curStyle != style) {
        if (curStart < stream.start)
          f(stream.start, curStyle);
        curStart = stream.start;
        curStyle = style;
      }
      stream.start = stream.pos;
    }
    if (curStart < stream.pos)
      f(stream.pos, curStyle);
  }
  function highlightLine(cm, line, state) {
    // A styles array always starts with a number identifying the
    // mode/overlays that it is based on (for easy invalidation).
    var st = [cm.state.modeGen];
    // Compute the base array of styles
    runMode(cm, line.text, cm.doc.mode, state, function (end, style) {
      st.push(end, style);
    });
    // Run overlays, adjust style array.
    for (var o = 0; o < cm.state.overlays.length; ++o) {
      var overlay = cm.state.overlays[o], i = 1, at = 0;
      runMode(cm, line.text, overlay.mode, true, function (end, style) {
        var start = i;
        // Ensure there's a token end at the current position, and that i points at it
        while (at < end) {
          var i_end = st[i];
          if (i_end > end)
            st.splice(i, 1, end, st[i + 1], i_end);
          i += 2;
          at = Math.min(end, i_end);
        }
        if (!style)
          return;
        if (overlay.opaque) {
          st.splice(start, i - start, end, style);
          i = start + 2;
        } else {
          for (; start < i; start += 2) {
            var cur = st[start + 1];
            st[start + 1] = cur ? cur + ' ' + style : style;
          }
        }
      });
    }
    return st;
  }
  function getLineStyles(cm, line) {
    if (!line.styles || line.styles[0] != cm.state.modeGen)
      line.styles = highlightLine(cm, line, line.stateAfter = getStateBefore(cm, lineNo(line)));
    return line.styles;
  }
  // Lightweight form of highlight -- proceed over this line and
  // update state, but don't save a style array.
  function processLine(cm, line, state) {
    var mode = cm.doc.mode;
    var stream = new StringStream(line.text, cm.options.tabSize);
    if (line.text == '' && mode.blankLine)
      mode.blankLine(state);
    while (!stream.eol() && stream.pos <= cm.options.maxHighlightLength) {
      mode.token(stream, state);
      stream.start = stream.pos;
    }
  }
  var styleToClassCache = {};
  function styleToClass(style) {
    if (!style)
      return null;
    return styleToClassCache[style] || (styleToClassCache[style] = 'cm-' + style.replace(/ +/g, ' cm-'));
  }
  function lineContent(cm, realLine, measure, copyWidgets) {
    var merged, line = realLine, empty = true;
    while (merged = collapsedSpanAtStart(line))
      line = getLine(cm.doc, merged.find().from.line);
    var builder = {
        pre: elt('pre'),
        col: 0,
        pos: 0,
        measure: null,
        measuredSomething: false,
        cm: cm,
        copyWidgets: copyWidgets
      };
    if (line.textClass)
      builder.pre.className = line.textClass;
    do {
      if (line.text)
        empty = false;
      builder.measure = line == realLine && measure;
      builder.pos = 0;
      builder.addToken = builder.measure ? buildTokenMeasure : buildToken;
      if ((ie || webkit) && cm.getOption('lineWrapping'))
        builder.addToken = buildTokenSplitSpaces(builder.addToken);
      var next = insertLineContent(line, builder, getLineStyles(cm, line));
      if (measure && line == realLine && !builder.measuredSomething) {
        measure[0] = builder.pre.appendChild(zeroWidthElement(cm.display.measure));
        builder.measuredSomething = true;
      }
      if (next)
        line = getLine(cm.doc, next.to.line);
    } while (next);
    if (measure && !builder.measuredSomething && !measure[0])
      measure[0] = builder.pre.appendChild(empty ? elt('span', '\xa0') : zeroWidthElement(cm.display.measure));
    if (!builder.pre.firstChild && !lineIsHidden(cm.doc, realLine))
      builder.pre.appendChild(document.createTextNode('\xa0'));
    var order;
    // Work around problem with the reported dimensions of single-char
    // direction spans on IE (issue #1129). See also the comment in
    // cursorCoords.
    if (measure && ie && (order = getOrder(line))) {
      var l = order.length - 1;
      if (order[l].from == order[l].to)
        --l;
      var last = order[l], prev = order[l - 1];
      if (last.from + 1 == last.to && prev && last.level < prev.level) {
        var span = measure[builder.pos - 1];
        if (span)
          span.parentNode.insertBefore(span.measureRight = zeroWidthElement(cm.display.measure), span.nextSibling);
      }
    }
    signal(cm, 'renderLine', cm, realLine, builder.pre);
    return builder.pre;
  }
  var tokenSpecialChars = /[\t\u0000-\u0019\u00ad\u200b\u2028\u2029\uFEFF]/g;
  function buildToken(builder, text, style, startStyle, endStyle, title) {
    if (!text)
      return;
    if (!tokenSpecialChars.test(text)) {
      builder.col += text.length;
      var content = document.createTextNode(text);
    } else {
      var content = document.createDocumentFragment(), pos = 0;
      while (true) {
        tokenSpecialChars.lastIndex = pos;
        var m = tokenSpecialChars.exec(text);
        var skipped = m ? m.index - pos : text.length - pos;
        if (skipped) {
          content.appendChild(document.createTextNode(text.slice(pos, pos + skipped)));
          builder.col += skipped;
        }
        if (!m)
          break;
        pos += skipped + 1;
        if (m[0] == '\t') {
          var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize;
          content.appendChild(elt('span', spaceStr(tabWidth), 'cm-tab'));
          builder.col += tabWidth;
        } else {
          var token = elt('span', '\u2022', 'cm-invalidchar');
          token.title = '\\u' + m[0].charCodeAt(0).toString(16);
          content.appendChild(token);
          builder.col += 1;
        }
      }
    }
    if (style || startStyle || endStyle || builder.measure) {
      var fullStyle = style || '';
      if (startStyle)
        fullStyle += startStyle;
      if (endStyle)
        fullStyle += endStyle;
      var token = elt('span', [content], fullStyle);
      if (title)
        token.title = title;
      return builder.pre.appendChild(token);
    }
    builder.pre.appendChild(content);
  }
  function buildTokenMeasure(builder, text, style, startStyle, endStyle) {
    var wrapping = builder.cm.options.lineWrapping;
    for (var i = 0; i < text.length; ++i) {
      var ch = text.charAt(i), start = i == 0;
      if (ch >= '\ud800' && ch < '\udbff' && i < text.length - 1) {
        ch = text.slice(i, i + 2);
        ++i;
      } else if (i && wrapping && spanAffectsWrapping(text, i)) {
        builder.pre.appendChild(elt('wbr'));
      }
      var old = builder.measure[builder.pos];
      var span = builder.measure[builder.pos] = buildToken(builder, ch, style, start && startStyle, i == text.length - 1 && endStyle);
      if (old)
        span.leftSide = old.leftSide || old;
      // In IE single-space nodes wrap differently than spaces
      // embedded in larger text nodes, except when set to
      // white-space: normal (issue #1268).
      if (ie && wrapping && ch == ' ' && i && !/\s/.test(text.charAt(i - 1)) && i < text.length - 1 && !/\s/.test(text.charAt(i + 1)))
        span.style.whiteSpace = 'normal';
      builder.pos += ch.length;
    }
    if (text.length)
      builder.measuredSomething = true;
  }
  function buildTokenSplitSpaces(inner) {
    function split(old) {
      var out = ' ';
      for (var i = 0; i < old.length - 2; ++i)
        out += i % 2 ? ' ' : '\xa0';
      out += ' ';
      return out;
    }
    return function (builder, text, style, startStyle, endStyle, title) {
      return inner(builder, text.replace(/ {3,}/, split), style, startStyle, endStyle, title);
    };
  }
  function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
    var widget = !ignoreWidget && marker.replacedWith;
    if (widget) {
      if (builder.copyWidgets)
        widget = widget.cloneNode(true);
      builder.pre.appendChild(widget);
      if (builder.measure) {
        if (size) {
          builder.measure[builder.pos] = widget;
        } else {
          var elt = builder.measure[builder.pos] = zeroWidthElement(builder.cm.display.measure);
          if (marker.type != 'bookmark' || marker.insertLeft)
            builder.pre.insertBefore(elt, widget);
          else
            builder.pre.appendChild(elt);
        }
        builder.measuredSomething = true;
      }
    }
    builder.pos += size;
  }
  // Outputs a number of spans to make up a line, taking highlighting
  // and marked text into account.
  function insertLineContent(line, builder, styles) {
    var spans = line.markedSpans, allText = line.text, at = 0;
    if (!spans) {
      for (var i = 1; i < styles.length; i += 2)
        builder.addToken(builder, allText.slice(at, at = styles[i]), styleToClass(styles[i + 1]));
      return;
    }
    var len = allText.length, pos = 0, i = 1, text = '', style;
    var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, title, collapsed;
    for (;;) {
      if (nextChange == pos) {
        // Update current marker set
        spanStyle = spanEndStyle = spanStartStyle = title = '';
        collapsed = null;
        nextChange = Infinity;
        var foundBookmark = null;
        for (var j = 0; j < spans.length; ++j) {
          var sp = spans[j], m = sp.marker;
          if (sp.from <= pos && (sp.to == null || sp.to > pos)) {
            if (sp.to != null && nextChange > sp.to) {
              nextChange = sp.to;
              spanEndStyle = '';
            }
            if (m.className)
              spanStyle += ' ' + m.className;
            if (m.startStyle && sp.from == pos)
              spanStartStyle += ' ' + m.startStyle;
            if (m.endStyle && sp.to == nextChange)
              spanEndStyle += ' ' + m.endStyle;
            if (m.title && !title)
              title = m.title;
            if (m.collapsed && (!collapsed || collapsed.marker.size < m.size))
              collapsed = sp;
          } else if (sp.from > pos && nextChange > sp.from) {
            nextChange = sp.from;
          }
          if (m.type == 'bookmark' && sp.from == pos && m.replacedWith)
            foundBookmark = m;
        }
        if (collapsed && (collapsed.from || 0) == pos) {
          buildCollapsedSpan(builder, (collapsed.to == null ? len : collapsed.to) - pos, collapsed.marker, collapsed.from == null);
          if (collapsed.to == null)
            return collapsed.marker.find();
        }
        if (foundBookmark && !collapsed)
          buildCollapsedSpan(builder, 0, foundBookmark);
      }
      if (pos >= len)
        break;
      var upto = Math.min(len, nextChange);
      while (true) {
        if (text) {
          var end = pos + text.length;
          if (!collapsed) {
            var tokenText = end > upto ? text.slice(0, upto - pos) : text;
            builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle, spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : '', title);
          }
          if (end >= upto) {
            text = text.slice(upto - pos);
            pos = upto;
            break;
          }
          pos = end;
          spanStartStyle = '';
        }
        text = allText.slice(at, at = styles[i++]);
        style = styleToClass(styles[i++]);
      }
    }
  }
  // DOCUMENT DATA STRUCTURE
  function updateDoc(doc, change, markedSpans, selAfter, estimateHeight) {
    function spansFor(n) {
      return markedSpans ? markedSpans[n] : null;
    }
    function update(line, text, spans) {
      updateLine(line, text, spans, estimateHeight);
      signalLater(line, 'change', line, change);
    }
    var from = change.from, to = change.to, text = change.text;
    var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
    var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;
    // First adjust the line structure
    if (from.ch == 0 && to.ch == 0 && lastText == '') {
      // This is a whole-line replace. Treated specially to make
      // sure line objects move the way they are supposed to.
      for (var i = 0, e = text.length - 1, added = []; i < e; ++i)
        added.push(new Line(text[i], spansFor(i), estimateHeight));
      update(lastLine, lastLine.text, lastSpans);
      if (nlines)
        doc.remove(from.line, nlines);
      if (added.length)
        doc.insert(from.line, added);
    } else if (firstLine == lastLine) {
      if (text.length == 1) {
        update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
      } else {
        for (var added = [], i = 1, e = text.length - 1; i < e; ++i)
          added.push(new Line(text[i], spansFor(i), estimateHeight));
        added.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight));
        update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
        doc.insert(from.line + 1, added);
      }
    } else if (text.length == 1) {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
      doc.remove(from.line + 1, nlines);
    } else {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
      update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
      for (var i = 1, e = text.length - 1, added = []; i < e; ++i)
        added.push(new Line(text[i], spansFor(i), estimateHeight));
      if (nlines > 1)
        doc.remove(from.line + 1, nlines - 1);
      doc.insert(from.line + 1, added);
    }
    signalLater(doc, 'change', doc, change);
    setSelection(doc, selAfter.anchor, selAfter.head, null, true);
  }
  function LeafChunk(lines) {
    this.lines = lines;
    this.parent = null;
    for (var i = 0, e = lines.length, height = 0; i < e; ++i) {
      lines[i].parent = this;
      height += lines[i].height;
    }
    this.height = height;
  }
  LeafChunk.prototype = {
    chunkSize: function () {
      return this.lines.length;
    },
    removeInner: function (at, n) {
      for (var i = at, e = at + n; i < e; ++i) {
        var line = this.lines[i];
        this.height -= line.height;
        cleanUpLine(line);
        signalLater(line, 'delete');
      }
      this.lines.splice(at, n);
    },
    collapse: function (lines) {
      lines.splice.apply(lines, [
        lines.length,
        0
      ].concat(this.lines));
    },
    insertInner: function (at, lines, height) {
      this.height += height;
      this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
      for (var i = 0, e = lines.length; i < e; ++i)
        lines[i].parent = this;
    },
    iterN: function (at, n, op) {
      for (var e = at + n; at < e; ++at)
        if (op(this.lines[at]))
          return true;
    }
  };
  function BranchChunk(children) {
    this.children = children;
    var size = 0, height = 0;
    for (var i = 0, e = children.length; i < e; ++i) {
      var ch = children[i];
      size += ch.chunkSize();
      height += ch.height;
      ch.parent = this;
    }
    this.size = size;
    this.height = height;
    this.parent = null;
  }
  BranchChunk.prototype = {
    chunkSize: function () {
      return this.size;
    },
    removeInner: function (at, n) {
      this.size -= n;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var rm = Math.min(n, sz - at), oldHeight = child.height;
          child.removeInner(at, rm);
          this.height -= oldHeight - child.height;
          if (sz == rm) {
            this.children.splice(i--, 1);
            child.parent = null;
          }
          if ((n -= rm) == 0)
            break;
          at = 0;
        } else
          at -= sz;
      }
      if (this.size - n < 25) {
        var lines = [];
        this.collapse(lines);
        this.children = [new LeafChunk(lines)];
        this.children[0].parent = this;
      }
    },
    collapse: function (lines) {
      for (var i = 0, e = this.children.length; i < e; ++i)
        this.children[i].collapse(lines);
    },
    insertInner: function (at, lines, height) {
      this.size += lines.length;
      this.height += height;
      for (var i = 0, e = this.children.length; i < e; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at <= sz) {
          child.insertInner(at, lines, height);
          if (child.lines && child.lines.length > 50) {
            while (child.lines.length > 50) {
              var spilled = child.lines.splice(child.lines.length - 25, 25);
              var newleaf = new LeafChunk(spilled);
              child.height -= newleaf.height;
              this.children.splice(i + 1, 0, newleaf);
              newleaf.parent = this;
            }
            this.maybeSpill();
          }
          break;
        }
        at -= sz;
      }
    },
    maybeSpill: function () {
      if (this.children.length <= 10)
        return;
      var me = this;
      do {
        var spilled = me.children.splice(me.children.length - 5, 5);
        var sibling = new BranchChunk(spilled);
        if (!me.parent) {
          // Become the parent node
          var copy = new BranchChunk(me.children);
          copy.parent = me;
          me.children = [
            copy,
            sibling
          ];
          me = copy;
        } else {
          me.size -= sibling.size;
          me.height -= sibling.height;
          var myIndex = indexOf(me.parent.children, me);
          me.parent.children.splice(myIndex + 1, 0, sibling);
        }
        sibling.parent = me.parent;
      } while (me.children.length > 10);
      me.parent.maybeSpill();
    },
    iterN: function (at, n, op) {
      for (var i = 0, e = this.children.length; i < e; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var used = Math.min(n, sz - at);
          if (child.iterN(at, used, op))
            return true;
          if ((n -= used) == 0)
            break;
          at = 0;
        } else
          at -= sz;
      }
    }
  };
  var nextDocId = 0;
  var Doc = CodeMirror.Doc = function (text, mode, firstLine) {
      if (!(this instanceof Doc))
        return new Doc(text, mode, firstLine);
      if (firstLine == null)
        firstLine = 0;
      BranchChunk.call(this, [new LeafChunk([new Line('', null)])]);
      this.first = firstLine;
      this.scrollTop = this.scrollLeft = 0;
      this.cantEdit = false;
      this.history = makeHistory();
      this.cleanGeneration = 1;
      this.frontier = firstLine;
      var start = Pos(firstLine, 0);
      this.sel = {
        from: start,
        to: start,
        head: start,
        anchor: start,
        shift: false,
        extend: false,
        goalColumn: null
      };
      this.id = ++nextDocId;
      this.modeOption = mode;
      if (typeof text == 'string')
        text = splitLines(text);
      updateDoc(this, {
        from: start,
        to: start,
        text: text
      }, null, {
        head: start,
        anchor: start
      });
    };
  Doc.prototype = createObj(BranchChunk.prototype, {
    constructor: Doc,
    iter: function (from, to, op) {
      if (op)
        this.iterN(from - this.first, to - from, op);
      else
        this.iterN(this.first, this.first + this.size, from);
    },
    insert: function (at, lines) {
      var height = 0;
      for (var i = 0, e = lines.length; i < e; ++i)
        height += lines[i].height;
      this.insertInner(at - this.first, lines, height);
    },
    remove: function (at, n) {
      this.removeInner(at - this.first, n);
    },
    getValue: function (lineSep) {
      var lines = getLines(this, this.first, this.first + this.size);
      if (lineSep === false)
        return lines;
      return lines.join(lineSep || '\n');
    },
    setValue: function (code) {
      var top = Pos(this.first, 0), last = this.first + this.size - 1;
      makeChange(this, {
        from: top,
        to: Pos(last, getLine(this, last).text.length),
        text: splitLines(code),
        origin: 'setValue'
      }, {
        head: top,
        anchor: top
      }, true);
    },
    replaceRange: function (code, from, to, origin) {
      from = clipPos(this, from);
      to = to ? clipPos(this, to) : from;
      replaceRange(this, code, from, to, origin);
    },
    getRange: function (from, to, lineSep) {
      var lines = getBetween(this, clipPos(this, from), clipPos(this, to));
      if (lineSep === false)
        return lines;
      return lines.join(lineSep || '\n');
    },
    getLine: function (line) {
      var l = this.getLineHandle(line);
      return l && l.text;
    },
    setLine: function (line, text) {
      if (isLine(this, line))
        replaceRange(this, text, Pos(line, 0), clipPos(this, Pos(line)));
    },
    removeLine: function (line) {
      if (line)
        replaceRange(this, '', clipPos(this, Pos(line - 1)), clipPos(this, Pos(line)));
      else
        replaceRange(this, '', Pos(0, 0), clipPos(this, Pos(1, 0)));
    },
    getLineHandle: function (line) {
      if (isLine(this, line))
        return getLine(this, line);
    },
    getLineNumber: function (line) {
      return lineNo(line);
    },
    getLineHandleVisualStart: function (line) {
      if (typeof line == 'number')
        line = getLine(this, line);
      return visualLine(this, line);
    },
    lineCount: function () {
      return this.size;
    },
    firstLine: function () {
      return this.first;
    },
    lastLine: function () {
      return this.first + this.size - 1;
    },
    clipPos: function (pos) {
      return clipPos(this, pos);
    },
    getCursor: function (start) {
      var sel = this.sel, pos;
      if (start == null || start == 'head')
        pos = sel.head;
      else if (start == 'anchor')
        pos = sel.anchor;
      else if (start == 'end' || start === false)
        pos = sel.to;
      else
        pos = sel.from;
      return copyPos(pos);
    },
    somethingSelected: function () {
      return !posEq(this.sel.head, this.sel.anchor);
    },
    setCursor: docOperation(function (line, ch, extend) {
      var pos = clipPos(this, typeof line == 'number' ? Pos(line, ch || 0) : line);
      if (extend)
        extendSelection(this, pos);
      else
        setSelection(this, pos, pos);
    }),
    setSelection: docOperation(function (anchor, head) {
      setSelection(this, clipPos(this, anchor), clipPos(this, head || anchor));
    }),
    extendSelection: docOperation(function (from, to) {
      extendSelection(this, clipPos(this, from), to && clipPos(this, to));
    }),
    getSelection: function (lineSep) {
      return this.getRange(this.sel.from, this.sel.to, lineSep);
    },
    replaceSelection: function (code, collapse, origin) {
      makeChange(this, {
        from: this.sel.from,
        to: this.sel.to,
        text: splitLines(code),
        origin: origin
      }, collapse || 'around');
    },
    undo: docOperation(function () {
      makeChangeFromHistory(this, 'undo');
    }),
    redo: docOperation(function () {
      makeChangeFromHistory(this, 'redo');
    }),
    setExtending: function (val) {
      this.sel.extend = val;
    },
    historySize: function () {
      var hist = this.history;
      return {
        undo: hist.done.length,
        redo: hist.undone.length
      };
    },
    clearHistory: function () {
      this.history = makeHistory(this.history.maxGeneration);
    },
    markClean: function () {
      this.cleanGeneration = this.changeGeneration();
    },
    changeGeneration: function () {
      this.history.lastOp = this.history.lastOrigin = null;
      return this.history.generation;
    },
    isClean: function (gen) {
      return this.history.generation == (gen || this.cleanGeneration);
    },
    getHistory: function () {
      return {
        done: copyHistoryArray(this.history.done),
        undone: copyHistoryArray(this.history.undone)
      };
    },
    setHistory: function (histData) {
      var hist = this.history = makeHistory(this.history.maxGeneration);
      hist.done = histData.done.slice(0);
      hist.undone = histData.undone.slice(0);
    },
    markText: function (from, to, options) {
      return markText(this, clipPos(this, from), clipPos(this, to), options, 'range');
    },
    setBookmark: function (pos, options) {
      var realOpts = {
          replacedWith: options && (options.nodeType == null ? options.widget : options),
          insertLeft: options && options.insertLeft
        };
      pos = clipPos(this, pos);
      return markText(this, pos, pos, realOpts, 'bookmark');
    },
    findMarksAt: function (pos) {
      pos = clipPos(this, pos);
      var markers = [], spans = getLine(this, pos.line).markedSpans;
      if (spans)
        for (var i = 0; i < spans.length; ++i) {
          var span = spans[i];
          if ((span.from == null || span.from <= pos.ch) && (span.to == null || span.to >= pos.ch))
            markers.push(span.marker.parent || span.marker);
        }
      return markers;
    },
    getAllMarks: function () {
      var markers = [];
      this.iter(function (line) {
        var sps = line.markedSpans;
        if (sps)
          for (var i = 0; i < sps.length; ++i)
            if (sps[i].from != null)
              markers.push(sps[i].marker);
      });
      return markers;
    },
    posFromIndex: function (off) {
      var ch, lineNo = this.first;
      this.iter(function (line) {
        var sz = line.text.length + 1;
        if (sz > off) {
          ch = off;
          return true;
        }
        off -= sz;
        ++lineNo;
      });
      return clipPos(this, Pos(lineNo, ch));
    },
    indexFromPos: function (coords) {
      coords = clipPos(this, coords);
      var index = coords.ch;
      if (coords.line < this.first || coords.ch < 0)
        return 0;
      this.iter(this.first, coords.line, function (line) {
        index += line.text.length + 1;
      });
      return index;
    },
    copy: function (copyHistory) {
      var doc = new Doc(getLines(this, this.first, this.first + this.size), this.modeOption, this.first);
      doc.scrollTop = this.scrollTop;
      doc.scrollLeft = this.scrollLeft;
      doc.sel = {
        from: this.sel.from,
        to: this.sel.to,
        head: this.sel.head,
        anchor: this.sel.anchor,
        shift: this.sel.shift,
        extend: false,
        goalColumn: this.sel.goalColumn
      };
      if (copyHistory) {
        doc.history.undoDepth = this.history.undoDepth;
        doc.setHistory(this.getHistory());
      }
      return doc;
    },
    linkedDoc: function (options) {
      if (!options)
        options = {};
      var from = this.first, to = this.first + this.size;
      if (options.from != null && options.from > from)
        from = options.from;
      if (options.to != null && options.to < to)
        to = options.to;
      var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from);
      if (options.sharedHist)
        copy.history = this.history;
      (this.linked || (this.linked = [])).push({
        doc: copy,
        sharedHist: options.sharedHist
      });
      copy.linked = [{
          doc: this,
          isParent: true,
          sharedHist: options.sharedHist
        }];
      return copy;
    },
    unlinkDoc: function (other) {
      if (other instanceof CodeMirror)
        other = other.doc;
      if (this.linked)
        for (var i = 0; i < this.linked.length; ++i) {
          var link = this.linked[i];
          if (link.doc != other)
            continue;
          this.linked.splice(i, 1);
          other.unlinkDoc(this);
          break;
        }
      // If the histories were shared, split them again
      if (other.history == this.history) {
        var splitIds = [other.id];
        linkedDocs(other, function (doc) {
          splitIds.push(doc.id);
        }, true);
        other.history = makeHistory();
        other.history.done = copyHistoryArray(this.history.done, splitIds);
        other.history.undone = copyHistoryArray(this.history.undone, splitIds);
      }
    },
    iterLinkedDocs: function (f) {
      linkedDocs(this, f);
    },
    getMode: function () {
      return this.mode;
    },
    getEditor: function () {
      return this.cm;
    }
  });
  Doc.prototype.eachLine = Doc.prototype.iter;
  // The Doc methods that should be available on CodeMirror instances
  var dontDelegate = 'iter insert remove copy getEditor'.split(' ');
  for (var prop in Doc.prototype)
    if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
      CodeMirror.prototype[prop] = function (method) {
        return function () {
          return method.apply(this.doc, arguments);
        };
      }(Doc.prototype[prop]);
  eventMixin(Doc);
  function linkedDocs(doc, f, sharedHistOnly) {
    function propagate(doc, skip, sharedHist) {
      if (doc.linked)
        for (var i = 0; i < doc.linked.length; ++i) {
          var rel = doc.linked[i];
          if (rel.doc == skip)
            continue;
          var shared = sharedHist && rel.sharedHist;
          if (sharedHistOnly && !shared)
            continue;
          f(rel.doc, shared);
          propagate(rel.doc, doc, shared);
        }
    }
    propagate(doc, null, true);
  }
  function attachDoc(cm, doc) {
    if (doc.cm)
      throw new Error('This document is already in use.');
    cm.doc = doc;
    doc.cm = cm;
    estimateLineHeights(cm);
    loadMode(cm);
    if (!cm.options.lineWrapping)
      computeMaxLength(cm);
    cm.options.mode = doc.modeOption;
    regChange(cm);
  }
  // LINE UTILITIES
  function getLine(chunk, n) {
    n -= chunk.first;
    while (!chunk.lines) {
      for (var i = 0;; ++i) {
        var child = chunk.children[i], sz = child.chunkSize();
        if (n < sz) {
          chunk = child;
          break;
        }
        n -= sz;
      }
    }
    return chunk.lines[n];
  }
  function getBetween(doc, start, end) {
    var out = [], n = start.line;
    doc.iter(start.line, end.line + 1, function (line) {
      var text = line.text;
      if (n == end.line)
        text = text.slice(0, end.ch);
      if (n == start.line)
        text = text.slice(start.ch);
      out.push(text);
      ++n;
    });
    return out;
  }
  function getLines(doc, from, to) {
    var out = [];
    doc.iter(from, to, function (line) {
      out.push(line.text);
    });
    return out;
  }
  function updateLineHeight(line, height) {
    var diff = height - line.height;
    for (var n = line; n; n = n.parent)
      n.height += diff;
  }
  function lineNo(line) {
    if (line.parent == null)
      return null;
    var cur = line.parent, no = indexOf(cur.lines, line);
    for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
      for (var i = 0;; ++i) {
        if (chunk.children[i] == cur)
          break;
        no += chunk.children[i].chunkSize();
      }
    }
    return no + cur.first;
  }
  function lineAtHeight(chunk, h) {
    var n = chunk.first;
    outer:
      do {
        for (var i = 0, e = chunk.children.length; i < e; ++i) {
          var child = chunk.children[i], ch = child.height;
          if (h < ch) {
            chunk = child;
            continue outer;
          }
          h -= ch;
          n += child.chunkSize();
        }
        return n;
      } while (!chunk.lines);
    for (var i = 0, e = chunk.lines.length; i < e; ++i) {
      var line = chunk.lines[i], lh = line.height;
      if (h < lh)
        break;
      h -= lh;
    }
    return n + i;
  }
  function heightAtLine(cm, lineObj) {
    lineObj = visualLine(cm.doc, lineObj);
    var h = 0, chunk = lineObj.parent;
    for (var i = 0; i < chunk.lines.length; ++i) {
      var line = chunk.lines[i];
      if (line == lineObj)
        break;
      else
        h += line.height;
    }
    for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
      for (var i = 0; i < p.children.length; ++i) {
        var cur = p.children[i];
        if (cur == chunk)
          break;
        else
          h += cur.height;
      }
    }
    return h;
  }
  function getOrder(line) {
    var order = line.order;
    if (order == null)
      order = line.order = bidiOrdering(line.text);
    return order;
  }
  // HISTORY
  function makeHistory(startGen) {
    return {
      done: [],
      undone: [],
      undoDepth: Infinity,
      lastTime: 0,
      lastOp: null,
      lastOrigin: null,
      generation: startGen || 1,
      maxGeneration: startGen || 1
    };
  }
  function attachLocalSpans(doc, change, from, to) {
    var existing = change['spans_' + doc.id], n = 0;
    doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function (line) {
      if (line.markedSpans)
        (existing || (existing = change['spans_' + doc.id] = {}))[n] = line.markedSpans;
      ++n;
    });
  }
  function historyChangeFromChange(doc, change) {
    var from = {
        line: change.from.line,
        ch: change.from.ch
      };
    var histChange = {
        from: from,
        to: changeEnd(change),
        text: getBetween(doc, change.from, change.to)
      };
    attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
    linkedDocs(doc, function (doc) {
      attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
    }, true);
    return histChange;
  }
  function addToHistory(doc, change, selAfter, opId) {
    var hist = doc.history;
    hist.undone.length = 0;
    var time = +new Date(), cur = lst(hist.done);
    if (cur && (hist.lastOp == opId || hist.lastOrigin == change.origin && change.origin && (change.origin.charAt(0) == '+' && doc.cm && hist.lastTime > time - doc.cm.options.historyEventDelay || change.origin.charAt(0) == '*'))) {
      // Merge this change into the last event
      var last = lst(cur.changes);
      if (posEq(change.from, change.to) && posEq(change.from, last.to)) {
        // Optimized case for simple insertion -- don't want to add
        // new changesets for every character typed
        last.to = changeEnd(change);
      } else {
        // Add new sub-event
        cur.changes.push(historyChangeFromChange(doc, change));
      }
      cur.anchorAfter = selAfter.anchor;
      cur.headAfter = selAfter.head;
    } else {
      // Can not be merged, start a new event.
      cur = {
        changes: [historyChangeFromChange(doc, change)],
        generation: hist.generation,
        anchorBefore: doc.sel.anchor,
        headBefore: doc.sel.head,
        anchorAfter: selAfter.anchor,
        headAfter: selAfter.head
      };
      hist.done.push(cur);
      hist.generation = ++hist.maxGeneration;
      while (hist.done.length > hist.undoDepth)
        hist.done.shift();
    }
    hist.lastTime = time;
    hist.lastOp = opId;
    hist.lastOrigin = change.origin;
  }
  function removeClearedSpans(spans) {
    if (!spans)
      return null;
    for (var i = 0, out; i < spans.length; ++i) {
      if (spans[i].marker.explicitlyCleared) {
        if (!out)
          out = spans.slice(0, i);
      } else if (out)
        out.push(spans[i]);
    }
    return !out ? spans : out.length ? out : null;
  }
  function getOldSpans(doc, change) {
    var found = change['spans_' + doc.id];
    if (!found)
      return null;
    for (var i = 0, nw = []; i < change.text.length; ++i)
      nw.push(removeClearedSpans(found[i]));
    return nw;
  }
  // Used both to provide a JSON-safe object in .getHistory, and, when
  // detaching a document, to split the history in two
  function copyHistoryArray(events, newGroup) {
    for (var i = 0, copy = []; i < events.length; ++i) {
      var event = events[i], changes = event.changes, newChanges = [];
      copy.push({
        changes: newChanges,
        anchorBefore: event.anchorBefore,
        headBefore: event.headBefore,
        anchorAfter: event.anchorAfter,
        headAfter: event.headAfter
      });
      for (var j = 0; j < changes.length; ++j) {
        var change = changes[j], m;
        newChanges.push({
          from: change.from,
          to: change.to,
          text: change.text
        });
        if (newGroup)
          for (var prop in change)
            if (m = prop.match(/^spans_(\d+)$/)) {
              if (indexOf(newGroup, Number(m[1])) > -1) {
                lst(newChanges)[prop] = change[prop];
                delete change[prop];
              }
            }
      }
    }
    return copy;
  }
  // Rebasing/resetting history to deal with externally-sourced changes
  function rebaseHistSel(pos, from, to, diff) {
    if (to < pos.line) {
      pos.line += diff;
    } else if (from < pos.line) {
      pos.line = from;
      pos.ch = 0;
    }
  }
  // Tries to rebase an array of history events given a change in the
  // document. If the change touches the same lines as the event, the
  // event, and everything 'behind' it, is discarded. If the change is
  // before the event, the event's positions are updated. Uses a
  // copy-on-write scheme for the positions, to avoid having to
  // reallocate them all on every rebase, but also avoid problems with
  // shared position objects being unsafely updated.
  function rebaseHistArray(array, from, to, diff) {
    for (var i = 0; i < array.length; ++i) {
      var sub = array[i], ok = true;
      for (var j = 0; j < sub.changes.length; ++j) {
        var cur = sub.changes[j];
        if (!sub.copied) {
          cur.from = copyPos(cur.from);
          cur.to = copyPos(cur.to);
        }
        if (to < cur.from.line) {
          cur.from.line += diff;
          cur.to.line += diff;
        } else if (from <= cur.to.line) {
          ok = false;
          break;
        }
      }
      if (!sub.copied) {
        sub.anchorBefore = copyPos(sub.anchorBefore);
        sub.headBefore = copyPos(sub.headBefore);
        sub.anchorAfter = copyPos(sub.anchorAfter);
        sub.readAfter = copyPos(sub.headAfter);
        sub.copied = true;
      }
      if (!ok) {
        array.splice(0, i + 1);
        i = 0;
      } else {
        rebaseHistSel(sub.anchorBefore);
        rebaseHistSel(sub.headBefore);
        rebaseHistSel(sub.anchorAfter);
        rebaseHistSel(sub.headAfter);
      }
    }
  }
  function rebaseHist(hist, change) {
    var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1;
    rebaseHistArray(hist.done, from, to, diff);
    rebaseHistArray(hist.undone, from, to, diff);
  }
  // EVENT OPERATORS
  function stopMethod() {
    e_stop(this);
  }
  // Ensure an event has a stop method.
  function addStop(event) {
    if (!event.stop)
      event.stop = stopMethod;
    return event;
  }
  function e_preventDefault(e) {
    if (e.preventDefault)
      e.preventDefault();
    else
      e.returnValue = false;
  }
  function e_stopPropagation(e) {
    if (e.stopPropagation)
      e.stopPropagation();
    else
      e.cancelBubble = true;
  }
  function e_defaultPrevented(e) {
    return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false;
  }
  function e_stop(e) {
    e_preventDefault(e);
    e_stopPropagation(e);
  }
  CodeMirror.e_stop = e_stop;
  CodeMirror.e_preventDefault = e_preventDefault;
  CodeMirror.e_stopPropagation = e_stopPropagation;
  function e_target(e) {
    return e.target || e.srcElement;
  }
  function e_button(e) {
    var b = e.which;
    if (b == null) {
      if (e.button & 1)
        b = 1;
      else if (e.button & 2)
        b = 3;
      else if (e.button & 4)
        b = 2;
    }
    if (mac && e.ctrlKey && b == 1)
      b = 3;
    return b;
  }
  // EVENT HANDLING
  function on(emitter, type, f) {
    if (emitter.addEventListener)
      emitter.addEventListener(type, f, false);
    else if (emitter.attachEvent)
      emitter.attachEvent('on' + type, f);
    else {
      var map = emitter._handlers || (emitter._handlers = {});
      var arr = map[type] || (map[type] = []);
      arr.push(f);
    }
  }
  function off(emitter, type, f) {
    if (emitter.removeEventListener)
      emitter.removeEventListener(type, f, false);
    else if (emitter.detachEvent)
      emitter.detachEvent('on' + type, f);
    else {
      var arr = emitter._handlers && emitter._handlers[type];
      if (!arr)
        return;
      for (var i = 0; i < arr.length; ++i)
        if (arr[i] == f) {
          arr.splice(i, 1);
          break;
        }
    }
  }
  function signal(emitter, type) {
    var arr = emitter._handlers && emitter._handlers[type];
    if (!arr)
      return;
    var args = Array.prototype.slice.call(arguments, 2);
    for (var i = 0; i < arr.length; ++i)
      arr[i].apply(null, args);
  }
  var delayedCallbacks, delayedCallbackDepth = 0;
  function signalLater(emitter, type) {
    var arr = emitter._handlers && emitter._handlers[type];
    if (!arr)
      return;
    var args = Array.prototype.slice.call(arguments, 2);
    if (!delayedCallbacks) {
      ++delayedCallbackDepth;
      delayedCallbacks = [];
      setTimeout(fireDelayed, 0);
    }
    function bnd(f) {
      return function () {
        f.apply(null, args);
      };
    }
    ;
    for (var i = 0; i < arr.length; ++i)
      delayedCallbacks.push(bnd(arr[i]));
  }
  function signalDOMEvent(cm, e, override) {
    signal(cm, override || e.type, cm, e);
    return e_defaultPrevented(e) || e.codemirrorIgnore;
  }
  function fireDelayed() {
    --delayedCallbackDepth;
    var delayed = delayedCallbacks;
    delayedCallbacks = null;
    for (var i = 0; i < delayed.length; ++i)
      delayed[i]();
  }
  function hasHandler(emitter, type) {
    var arr = emitter._handlers && emitter._handlers[type];
    return arr && arr.length > 0;
  }
  CodeMirror.on = on;
  CodeMirror.off = off;
  CodeMirror.signal = signal;
  function eventMixin(ctor) {
    ctor.prototype.on = function (type, f) {
      on(this, type, f);
    };
    ctor.prototype.off = function (type, f) {
      off(this, type, f);
    };
  }
  // MISC UTILITIES
  // Number of pixels added to scroller and sizer to hide scrollbar
  var scrollerCutOff = 30;
  // Returned or thrown by various protocols to signal 'I'm not
  // handling this'.
  var Pass = CodeMirror.Pass = {
      toString: function () {
        return 'CodeMirror.Pass';
      }
    };
  function Delayed() {
    this.id = null;
  }
  Delayed.prototype = {
    set: function (ms, f) {
      clearTimeout(this.id);
      this.id = setTimeout(f, ms);
    }
  };
  // Counts the column offset in a string, taking tabs into account.
  // Used mostly to find indentation.
  function countColumn(string, end, tabSize, startIndex, startValue) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/);
      if (end == -1)
        end = string.length;
    }
    for (var i = startIndex || 0, n = startValue || 0; i < end; ++i) {
      if (string.charAt(i) == '\t')
        n += tabSize - n % tabSize;
      else
        ++n;
    }
    return n;
  }
  CodeMirror.countColumn = countColumn;
  var spaceStrs = [''];
  function spaceStr(n) {
    while (spaceStrs.length <= n)
      spaceStrs.push(lst(spaceStrs) + ' ');
    return spaceStrs[n];
  }
  function lst(arr) {
    return arr[arr.length - 1];
  }
  function selectInput(node) {
    if (ios) {
      // Mobile Safari apparently has a bug where select() is broken.
      node.selectionStart = 0;
      node.selectionEnd = node.value.length;
    } else {
      // Suppress mysterious IE10 errors
      try {
        node.select();
      } catch (_e) {
      }
    }
  }
  function indexOf(collection, elt) {
    if (collection.indexOf)
      return collection.indexOf(elt);
    for (var i = 0, e = collection.length; i < e; ++i)
      if (collection[i] == elt)
        return i;
    return -1;
  }
  function createObj(base, props) {
    function Obj() {
    }
    Obj.prototype = base;
    var inst = new Obj();
    if (props)
      copyObj(props, inst);
    return inst;
  }
  function copyObj(obj, target) {
    if (!target)
      target = {};
    for (var prop in obj)
      if (obj.hasOwnProperty(prop))
        target[prop] = obj[prop];
    return target;
  }
  function emptyArray(size) {
    for (var a = [], i = 0; i < size; ++i)
      a.push(undefined);
    return a;
  }
  function bind(f) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function () {
      return f.apply(null, args);
    };
  }
  var nonASCIISingleCaseWordChar = /[\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
  function isWordChar(ch) {
    return /\w/.test(ch) || ch > '\x80' && (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch));
  }
  function isEmpty(obj) {
    for (var n in obj)
      if (obj.hasOwnProperty(n) && obj[n])
        return false;
    return true;
  }
  var isExtendingChar = /[\u0300-\u036F\u0483-\u0487\u0488-\u0489\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\uA66F\uA670-\uA672\uA674-\uA67D\uA69F\udc00-\udfff]/;
  // DOM UTILITIES
  function elt(tag, content, className, style) {
    var e = document.createElement(tag);
    if (className)
      e.className = className;
    if (style)
      e.style.cssText = style;
    if (typeof content == 'string')
      setTextContent(e, content);
    else if (content)
      for (var i = 0; i < content.length; ++i)
        e.appendChild(content[i]);
    return e;
  }
  function removeChildren(e) {
    for (var count = e.childNodes.length; count > 0; --count)
      e.removeChild(e.firstChild);
    return e;
  }
  function removeChildrenAndAdd(parent, e) {
    return removeChildren(parent).appendChild(e);
  }
  function setTextContent(e, str) {
    if (ie_lt9) {
      e.innerHTML = '';
      e.appendChild(document.createTextNode(str));
    } else
      e.textContent = str;
  }
  function getRect(node) {
    return node.getBoundingClientRect();
  }
  CodeMirror.replaceGetRect = function (f) {
    getRect = f;
  };
  // FEATURE DETECTION
  // Detect drag-and-drop
  var dragAndDrop = function () {
      // There is *some* kind of drag-and-drop support in IE6-8, but I
      // couldn't get it to work yet.
      if (ie_lt9)
        return false;
      var div = elt('div');
      return 'draggable' in div || 'dragDrop' in div;
    }();
  // For a reason I have yet to figure out, some browsers disallow
  // word wrapping between certain characters *only* if a new inline
  // element is started between them. This makes it hard to reliably
  // measure the position of things, since that requires inserting an
  // extra span. This terribly fragile set of tests matches the
  // character combinations that suffer from this phenomenon on the
  // various browsers.
  function spanAffectsWrapping() {
    return false;
  }
  if (gecko)
    // Only for "$'"
    spanAffectsWrapping = function (str, i) {
      return str.charCodeAt(i - 1) == 36 && str.charCodeAt(i) == 39;
    };
  else if (safari && !/Version\/([6-9]|\d\d)\b/.test(navigator.userAgent))
    spanAffectsWrapping = function (str, i) {
      return /\-[^ \-?]|\?[^ !\'\"\),.\-\/:;\?\]\}]/.test(str.slice(i - 1, i + 1));
    };
  else if (webkit && !/Chrome\/(?:29|[3-9]\d|\d\d\d)\./.test(navigator.userAgent))
    spanAffectsWrapping = function (str, i) {
      if (i > 1 && str.charCodeAt(i - 1) == 45) {
        if (/\w/.test(str.charAt(i - 2)) && /[^\-?\.]/.test(str.charAt(i)))
          return true;
        if (i > 2 && /[\d\.,]/.test(str.charAt(i - 2)) && /[\d\.,]/.test(str.charAt(i)))
          return false;
      }
      return /[~!#%&*)=+}\]|\"\.>,:;][({[<]|-[^\-?\.\u2010-\u201f\u2026]|\?[\w~`@#$%\^&*(_=+{[|><]|…[\w~`@#$%\^&*(_=+{[><]/.test(str.slice(i - 1, i + 1));
    };
  var knownScrollbarWidth;
  function scrollbarWidth(measure) {
    if (knownScrollbarWidth != null)
      return knownScrollbarWidth;
    var test = elt('div', null, null, 'width: 50px; height: 50px; overflow-x: scroll');
    removeChildrenAndAdd(measure, test);
    if (test.offsetWidth)
      knownScrollbarWidth = test.offsetHeight - test.clientHeight;
    return knownScrollbarWidth || 0;
  }
  var zwspSupported;
  function zeroWidthElement(measure) {
    if (zwspSupported == null) {
      var test = elt('span', '\u200b');
      removeChildrenAndAdd(measure, elt('span', [
        test,
        document.createTextNode('x')
      ]));
      if (measure.firstChild.offsetHeight != 0)
        zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !ie_lt8;
    }
    if (zwspSupported)
      return elt('span', '\u200b');
    else
      return elt('span', '\xa0', null, 'display: inline-block; width: 1px; margin-right: -1px');
  }
  // See if "".split is the broken IE version, if so, provide an
  // alternative way to split lines.
  var splitLines = '\n\nb'.split(/\n/).length != 3 ? function (string) {
      var pos = 0, result = [], l = string.length;
      while (pos <= l) {
        var nl = string.indexOf('\n', pos);
        if (nl == -1)
          nl = string.length;
        var line = string.slice(pos, string.charAt(nl - 1) == '\r' ? nl - 1 : nl);
        var rt = line.indexOf('\r');
        if (rt != -1) {
          result.push(line.slice(0, rt));
          pos += rt + 1;
        } else {
          result.push(line);
          pos = nl + 1;
        }
      }
      return result;
    } : function (string) {
      return string.split(/\r\n?|\n/);
    };
  CodeMirror.splitLines = splitLines;
  var hasSelection = window.getSelection ? function (te) {
      try {
        return te.selectionStart != te.selectionEnd;
      } catch (e) {
        return false;
      }
    } : function (te) {
      try {
        var range = te.ownerDocument.selection.createRange();
      } catch (e) {
      }
      if (!range || range.parentElement() != te)
        return false;
      return range.compareEndPoints('StartToEnd', range) != 0;
    };
  var hasCopyEvent = function () {
      var e = elt('div');
      if ('oncopy' in e)
        return true;
      e.setAttribute('oncopy', 'return;');
      return typeof e.oncopy == 'function';
    }();
  // KEY NAMING
  var keyNames = {
      3: 'Enter',
      8: 'Backspace',
      9: 'Tab',
      13: 'Enter',
      16: 'Shift',
      17: 'Ctrl',
      18: 'Alt',
      19: 'Pause',
      20: 'CapsLock',
      27: 'Esc',
      32: 'Space',
      33: 'PageUp',
      34: 'PageDown',
      35: 'End',
      36: 'Home',
      37: 'Left',
      38: 'Up',
      39: 'Right',
      40: 'Down',
      44: 'PrintScrn',
      45: 'Insert',
      46: 'Delete',
      59: ';',
      91: 'Mod',
      92: 'Mod',
      93: 'Mod',
      109: '-',
      107: '=',
      127: 'Delete',
      186: ';',
      187: '=',
      188: ',',
      189: '-',
      190: '.',
      191: '/',
      192: '`',
      219: '[',
      220: '\\',
      221: ']',
      222: '\'',
      63276: 'PageUp',
      63277: 'PageDown',
      63275: 'End',
      63273: 'Home',
      63234: 'Left',
      63232: 'Up',
      63235: 'Right',
      63233: 'Down',
      63302: 'Insert',
      63272: 'Delete'
    };
  CodeMirror.keyNames = keyNames;
  (function () {
    // Number keys
    for (var i = 0; i < 10; i++)
      keyNames[i + 48] = String(i);
    // Alphabetic keys
    for (var i = 65; i <= 90; i++)
      keyNames[i] = String.fromCharCode(i);
    // Function keys
    for (var i = 1; i <= 12; i++)
      keyNames[i + 111] = keyNames[i + 63235] = 'F' + i;
  }());
  // BIDI HELPERS
  function iterateBidiSections(order, from, to, f) {
    if (!order)
      return f(from, to, 'ltr');
    var found = false;
    for (var i = 0; i < order.length; ++i) {
      var part = order[i];
      if (part.from < to && part.to > from || from == to && part.to == from) {
        f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? 'rtl' : 'ltr');
        found = true;
      }
    }
    if (!found)
      f(from, to, 'ltr');
  }
  function bidiLeft(part) {
    return part.level % 2 ? part.to : part.from;
  }
  function bidiRight(part) {
    return part.level % 2 ? part.from : part.to;
  }
  function lineLeft(line) {
    var order = getOrder(line);
    return order ? bidiLeft(order[0]) : 0;
  }
  function lineRight(line) {
    var order = getOrder(line);
    if (!order)
      return line.text.length;
    return bidiRight(lst(order));
  }
  function lineStart(cm, lineN) {
    var line = getLine(cm.doc, lineN);
    var visual = visualLine(cm.doc, line);
    if (visual != line)
      lineN = lineNo(visual);
    var order = getOrder(visual);
    var ch = !order ? 0 : order[0].level % 2 ? lineRight(visual) : lineLeft(visual);
    return Pos(lineN, ch);
  }
  function lineEnd(cm, lineN) {
    var merged, line;
    while (merged = collapsedSpanAtEnd(line = getLine(cm.doc, lineN)))
      lineN = merged.find().to.line;
    var order = getOrder(line);
    var ch = !order ? line.text.length : order[0].level % 2 ? lineLeft(line) : lineRight(line);
    return Pos(lineN, ch);
  }
  function compareBidiLevel(order, a, b) {
    var linedir = order[0].level;
    if (a == linedir)
      return true;
    if (b == linedir)
      return false;
    return a < b;
  }
  var bidiOther;
  function getBidiPartAt(order, pos) {
    for (var i = 0, found; i < order.length; ++i) {
      var cur = order[i];
      if (cur.from < pos && cur.to > pos) {
        bidiOther = null;
        return i;
      }
      if (cur.from == pos || cur.to == pos) {
        if (found == null) {
          found = i;
        } else if (compareBidiLevel(order, cur.level, order[found].level)) {
          bidiOther = found;
          return i;
        } else {
          bidiOther = i;
          return found;
        }
      }
    }
    bidiOther = null;
    return found;
  }
  function moveInLine(line, pos, dir, byUnit) {
    if (!byUnit)
      return pos + dir;
    do
      pos += dir;
    while (pos > 0 && isExtendingChar.test(line.text.charAt(pos)));
    return pos;
  }
  // This is somewhat involved. It is needed in order to move
  // 'visually' through bi-directional text -- i.e., pressing left
  // should make the cursor go left, even when in RTL text. The
  // tricky part is the 'jumps', where RTL and LTR text touch each
  // other. This often requires the cursor offset to move more than
  // one unit, in order to visually move one unit.
  function moveVisually(line, start, dir, byUnit) {
    var bidi = getOrder(line);
    if (!bidi)
      return moveLogically(line, start, dir, byUnit);
    var pos = getBidiPartAt(bidi, start), part = bidi[pos];
    var target = moveInLine(line, start, part.level % 2 ? -dir : dir, byUnit);
    for (;;) {
      if (target > part.from && target < part.to)
        return target;
      if (target == part.from || target == part.to) {
        if (getBidiPartAt(bidi, target) == pos)
          return target;
        part = bidi[pos += dir];
        return dir > 0 == part.level % 2 ? part.to : part.from;
      } else {
        part = bidi[pos += dir];
        if (!part)
          return null;
        if (dir > 0 == part.level % 2)
          target = moveInLine(line, part.to, -1, byUnit);
        else
          target = moveInLine(line, part.from, 1, byUnit);
      }
    }
  }
  function moveLogically(line, start, dir, byUnit) {
    var target = start + dir;
    if (byUnit)
      while (target > 0 && isExtendingChar.test(line.text.charAt(target)))
        target += dir;
    return target < 0 || target > line.text.length ? null : target;
  }
  // Bidirectional ordering algorithm
  // See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
  // that this (partially) implements.
  // One-char codes used for character types:
  // L (L):   Left-to-Right
  // R (R):   Right-to-Left
  // r (AL):  Right-to-Left Arabic
  // 1 (EN):  European Number
  // + (ES):  European Number Separator
  // % (ET):  European Number Terminator
  // n (AN):  Arabic Number
  // , (CS):  Common Number Separator
  // m (NSM): Non-Spacing Mark
  // b (BN):  Boundary Neutral
  // s (B):   Paragraph Separator
  // t (S):   Segment Separator
  // w (WS):  Whitespace
  // N (ON):  Other Neutrals
  // Returns null if characters are ordered as they appear
  // (left-to-right), or an array of sections ({from, to, level}
  // objects) in the order in which they occur visually.
  var bidiOrdering = function () {
      // Character types for codepoints 0 to 0xff
      var lowTypes = 'bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLL';
      // Character types for codepoints 0x600 to 0x6ff
      var arabicTypes = 'rrrrrrrrrrrr,rNNmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmrrrrrrrnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmNmmmmrrrrrrrrrrrrrrrrrr';
      function charType(code) {
        if (code <= 255)
          return lowTypes.charAt(code);
        else if (1424 <= code && code <= 1524)
          return 'R';
        else if (1536 <= code && code <= 1791)
          return arabicTypes.charAt(code - 1536);
        else if (1792 <= code && code <= 2220)
          return 'r';
        else
          return 'L';
      }
      var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
      var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/;
      // Browsers seem to always treat the boundaries of block elements as being L.
      var outerType = 'L';
      return function (str) {
        if (!bidiRE.test(str))
          return false;
        var len = str.length, types = [];
        for (var i = 0, type; i < len; ++i)
          types.push(type = charType(str.charCodeAt(i)));
        // W1. Examine each non-spacing mark (NSM) in the level run, and
        // change the type of the NSM to the type of the previous
        // character. If the NSM is at the start of the level run, it will
        // get the type of sor.
        for (var i = 0, prev = outerType; i < len; ++i) {
          var type = types[i];
          if (type == 'm')
            types[i] = prev;
          else
            prev = type;
        }
        // W2. Search backwards from each instance of a European number
        // until the first strong type (R, L, AL, or sor) is found. If an
        // AL is found, change the type of the European number to Arabic
        // number.
        // W3. Change all ALs to R.
        for (var i = 0, cur = outerType; i < len; ++i) {
          var type = types[i];
          if (type == '1' && cur == 'r')
            types[i] = 'n';
          else if (isStrong.test(type)) {
            cur = type;
            if (type == 'r')
              types[i] = 'R';
          }
        }
        // W4. A single European separator between two European numbers
        // changes to a European number. A single common separator between
        // two numbers of the same type changes to that type.
        for (var i = 1, prev = types[0]; i < len - 1; ++i) {
          var type = types[i];
          if (type == '+' && prev == '1' && types[i + 1] == '1')
            types[i] = '1';
          else if (type == ',' && prev == types[i + 1] && (prev == '1' || prev == 'n'))
            types[i] = prev;
          prev = type;
        }
        // W5. A sequence of European terminators adjacent to European
        // numbers changes to all European numbers.
        // W6. Otherwise, separators and terminators change to Other
        // Neutral.
        for (var i = 0; i < len; ++i) {
          var type = types[i];
          if (type == ',')
            types[i] = 'N';
          else if (type == '%') {
            for (var end = i + 1; end < len && types[end] == '%'; ++end) {
            }
            var replace = i && types[i - 1] == '!' || end < len - 1 && types[end] == '1' ? '1' : 'N';
            for (var j = i; j < end; ++j)
              types[j] = replace;
            i = end - 1;
          }
        }
        // W7. Search backwards from each instance of a European number
        // until the first strong type (R, L, or sor) is found. If an L is
        // found, then change the type of the European number to L.
        for (var i = 0, cur = outerType; i < len; ++i) {
          var type = types[i];
          if (cur == 'L' && type == '1')
            types[i] = 'L';
          else if (isStrong.test(type))
            cur = type;
        }
        // N1. A sequence of neutrals takes the direction of the
        // surrounding strong text if the text on both sides has the same
        // direction. European and Arabic numbers act as if they were R in
        // terms of their influence on neutrals. Start-of-level-run (sor)
        // and end-of-level-run (eor) are used at level run boundaries.
        // N2. Any remaining neutrals take the embedding direction.
        for (var i = 0; i < len; ++i) {
          if (isNeutral.test(types[i])) {
            for (var end = i + 1; end < len && isNeutral.test(types[end]); ++end) {
            }
            var before = (i ? types[i - 1] : outerType) == 'L';
            var after = (end < len - 1 ? types[end] : outerType) == 'L';
            var replace = before || after ? 'L' : 'R';
            for (var j = i; j < end; ++j)
              types[j] = replace;
            i = end - 1;
          }
        }
        // Here we depart from the documented algorithm, in order to avoid
        // building up an actual levels array. Since there are only three
        // levels (0, 1, 2) in an implementation that doesn't take
        // explicit embedding into account, we can build up the order on
        // the fly, without following the level-based algorithm.
        var order = [], m;
        for (var i = 0; i < len;) {
          if (countsAsLeft.test(types[i])) {
            var start = i;
            for (++i; i < len && countsAsLeft.test(types[i]); ++i) {
            }
            order.push({
              from: start,
              to: i,
              level: 0
            });
          } else {
            var pos = i, at = order.length;
            for (++i; i < len && types[i] != 'L'; ++i) {
            }
            for (var j = pos; j < i;) {
              if (countsAsNum.test(types[j])) {
                if (pos < j)
                  order.splice(at, 0, {
                    from: pos,
                    to: j,
                    level: 1
                  });
                var nstart = j;
                for (++j; j < i && countsAsNum.test(types[j]); ++j) {
                }
                order.splice(at, 0, {
                  from: nstart,
                  to: j,
                  level: 2
                });
                pos = j;
              } else
                ++j;
            }
            if (pos < i)
              order.splice(at, 0, {
                from: pos,
                to: i,
                level: 1
              });
          }
        }
        if (order[0].level == 1 && (m = str.match(/^\s+/))) {
          order[0].from = m[0].length;
          order.unshift({
            from: 0,
            to: m[0].length,
            level: 0
          });
        }
        if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
          lst(order).to -= m[0].length;
          order.push({
            from: len - m[0].length,
            to: len,
            level: 0
          });
        }
        if (order[0].level != lst(order).level)
          order.push({
            from: len,
            to: len,
            level: order[0].level
          });
        return order;
      };
    }();
  // THE END
  CodeMirror.version = '3.15.0';
  return CodeMirror;
}();
(function () {
  'use strict';
  function doFold(cm, pos, options) {
    var finder = options && (options.call ? options : options.rangeFinder);
    if (!finder)
      finder = cm.getHelper(pos, 'fold');
    if (!finder)
      return;
    if (typeof pos == 'number')
      pos = CodeMirror.Pos(pos, 0);
    var minSize = options && options.minFoldSize || 0;
    function getRange(allowFolded) {
      var range = finder(cm, pos);
      if (!range || range.to.line - range.from.line < minSize)
        return null;
      var marks = cm.findMarksAt(range.from);
      for (var i = 0; i < marks.length; ++i) {
        if (marks[i].__isFold) {
          if (!allowFolded)
            return null;
          range.cleared = true;
          marks[i].clear();
        }
      }
      return range;
    }
    var range = getRange(true);
    if (options && options.scanUp)
      while (!range && pos.line > cm.firstLine()) {
        pos = CodeMirror.Pos(pos.line - 1, 0);
        range = getRange(false);
      }
    if (!range || range.cleared)
      return;
    var myWidget = makeWidget(options);
    CodeMirror.on(myWidget, 'mousedown', function () {
      myRange.clear();
    });
    var myRange = cm.markText(range.from, range.to, {
        replacedWith: myWidget,
        clearOnEnter: true,
        __isFold: true
      });
    myRange.on('clear', function (from, to) {
      CodeMirror.signal(cm, 'unfold', cm, from, to);
    });
    CodeMirror.signal(cm, 'fold', cm, range.from, range.to);
  }
  function makeWidget(options) {
    var widget = options && options.widget || '\u2194';
    if (typeof widget == 'string') {
      var text = document.createTextNode(widget);
      widget = document.createElement('span');
      widget.appendChild(text);
      widget.className = 'CodeMirror-foldmarker';
    }
    return widget;
  }
  // Clumsy backwards-compatible interface
  CodeMirror.newFoldFunction = function (rangeFinder, widget) {
    return function (cm, pos) {
      doFold(cm, pos, {
        rangeFinder: rangeFinder,
        widget: widget
      });
    };
  };
  // New-style interface
  CodeMirror.defineExtension('foldCode', function (pos, options) {
    doFold(this, pos, options);
  });
  CodeMirror.registerHelper('fold', 'combine', function () {
    var funcs = Array.prototype.slice.call(arguments, 0);
    return function (cm, start) {
      for (var i = 0; i < funcs.length; ++i) {
        var found = funcs[i](cm, start);
        if (found)
          return found;
      }
    };
  });
}());
(function () {
  'use strict';
  CodeMirror.defineOption('foldGutter', false, function (cm, val, old) {
    if (old && old != CodeMirror.Init) {
      cm.clearGutter(cm.state.foldGutter.options.gutter);
      cm.state.foldGutter = null;
      cm.off('gutterClick', onGutterClick);
      cm.off('change', onChange);
      cm.off('viewportChange', onViewportChange);
      cm.off('fold', onFold);
      cm.off('unfold', onFold);
      cm.off('swapDoc', updateInViewport);
    }
    if (val) {
      cm.state.foldGutter = new State(parseOptions(val));
      updateInViewport(cm);
      cm.on('gutterClick', onGutterClick);
      cm.on('change', onChange);
      cm.on('viewportChange', onViewportChange);
      cm.on('fold', onFold);
      cm.on('unfold', onFold);
      cm.on('swapDoc', updateInViewport);
    }
  });
  var Pos = CodeMirror.Pos;
  function State(options) {
    this.options = options;
    this.from = this.to = 0;
  }
  function parseOptions(opts) {
    if (opts === true)
      opts = {};
    if (opts.gutter == null)
      opts.gutter = 'CodeMirror-foldgutter';
    if (opts.indicatorOpen == null)
      opts.indicatorOpen = 'CodeMirror-foldgutter-open';
    if (opts.indicatorFolded == null)
      opts.indicatorFolded = 'CodeMirror-foldgutter-folded';
    return opts;
  }
  function isFolded(cm, line) {
    var marks = cm.findMarksAt(Pos(line));
    for (var i = 0; i < marks.length; ++i)
      if (marks[i].__isFold && marks[i].find().from.line == line)
        return true;
  }
  function marker(spec) {
    if (typeof spec == 'string') {
      var elt = document.createElement('div');
      elt.className = spec;
      return elt;
    } else {
      return spec.cloneNode(true);
    }
  }
  function updateFoldInfo(cm, from, to) {
    var opts = cm.state.foldGutter.options, cur = from;
    cm.eachLine(from, to, function (line) {
      var mark = null;
      if (isFolded(cm, cur)) {
        mark = marker(opts.indicatorFolded);
      } else {
        var pos = Pos(cur, 0), func = opts.rangeFinder || cm.getHelper(pos, 'fold');
        var range = func && func(cm, pos);
        if (range && range.from.line + 1 < range.to.line)
          mark = marker(opts.indicatorOpen);
      }
      cm.setGutterMarker(line, opts.gutter, mark);
      ++cur;
    });
  }
  function updateInViewport(cm) {
    var vp = cm.getViewport(), state = cm.state.foldGutter;
    if (!state)
      return;
    cm.operation(function () {
      updateFoldInfo(cm, vp.from, vp.to);
    });
    state.from = vp.from;
    state.to = vp.to;
  }
  function onGutterClick(cm, line, gutter) {
    var opts = cm.state.foldGutter.options;
    if (gutter != opts.gutter)
      return;
    cm.foldCode(Pos(line, 0), opts.rangeFinder);
  }
  function onChange(cm) {
    var state = cm.state.foldGutter, opts = cm.state.foldGutter.options;
    state.from = state.to = 0;
    clearTimeout(state.changeUpdate);
    state.changeUpdate = setTimeout(function () {
      updateInViewport(cm);
    }, opts.foldOnChangeTimeSpan || 600);
  }
  function onViewportChange(cm) {
    var state = cm.state.foldGutter, opts = cm.state.foldGutter.options;
    clearTimeout(state.changeUpdate);
    state.changeUpdate = setTimeout(function () {
      var vp = cm.getViewport();
      if (state.from == state.to || vp.from - state.to > 20 || state.from - vp.to > 20) {
        updateInViewport(cm);
      } else {
        cm.operation(function () {
          if (vp.from < state.from) {
            updateFoldInfo(cm, vp.from, state.from);
            state.from = vp.from;
          }
          if (vp.to > state.to) {
            updateFoldInfo(cm, state.to, vp.to);
            state.to = vp.to;
          }
        });
      }
    }, opts.updateViewportTimeSpan);
  }
  function onFold(cm, from) {
    var state = cm.state.foldGutter, line = from.line;
    if (line >= state.from && line < state.to)
      updateFoldInfo(cm, line, line + 1);
  }
}());
CodeMirror.defineMode('gfm', function (config) {
  var codeDepth = 0;
  function blankLine(state) {
    state.code = false;
    return null;
  }
  var gfmOverlay = {
      startState: function () {
        return {
          code: false,
          codeBlock: false,
          ateSpace: false
        };
      },
      copyState: function (s) {
        return {
          code: s.code,
          codeBlock: s.codeBlock,
          ateSpace: s.ateSpace
        };
      },
      token: function (stream, state) {
        // Hack to prevent formatting override inside code blocks (block and inline)
        if (state.codeBlock) {
          if (stream.match(/^```/)) {
            state.codeBlock = false;
            return null;
          }
          stream.skipToEnd();
          return null;
        }
        if (stream.sol()) {
          state.code = false;
        }
        if (stream.sol() && stream.match(/^```/)) {
          stream.skipToEnd();
          state.codeBlock = true;
          return null;
        }
        // If this block is changed, it may need to be updated in Markdown mode
        if (stream.peek() === '`') {
          stream.next();
          var before = stream.pos;
          stream.eatWhile('`');
          var difference = 1 + stream.pos - before;
          if (!state.code) {
            codeDepth = difference;
            state.code = true;
          } else {
            if (difference === codeDepth) {
              // Must be exact
              state.code = false;
            }
          }
          return null;
        } else if (state.code) {
          stream.next();
          return null;
        }
        // Check if space. If so, links can be formatted later on
        if (stream.eatSpace()) {
          state.ateSpace = true;
          return null;
        }
        if (stream.sol() || state.ateSpace) {
          state.ateSpace = false;
          if (stream.match(/^(?:[a-zA-Z0-9\-_]+\/)?(?:[a-zA-Z0-9\-_]+@)?(?:[a-f0-9]{7,40}\b)/)) {
            // User/Project@SHA
            // User@SHA
            // SHA
            return 'link';
          } else if (stream.match(/^(?:[a-zA-Z0-9\-_]+\/)?(?:[a-zA-Z0-9\-_]+)?#[0-9]+\b/)) {
            // User/Project#Num
            // User#Num
            // #Num
            return 'link';
          }
        }
        if (stream.match(/^((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i)) {
          // URLs
          // Taken from http://daringfireball.net/2010/07/improved_regex_for_matching_urls
          // And then (issue #1160) simplified to make it not crash the Chrome Regexp engine
          return 'link';
        }
        stream.next();
        return null;
      },
      blankLine: blankLine
    };
  CodeMirror.defineMIME('gfmBase', {
    name: 'markdown',
    underscoresBreakWords: false,
    taskLists: true,
    fencedCodeBlocks: true
  });
  return CodeMirror.overlayMode(CodeMirror.getMode(config, 'gfmBase'), gfmOverlay);
}, 'markdown');
// TODO actually recognize syntax of TypeScript constructs
CodeMirror.defineMode('javascript', function (config, parserConfig) {
  var indentUnit = config.indentUnit;
  var statementIndent = parserConfig.statementIndent;
  var jsonMode = parserConfig.json;
  var isTS = parserConfig.typescript;
  // Tokenizer
  var keywords = function () {
      function kw(type) {
        return {
          type: type,
          style: 'keyword'
        };
      }
      var A = kw('keyword a'), B = kw('keyword b'), C = kw('keyword c');
      var operator = kw('operator'), atom = {
          type: 'atom',
          style: 'atom'
        };
      var jsKeywords = {
          'if': kw('if'),
          'while': A,
          'with': A,
          'else': B,
          'do': B,
          'try': B,
          'finally': B,
          'return': C,
          'break': C,
          'continue': C,
          'new': C,
          'delete': C,
          'throw': C,
          'var': kw('var'),
          'const': kw('var'),
          'let': kw('var'),
          'function': kw('function'),
          'catch': kw('catch'),
          'for': kw('for'),
          'switch': kw('switch'),
          'case': kw('case'),
          'default': kw('default'),
          'in': operator,
          'typeof': operator,
          'instanceof': operator,
          'true': atom,
          'false': atom,
          'null': atom,
          'undefined': atom,
          'NaN': atom,
          'Infinity': atom,
          'this': kw('this')
        };
      // Extend the 'normal' keywords with the TypeScript language extensions
      if (isTS) {
        var type = {
            type: 'variable',
            style: 'variable-3'
          };
        var tsKeywords = {
            'interface': kw('interface'),
            'class': kw('class'),
            'extends': kw('extends'),
            'constructor': kw('constructor'),
            'public': kw('public'),
            'private': kw('private'),
            'protected': kw('protected'),
            'static': kw('static'),
            'super': kw('super'),
            'string': type,
            'number': type,
            'bool': type,
            'any': type
          };
        for (var attr in tsKeywords) {
          jsKeywords[attr] = tsKeywords[attr];
        }
      }
      return jsKeywords;
    }();
  var isOperatorChar = /[+\-*&%=<>!?|~^]/;
  function chain(stream, state, f) {
    state.tokenize = f;
    return f(stream, state);
  }
  function nextUntilUnescaped(stream, end) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (next == end && !escaped)
        return false;
      escaped = !escaped && next == '\\';
    }
    return escaped;
  }
  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp;
    content = cont;
    return style;
  }
  function jsTokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == '\'')
      return chain(stream, state, jsTokenString(ch));
    else if (ch == '.' && stream.match(/^\d+(?:[eE][+\-]?\d+)?/))
      return ret('number', 'number');
    else if (/[\[\]{}\(\),;\:\.]/.test(ch))
      return ret(ch);
    else if (ch == '0' && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-f]/i);
      return ret('number', 'number');
    } else if (/\d/.test(ch)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
      return ret('number', 'number');
    } else if (ch == '/') {
      if (stream.eat('*')) {
        return chain(stream, state, jsTokenComment);
      } else if (stream.eat('/')) {
        stream.skipToEnd();
        return ret('comment', 'comment');
      } else if (state.lastType == 'operator' || state.lastType == 'keyword c' || /^[\[{}\(,;:]$/.test(state.lastType)) {
        nextUntilUnescaped(stream, '/');
        stream.eatWhile(/[gimy]/);
        // 'y' is "sticky" option in Mozilla
        return ret('regexp', 'string-2');
      } else {
        stream.eatWhile(isOperatorChar);
        return ret('operator', null, stream.current());
      }
    } else if (ch == '#') {
      stream.skipToEnd();
      return ret('error', 'error');
    } else if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return ret('operator', null, stream.current());
    } else {
      stream.eatWhile(/[\w\$_]/);
      var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
      return known && state.lastType != '.' ? ret(known.type, known.style, word) : ret('variable', 'variable', word);
    }
  }
  function jsTokenString(quote) {
    return function (stream, state) {
      if (!nextUntilUnescaped(stream, quote))
        state.tokenize = jsTokenBase;
      return ret('string', 'string');
    };
  }
  function jsTokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == '/' && maybeEnd) {
        state.tokenize = jsTokenBase;
        break;
      }
      maybeEnd = ch == '*';
    }
    return ret('comment', 'comment');
  }
  // Parser
  var atomicTypes = {
      'atom': true,
      'number': true,
      'variable': true,
      'string': true,
      'regexp': true,
      'this': true
    };
  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null)
      this.align = align;
  }
  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname)
        return true;
  }
  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state;
    cx.stream = stream;
    cx.marked = null, cx.cc = cc;
    if (!state.lexical.hasOwnProperty('align'))
      state.lexical.align = true;
    while (true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while (cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked)
          return cx.marked;
        if (type == 'variable' && inScope(state, content))
          return 'variable-2';
        return style;
      }
    }
  }
  // Combinator utils
  var cx = {
      state: null,
      column: null,
      marked: null,
      cc: null
    };
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--)
      cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function register(varname) {
    function inList(list) {
      for (var v = list; v; v = v.next)
        if (v.name == varname)
          return true;
      return false;
    }
    var state = cx.state;
    if (state.context) {
      cx.marked = 'def';
      if (inList(state.localVars))
        return;
      state.localVars = {
        name: varname,
        next: state.localVars
      };
    } else {
      if (inList(state.globalVars))
        return;
      state.globalVars = {
        name: varname,
        next: state.globalVars
      };
    }
  }
  // Combinators
  var defaultVars = {
      name: 'this',
      next: { name: 'arguments' }
    };
  function pushcontext() {
    cx.state.context = {
      prev: cx.state.context,
      vars: cx.state.localVars
    };
    cx.state.localVars = defaultVars;
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function () {
      var state = cx.state, indent = state.indented;
      if (state.lexical.type == 'stat')
        indent = state.lexical.indented;
      state.lexical = new JSLexical(indent, cx.stream.column(), type, null, state.lexical, info);
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ')')
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;
  function expect(wanted) {
    return function (type) {
      if (type == wanted)
        return cont();
      else if (wanted == ';')
        return pass();
      else
        return cont(arguments.callee);
    };
  }
  function statement(type) {
    if (type == 'var')
      return cont(pushlex('vardef'), vardef1, expect(';'), poplex);
    if (type == 'keyword a')
      return cont(pushlex('form'), expression, statement, poplex);
    if (type == 'keyword b')
      return cont(pushlex('form'), statement, poplex);
    if (type == '{')
      return cont(pushlex('}'), block, poplex);
    if (type == ';')
      return cont();
    if (type == 'if')
      return cont(pushlex('form'), expression, statement, poplex, maybeelse);
    if (type == 'function')
      return cont(functiondef);
    if (type == 'for')
      return cont(pushlex('form'), expect('('), pushlex(')'), forspec1, expect(')'), poplex, statement, poplex);
    if (type == 'variable')
      return cont(pushlex('stat'), maybelabel);
    if (type == 'switch')
      return cont(pushlex('form'), expression, pushlex('}', 'switch'), expect('{'), block, poplex, poplex);
    if (type == 'case')
      return cont(expression, expect(':'));
    if (type == 'default')
      return cont(expect(':'));
    if (type == 'catch')
      return cont(pushlex('form'), pushcontext, expect('('), funarg, expect(')'), statement, poplex, popcontext);
    return pass(pushlex('stat'), expression, expect(';'), poplex);
  }
  function expression(type) {
    return expressionInner(type, false);
  }
  function expressionNoComma(type) {
    return expressionInner(type, true);
  }
  function expressionInner(type, noComma) {
    var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
    if (atomicTypes.hasOwnProperty(type))
      return cont(maybeop);
    if (type == 'function')
      return cont(functiondef);
    if (type == 'keyword c')
      return cont(noComma ? maybeexpressionNoComma : maybeexpression);
    if (type == '(')
      return cont(pushlex(')'), maybeexpression, expect(')'), poplex, maybeop);
    if (type == 'operator')
      return cont(noComma ? expressionNoComma : expression);
    if (type == '[')
      return cont(pushlex(']'), commasep(expressionNoComma, ']'), poplex, maybeop);
    if (type == '{')
      return cont(pushlex('}'), commasep(objprop, '}'), poplex, maybeop);
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/))
      return pass();
    return pass(expression);
  }
  function maybeexpressionNoComma(type) {
    if (type.match(/[;\}\)\],]/))
      return pass();
    return pass(expressionNoComma);
  }
  function maybeoperatorComma(type, value) {
    if (type == ',')
      return cont(expression);
    return maybeoperatorNoComma(type, value, false);
  }
  function maybeoperatorNoComma(type, value, noComma) {
    var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
    var expr = noComma == false ? expression : expressionNoComma;
    if (type == 'operator') {
      if (/\+\+|--/.test(value))
        return cont(me);
      if (value == '?')
        return cont(expression, expect(':'), expr);
      return cont(expr);
    }
    if (type == ';')
      return;
    if (type == '(')
      return cont(pushlex(')', 'call'), commasep(expressionNoComma, ')'), poplex, me);
    if (type == '.')
      return cont(property, me);
    if (type == '[')
      return cont(pushlex(']'), maybeexpression, expect(']'), poplex, me);
  }
  function maybelabel(type) {
    if (type == ':')
      return cont(poplex, statement);
    return pass(maybeoperatorComma, expect(';'), poplex);
  }
  function property(type) {
    if (type == 'variable') {
      cx.marked = 'property';
      return cont();
    }
  }
  function objprop(type, value) {
    if (type == 'variable') {
      cx.marked = 'property';
      if (value == 'get' || value == 'set')
        return cont(getterSetter);
    } else if (type == 'number' || type == 'string') {
      cx.marked = type + ' property';
    }
    if (atomicTypes.hasOwnProperty(type))
      return cont(expect(':'), expressionNoComma);
  }
  function getterSetter(type) {
    if (type == ':')
      return cont(expression);
    if (type != 'variable')
      return cont(expect(':'), expression);
    cx.marked = 'property';
    return cont(functiondef);
  }
  function commasep(what, end) {
    function proceed(type) {
      if (type == ',') {
        var lex = cx.state.lexical;
        if (lex.info == 'call')
          lex.pos = (lex.pos || 0) + 1;
        return cont(what, proceed);
      }
      if (type == end)
        return cont();
      return cont(expect(end));
    }
    return function (type) {
      if (type == end)
        return cont();
      else
        return pass(what, proceed);
    };
  }
  function block(type) {
    if (type == '}')
      return cont();
    return pass(statement, block);
  }
  function maybetype(type) {
    if (type == ':')
      return cont(typedef);
    return pass();
  }
  function typedef(type) {
    if (type == 'variable') {
      cx.marked = 'variable-3';
      return cont();
    }
    return pass();
  }
  function vardef1(type, value) {
    if (type == 'variable') {
      register(value);
      return isTS ? cont(maybetype, vardef2) : cont(vardef2);
    }
    return pass();
  }
  function vardef2(type, value) {
    if (value == '=')
      return cont(expressionNoComma, vardef2);
    if (type == ',')
      return cont(vardef1);
  }
  function maybeelse(type, value) {
    if (type == 'keyword b' && value == 'else')
      return cont(pushlex('form'), statement, poplex);
  }
  function forspec1(type) {
    if (type == 'var')
      return cont(vardef1, expect(';'), forspec2);
    if (type == ';')
      return cont(forspec2);
    if (type == 'variable')
      return cont(formaybein);
    return pass(expression, expect(';'), forspec2);
  }
  function formaybein(_type, value) {
    if (value == 'in')
      return cont(expression);
    return cont(maybeoperatorComma, forspec2);
  }
  function forspec2(type, value) {
    if (type == ';')
      return cont(forspec3);
    if (value == 'in')
      return cont(expression);
    return pass(expression, expect(';'), forspec3);
  }
  function forspec3(type) {
    if (type != ')')
      cont(expression);
  }
  function functiondef(type, value) {
    if (type == 'variable') {
      register(value);
      return cont(functiondef);
    }
    if (type == '(')
      return cont(pushlex(')'), pushcontext, commasep(funarg, ')'), poplex, statement, popcontext);
  }
  function funarg(type, value) {
    if (type == 'variable') {
      register(value);
      return isTS ? cont(maybetype) : cont();
    }
  }
  // Interface
  return {
    startState: function (basecolumn) {
      return {
        tokenize: jsTokenBase,
        lastType: null,
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, 'block', false),
        localVars: parserConfig.localVars,
        globalVars: parserConfig.globalVars,
        context: parserConfig.localVars && { vars: parserConfig.localVars },
        indented: 0
      };
    },
    token: function (stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty('align'))
          state.lexical.align = false;
        state.indented = stream.indentation();
      }
      if (state.tokenize != jsTokenComment && stream.eatSpace())
        return null;
      var style = state.tokenize(stream, state);
      if (type == 'comment')
        return style;
      state.lastType = type == 'operator' && (content == '++' || content == '--') ? 'incdec' : type;
      return parseJS(state, style, type, content, stream);
    },
    indent: function (state, textAfter) {
      if (state.tokenize == jsTokenComment)
        return CodeMirror.Pass;
      if (state.tokenize != jsTokenBase)
        return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical;
      // Kludge to prevent 'maybelse' from blocking lexical scope pops
      for (var i = state.cc.length - 1; i >= 0; --i) {
        var c = state.cc[i];
        if (c == poplex)
          lexical = lexical.prev;
        else if (c != maybeelse || /^else\b/.test(textAfter))
          break;
      }
      if (lexical.type == 'stat' && firstChar == '}')
        lexical = lexical.prev;
      if (statementIndent && lexical.type == ')' && lexical.prev.type == 'stat')
        lexical = lexical.prev;
      var type = lexical.type, closing = firstChar == type;
      if (type == 'vardef')
        return lexical.indented + (state.lastType == 'operator' || state.lastType == ',' ? 4 : 0);
      else if (type == 'form' && firstChar == '{')
        return lexical.indented;
      else if (type == 'form')
        return lexical.indented + indentUnit;
      else if (type == 'stat')
        return lexical.indented + (state.lastType == 'operator' || state.lastType == ',' ? statementIndent || indentUnit : 0);
      else if (lexical.info == 'switch' && !closing && parserConfig.doubleIndentSwitch != false)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align)
        return lexical.column + (closing ? 0 : 1);
      else
        return lexical.indented + (closing ? 0 : indentUnit);
    },
    electricChars: ':{}',
    blockCommentStart: jsonMode ? null : '/*',
    blockCommentEnd: jsonMode ? null : '*/',
    lineComment: jsonMode ? null : '//',
    fold: 'brace',
    helperType: jsonMode ? 'json' : 'javascript',
    jsonMode: jsonMode
  };
});
CodeMirror.defineMIME('text/javascript', 'javascript');
CodeMirror.defineMIME('text/ecmascript', 'javascript');
CodeMirror.defineMIME('application/javascript', 'javascript');
CodeMirror.defineMIME('application/ecmascript', 'javascript');
CodeMirror.defineMIME('application/json', {
  name: 'javascript',
  json: true
});
CodeMirror.defineMIME('application/x-json', {
  name: 'javascript',
  json: true
});
CodeMirror.defineMIME('text/typescript', {
  name: 'javascript',
  typescript: true
});
CodeMirror.defineMIME('application/typescript', {
  name: 'javascript',
  typescript: true
});
CodeMirror.defineMode('markdown', function (cmCfg, modeCfg) {
  var htmlFound = CodeMirror.modes.hasOwnProperty('xml');
  var htmlMode = CodeMirror.getMode(cmCfg, htmlFound ? {
      name: 'xml',
      htmlMode: true
    } : 'text/plain');
  var aliases = {
      html: 'htmlmixed',
      js: 'javascript',
      json: 'application/json',
      c: 'text/x-csrc',
      'c++': 'text/x-c++src',
      java: 'text/x-java',
      csharp: 'text/x-csharp',
      'c#': 'text/x-csharp',
      scala: 'text/x-scala'
    };
  var getMode = function () {
      var i, modes = {}, mimes = {}, mime;
      var list = [];
      for (var m in CodeMirror.modes)
        if (CodeMirror.modes.propertyIsEnumerable(m))
          list.push(m);
      for (i = 0; i < list.length; i++) {
        modes[list[i]] = list[i];
      }
      var mimesList = [];
      for (var m in CodeMirror.mimeModes)
        if (CodeMirror.mimeModes.propertyIsEnumerable(m))
          mimesList.push({
            mime: m,
            mode: CodeMirror.mimeModes[m]
          });
      for (i = 0; i < mimesList.length; i++) {
        mime = mimesList[i].mime;
        mimes[mime] = mimesList[i].mime;
      }
      for (var a in aliases) {
        if (aliases[a] in modes || aliases[a] in mimes)
          modes[a] = aliases[a];
      }
      return function (lang) {
        return modes[lang] ? CodeMirror.getMode(cmCfg, modes[lang]) : null;
      };
    }();
  // Should underscores in words open/close em/strong?
  if (modeCfg.underscoresBreakWords === undefined)
    modeCfg.underscoresBreakWords = true;
  // Turn on fenced code blocks? ("```" to start/end)
  if (modeCfg.fencedCodeBlocks === undefined)
    modeCfg.fencedCodeBlocks = false;
  // Turn on task lists? ("- [ ] " and "- [x] ")
  if (modeCfg.taskLists === undefined)
    modeCfg.taskLists = false;
  var codeDepth = 0;
  var header = 'header', code = 'comment', quote1 = 'atom', quote2 = 'number', list1 = 'variable-2', list2 = 'variable-3', list3 = 'keyword', hr = 'hr', image = 'tag', linkinline = 'link', linkemail = 'link', linktext = 'link', linkhref = 'string', em = 'em', strong = 'strong';
  var hrRE = /^([*\-=_])(?:\s*\1){2,}\s*$/, ulRE = /^[*\-+]\s+/, olRE = /^[0-9]+\.\s+/, taskListRE = /^\[(x| )\](?=\s)/, headerRE = /^(?:\={1,}|-{1,})$/, textRE = /^[^!\[\]*_\\<>` "'(]+/;
  function switchInline(stream, state, f) {
    state.f = state.inline = f;
    return f(stream, state);
  }
  function switchBlock(stream, state, f) {
    state.f = state.block = f;
    return f(stream, state);
  }
  // Blocks
  function blankLine(state) {
    // Reset linkTitle state
    state.linkTitle = false;
    // Reset EM state
    state.em = false;
    // Reset STRONG state
    state.strong = false;
    // Reset state.quote
    state.quote = 0;
    if (!htmlFound && state.f == htmlBlock) {
      state.f = inlineNormal;
      state.block = blockNormal;
    }
    // Reset state.trailingSpace
    state.trailingSpace = 0;
    state.trailingSpaceNewLine = false;
    // Mark this line as blank
    state.thisLineHasContent = false;
    return null;
  }
  function blockNormal(stream, state) {
    var prevLineIsList = state.list !== false;
    if (state.list !== false && state.indentationDiff >= 0) {
      // Continued list
      if (state.indentationDiff < 4) {
        // Only adjust indentation if *not* a code block
        state.indentation -= state.indentationDiff;
      }
      state.list = null;
    } else if (state.list !== false && state.indentation > 0) {
      state.list = null;
      state.listDepth = Math.floor(state.indentation / 4);
    } else if (state.list !== false) {
      // No longer a list
      state.list = false;
      state.listDepth = 0;
    }
    if (state.indentationDiff >= 4) {
      state.indentation -= 4;
      stream.skipToEnd();
      return code;
    } else if (stream.eatSpace()) {
      return null;
    } else if (stream.peek() === '#' || state.prevLineHasContent && stream.match(headerRE)) {
      state.header = true;
    } else if (stream.eat('>')) {
      state.indentation++;
      state.quote = 1;
      stream.eatSpace();
      while (stream.eat('>')) {
        stream.eatSpace();
        state.quote++;
      }
    } else if (stream.peek() === '[') {
      return switchInline(stream, state, footnoteLink);
    } else if (stream.match(hrRE, true)) {
      return hr;
    } else if ((!state.prevLineHasContent || prevLineIsList) && (stream.match(ulRE, true) || stream.match(olRE, true))) {
      state.indentation += 4;
      state.list = true;
      state.listDepth++;
      if (modeCfg.taskLists && stream.match(taskListRE, false)) {
        state.taskList = true;
      }
    } else if (modeCfg.fencedCodeBlocks && stream.match(/^```([\w+#]*)/, true)) {
      // try switching mode
      state.localMode = getMode(RegExp.$1);
      if (state.localMode)
        state.localState = state.localMode.startState();
      switchBlock(stream, state, local);
      return code;
    }
    return switchInline(stream, state, state.inline);
  }
  function htmlBlock(stream, state) {
    var style = htmlMode.token(stream, state.htmlState);
    if (htmlFound && style === 'tag' && state.htmlState.type !== 'openTag' && !state.htmlState.context) {
      state.f = inlineNormal;
      state.block = blockNormal;
    }
    if (state.md_inside && stream.current().indexOf('>') != -1) {
      state.f = inlineNormal;
      state.block = blockNormal;
      state.htmlState.context = undefined;
    }
    return style;
  }
  function local(stream, state) {
    if (stream.sol() && stream.match(/^```/, true)) {
      state.localMode = state.localState = null;
      state.f = inlineNormal;
      state.block = blockNormal;
      return code;
    } else if (state.localMode) {
      return state.localMode.token(stream, state.localState);
    } else {
      stream.skipToEnd();
      return code;
    }
  }
  // Inline
  function getType(state) {
    var styles = [];
    if (state.taskOpen) {
      return 'meta';
    }
    if (state.taskClosed) {
      return 'property';
    }
    if (state.strong) {
      styles.push(strong);
    }
    if (state.em) {
      styles.push(em);
    }
    if (state.linkText) {
      styles.push(linktext);
    }
    if (state.code) {
      styles.push(code);
    }
    if (state.header) {
      styles.push(header);
    }
    if (state.quote) {
      styles.push(state.quote % 2 ? quote1 : quote2);
    }
    if (state.list !== false) {
      var listMod = (state.listDepth - 1) % 3;
      if (!listMod) {
        styles.push(list1);
      } else if (listMod === 1) {
        styles.push(list2);
      } else {
        styles.push(list3);
      }
    }
    if (state.trailingSpaceNewLine) {
      styles.push('trailing-space-new-line');
    } else if (state.trailingSpace) {
      styles.push('trailing-space-' + (state.trailingSpace % 2 ? 'a' : 'b'));
    }
    return styles.length ? styles.join(' ') : null;
  }
  function handleText(stream, state) {
    if (stream.match(textRE, true)) {
      return getType(state);
    }
    return undefined;
  }
  function inlineNormal(stream, state) {
    var style = state.text(stream, state);
    if (typeof style !== 'undefined')
      return style;
    if (state.list) {
      // List marker (*, +, -, 1., etc)
      state.list = null;
      return getType(state);
    }
    if (state.taskList) {
      var taskOpen = stream.match(taskListRE, true)[1] !== 'x';
      if (taskOpen)
        state.taskOpen = true;
      else
        state.taskClosed = true;
      state.taskList = false;
      return getType(state);
    }
    state.taskOpen = false;
    state.taskClosed = false;
    var ch = stream.next();
    if (ch === '\\') {
      stream.next();
      return getType(state);
    }
    // Matches link titles present on next line
    if (state.linkTitle) {
      state.linkTitle = false;
      var matchCh = ch;
      if (ch === '(') {
        matchCh = ')';
      }
      matchCh = (matchCh + '').replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
      var regex = '^\\s*(?:[^' + matchCh + '\\\\]+|\\\\\\\\|\\\\.)' + matchCh;
      if (stream.match(new RegExp(regex), true)) {
        return linkhref;
      }
    }
    // If this block is changed, it may need to be updated in GFM mode
    if (ch === '`') {
      var t = getType(state);
      var before = stream.pos;
      stream.eatWhile('`');
      var difference = 1 + stream.pos - before;
      if (!state.code) {
        codeDepth = difference;
        state.code = true;
        return getType(state);
      } else {
        if (difference === codeDepth) {
          // Must be exact
          state.code = false;
          return t;
        }
        return getType(state);
      }
    } else if (state.code) {
      return getType(state);
    }
    if (ch === '!' && stream.match(/\[[^\]]*\] ?(?:\(|\[)/, false)) {
      stream.match(/\[[^\]]*\]/);
      state.inline = state.f = linkHref;
      return image;
    }
    if (ch === '[' && stream.match(/.*\](\(| ?\[)/, false)) {
      state.linkText = true;
      return getType(state);
    }
    if (ch === ']' && state.linkText) {
      var type = getType(state);
      state.linkText = false;
      state.inline = state.f = linkHref;
      return type;
    }
    if (ch === '<' && stream.match(/^(https?|ftps?):\/\/(?:[^\\>]|\\.)+>/, false)) {
      return switchInline(stream, state, inlineElement(linkinline, '>'));
    }
    if (ch === '<' && stream.match(/^[^> \\]+@(?:[^\\>]|\\.)+>/, false)) {
      return switchInline(stream, state, inlineElement(linkemail, '>'));
    }
    if (ch === '<' && stream.match(/^\w/, false)) {
      if (stream.string.indexOf('>') != -1) {
        var atts = stream.string.substring(1, stream.string.indexOf('>'));
        if (/markdown\s*=\s*('|"){0,1}1('|"){0,1}/.test(atts)) {
          state.md_inside = true;
        }
      }
      stream.backUp(1);
      return switchBlock(stream, state, htmlBlock);
    }
    if (ch === '<' && stream.match(/^\/\w*?>/)) {
      state.md_inside = false;
      return 'tag';
    }
    var ignoreUnderscore = false;
    if (!modeCfg.underscoresBreakWords) {
      if (ch === '_' && stream.peek() !== '_' && stream.match(/(\w)/, false)) {
        var prevPos = stream.pos - 2;
        if (prevPos >= 0) {
          var prevCh = stream.string.charAt(prevPos);
          if (prevCh !== '_' && prevCh.match(/(\w)/, false)) {
            ignoreUnderscore = true;
          }
        }
      }
    }
    var t = getType(state);
    if (ch === '*' || ch === '_' && !ignoreUnderscore) {
      if (state.strong === ch && stream.eat(ch)) {
        // Remove STRONG
        state.strong = false;
        return t;
      } else if (!state.strong && stream.eat(ch)) {
        // Add STRONG
        state.strong = ch;
        return getType(state);
      } else if (state.em === ch) {
        // Remove EM
        state.em = false;
        return t;
      } else if (!state.em) {
        // Add EM
        state.em = ch;
        return getType(state);
      }
    } else if (ch === ' ') {
      if (stream.eat('*') || stream.eat('_')) {
        // Probably surrounded by spaces
        if (stream.peek() === ' ') {
          // Surrounded by spaces, ignore
          return getType(state);
        } else {
          // Not surrounded by spaces, back up pointer
          stream.backUp(1);
        }
      }
    }
    if (ch === ' ') {
      if (stream.match(/ +$/, false)) {
        state.trailingSpace++;
      } else if (state.trailingSpace) {
        state.trailingSpaceNewLine = true;
      }
    }
    return getType(state);
  }
  function linkHref(stream, state) {
    // Check if space, and return NULL if so (to avoid marking the space)
    if (stream.eatSpace()) {
      return null;
    }
    var ch = stream.next();
    if (ch === '(' || ch === '[') {
      return switchInline(stream, state, inlineElement(linkhref, ch === '(' ? ')' : ']'));
    }
    return 'error';
  }
  function footnoteLink(stream, state) {
    if (stream.match(/^[^\]]*\]:/, true)) {
      state.f = footnoteUrl;
      return linktext;
    }
    return switchInline(stream, state, inlineNormal);
  }
  function footnoteUrl(stream, state) {
    // Check if space, and return NULL if so (to avoid marking the space)
    if (stream.eatSpace()) {
      return null;
    }
    // Match URL
    stream.match(/^[^\s]+/, true);
    // Check for link title
    if (stream.peek() === undefined) {
      // End of line, set flag to check next line
      state.linkTitle = true;
    } else {
      // More content on line, check if link title
      stream.match(/^(?:\s+(?:"(?:[^"\\]|\\\\|\\.)+"|'(?:[^'\\]|\\\\|\\.)+'|\((?:[^)\\]|\\\\|\\.)+\)))?/, true);
    }
    state.f = state.inline = inlineNormal;
    return linkhref;
  }
  var savedInlineRE = [];
  function inlineRE(endChar) {
    if (!savedInlineRE[endChar]) {
      // Escape endChar for RegExp (taken from http://stackoverflow.com/a/494122/526741)
      endChar = (endChar + '').replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
      // Match any non-endChar, escaped character, as well as the closing
      // endChar.
      savedInlineRE[endChar] = new RegExp('^(?:[^\\\\]|\\\\.)*?(' + endChar + ')');
    }
    return savedInlineRE[endChar];
  }
  function inlineElement(type, endChar, next) {
    next = next || inlineNormal;
    return function (stream, state) {
      stream.match(inlineRE(endChar));
      state.inline = state.f = next;
      return type;
    };
  }
  return {
    startState: function () {
      return {
        f: blockNormal,
        prevLineHasContent: false,
        thisLineHasContent: false,
        block: blockNormal,
        htmlState: CodeMirror.startState(htmlMode),
        indentation: 0,
        inline: inlineNormal,
        text: handleText,
        linkText: false,
        linkTitle: false,
        em: false,
        strong: false,
        header: false,
        taskList: false,
        list: false,
        listDepth: 0,
        quote: 0,
        trailingSpace: 0,
        trailingSpaceNewLine: false,
        parentIndentation: 0
      };
    },
    copyState: function (s) {
      return {
        f: s.f,
        prevLineHasContent: s.prevLineHasContent,
        thisLineHasContent: s.thisLineHasContent,
        block: s.block,
        htmlState: CodeMirror.copyState(htmlMode, s.htmlState),
        indentation: s.indentation,
        localMode: s.localMode,
        localState: s.localMode ? CodeMirror.copyState(s.localMode, s.localState) : null,
        inline: s.inline,
        text: s.text,
        linkTitle: s.linkTitle,
        em: s.em,
        strong: s.strong,
        header: s.header,
        taskList: s.taskList,
        list: s.list,
        listDepth: s.listDepth,
        quote: s.quote,
        trailingSpace: s.trailingSpace,
        trailingSpaceNewLine: s.trailingSpaceNewLine,
        parentIndentation: s.parentIndentation,
        md_inside: s.md_inside
      };
    },
    token: function (stream, state) {
      if (stream.sol()) {
        if (stream.match(/^\s*$/, true)) {
          state.prevLineHasContent = false;
          return blankLine(state);
        } else {
          state.prevLineHasContent = state.thisLineHasContent;
          state.thisLineHasContent = true;
        }
        // Reset state.header
        state.header = false;
        // Reset state.taskList
        state.taskList = false;
        // Reset state.code
        state.code = false;
        // Reset state.trailingSpace
        state.trailingSpace = 0;
        state.trailingSpaceNewLine = false;
        state.f = state.block;
        var indentation = stream.match(/^\s*/, true)[0].replace(/\t/g, '    ').length - state.parentIndentation;
        var difference = Math.floor((indentation - state.indentation - state.parentIndentation) / 4) * 4;
        if (difference > 4)
          difference = 4;
        var adjustedIndentation = state.indentation + difference - state.parentIndentation;
        state.indentationDiff = adjustedIndentation - state.indentation - state.parentIndentation;
        state.indentation = adjustedIndentation;
        if (indentation > 0)
          return null;
      }
      return state.f(stream, state);
    },
    blankLine: blankLine,
    getType: getType
  };
}, 'xml');
CodeMirror.defineMIME('text/x-markdown', 'markdown');
// Utility function that allows modes to be combined. The mode given
// as the base argument takes care of most of the normal mode
// functionality, but a second (typically simple) mode is used, which
// can override the style of text. Both modes get to parse all of the
// text, but when both assign a non-null style to a piece of code, the
// overlay wins, unless the combine argument was true, in which case
// the styles are combined.
// overlayParser is the old, deprecated name
CodeMirror.overlayMode = CodeMirror.overlayParser = function (base, overlay, combine) {
  return {
    startState: function () {
      return {
        base: CodeMirror.startState(base),
        overlay: CodeMirror.startState(overlay),
        basePos: 0,
        baseCur: null,
        overlayPos: 0,
        overlayCur: null
      };
    },
    copyState: function (state) {
      return {
        base: CodeMirror.copyState(base, state.base),
        overlay: CodeMirror.copyState(overlay, state.overlay),
        basePos: state.basePos,
        baseCur: null,
        overlayPos: state.overlayPos,
        overlayCur: null
      };
    },
    token: function (stream, state) {
      if (stream.start == state.basePos) {
        state.baseCur = base.token(stream, state.base);
        state.basePos = stream.pos;
      }
      if (stream.start == state.overlayPos) {
        stream.pos = stream.start;
        state.overlayCur = overlay.token(stream, state.overlay);
        state.overlayPos = stream.pos;
      }
      stream.pos = Math.min(state.basePos, state.overlayPos);
      if (stream.eol())
        state.basePos = state.overlayPos = 0;
      if (state.overlayCur == null)
        return state.baseCur;
      if (state.baseCur != null && combine)
        return state.baseCur + ' ' + state.overlayCur;
      else
        return state.overlayCur;
    },
    indent: base.indent && function (state, textAfter) {
      return base.indent(state.base, textAfter);
    },
    electricChars: base.electricChars,
    innerMode: function (state) {
      return {
        state: state.base,
        mode: base
      };
    },
    blankLine: function (state) {
      if (base.blankLine)
        base.blankLine(state.base);
      if (overlay.blankLine)
        overlay.blankLine(state.overlay);
    }
  };
};
(function () {
  'use strict';
  CodeMirror.showHint = function (cm, getHints, options) {
    // We want a single cursor position.
    if (cm.somethingSelected())
      return;
    if (getHints == null)
      getHints = cm.getHelper(cm.getCursor(), 'hint');
    if (getHints == null)
      return;
    if (cm.state.completionActive)
      cm.state.completionActive.close();
    var completion = cm.state.completionActive = new Completion(cm, getHints, options || {});
    CodeMirror.signal(cm, 'startCompletion', cm);
    if (completion.options.async)
      getHints(cm, function (hints) {
        completion.showHints(hints);
      }, completion.options);
    else
      return completion.showHints(getHints(cm, completion.options));
  };
  function Completion(cm, getHints, options) {
    this.cm = cm;
    this.getHints = getHints;
    this.options = options;
    this.widget = this.onClose = null;
  }
  Completion.prototype = {
    close: function () {
      if (!this.active())
        return;
      if (this.widget)
        this.widget.close();
      if (this.onClose)
        this.onClose();
      this.cm.state.completionActive = null;
      CodeMirror.signal(this.cm, 'endCompletion', this.cm);
    },
    active: function () {
      return this.cm.state.completionActive == this;
    },
    pick: function (data, i) {
      var completion = data.list[i];
      if (completion.hint)
        completion.hint(this.cm, data, completion);
      else
        this.cm.replaceRange(getText(completion), data.from, data.to);
      this.close();
    },
    showHints: function (data) {
      if (!data || !data.list.length || !this.active())
        return this.close();
      if (!this.options.ghosting && this.options.completeSingle != false && data.list.length == 1)
        this.pick(data, 0);
      else
        this.showWidget(data);
    },
    showWidget: function (data) {
      this.widget = new Widget(this, data);
      CodeMirror.signal(data, 'shown');
      var debounce = null, completion = this, finished;
      var closeOn = this.options.closeCharacters || /[\s()\[\]{};:>,]/;
      var startPos = this.cm.getCursor(), startLen = this.cm.getLine(startPos.line).length;
      function done() {
        if (finished)
          return;
        finished = true;
        completion.close();
        completion.cm.off('cursorActivity', activity);
        CodeMirror.signal(data, 'close');
      }
      function isDone() {
        if (finished)
          return true;
        if (!completion.widget) {
          done();
          return true;
        }
      }
      function update() {
        if (isDone())
          return;
        if (completion.options.async)
          completion.getHints(completion.cm, finishUpdate, completion.options);
        else
          finishUpdate(completion.getHints(completion.cm, completion.options));
      }
      function finishUpdate(data) {
        if (isDone())
          return;
        if (!data || !data.list.length)
          return done();
        completion.widget.close();
        completion.widget = new Widget(completion, data);
      }
      function activity() {
        clearTimeout(debounce);
        var pos = completion.cm.getCursor(), line = completion.cm.getLine(pos.line);
        if (pos.line != startPos.line || line.length - pos.ch != startLen - startPos.ch || pos.ch < startPos.ch || completion.cm.somethingSelected() || pos.ch && closeOn.test(line.charAt(pos.ch - 1)))
          completion.close();
        else
          debounce = setTimeout(update, 170);
      }
      this.cm.on('cursorActivity', activity);
      this.onClose = done;
    }
  };
  function getText(completion) {
    if (typeof completion == 'string')
      return completion;
    else
      return completion.text;
  }
  function buildKeyMap(options, handle) {
    var baseMap = {
        Up: function () {
          handle.moveFocus(-1);
        },
        Down: function () {
          handle.moveFocus(1);
        },
        PageUp: function () {
          handle.moveFocus(-handle.menuSize());
        },
        PageDown: function () {
          handle.moveFocus(handle.menuSize());
        },
        Home: function () {
          handle.setFocus(0);
        },
        End: function () {
          handle.setFocus(handle.length);
        },
        Enter: handle.pick,
        Esc: handle.close
      };
    var ourMap = options.customKeys ? {} : baseMap;
    function addBinding(key, val) {
      var bound;
      if (typeof val != 'string')
        bound = function (cm) {
          return val(cm, handle);
        };  // This mechanism is deprecated
      else if (baseMap.hasOwnProperty(val))
        bound = baseMap[val];
      else
        bound = val;
      ourMap[key] = bound;
    }
    if (options.customKeys)
      for (var key in options.customKeys)
        if (options.customKeys.hasOwnProperty(key))
          addBinding(key, options.customKeys[key]);
    if (options.extraKeys)
      for (var key in options.extraKeys)
        if (options.extraKeys.hasOwnProperty(key))
          addBinding(key, options.extraKeys[key]);
    return ourMap;
  }
  function Widget(completion, data) {
    this.completion = completion;
    this.data = data;
    this.options = completion.options || {};
    var widget = this, cm = completion.cm, options = completion.options;
    var hints = this.hints = document.createElement('ul');
    hints.className = 'CodeMirror-hints';
    this.selectedHint = 0;
    var completions = data.list;
    for (var i = 0; i < completions.length; ++i) {
      var elt = hints.appendChild(document.createElement('li')), cur = completions[i];
      var className = 'CodeMirror-hint' + (i ? '' : ' CodeMirror-hint-active');
      if (cur.className != null)
        className = cur.className + ' ' + className;
      elt.className = className;
      if (cur.render)
        cur.render(elt, data, cur);
      else
        elt.appendChild(document.createTextNode(cur.displayText || getText(cur)));
      elt.hintId = i;
    }
    var pos = cm.cursorCoords(options.alignWithWord !== false ? data.from : null);
    var left = pos.left, top = pos.bottom, below = true;
    hints.style.left = left + 'px';
    hints.style.top = top + 'px';
    if (this.options.ghosting) {
      hints.style.display = completions.length > 1 ? 'block' : 'none';
    }
    // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
    var winW = window.innerWidth || Math.max(document.body.offsetWidth, document.documentElement.offsetWidth);
    var winH = window.innerHeight || Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
    var box = hints.getBoundingClientRect();
    var overlapX = box.right - winW, overlapY = box.bottom - winH;
    if (overlapX > 0) {
      if (box.right - box.left > winW) {
        hints.style.width = winW - 5 + 'px';
        overlapX -= box.right - box.left - winW;
      }
      hints.style.left = (left = pos.left - overlapX) + 'px';
    }
    if (overlapY > 0) {
      var height = box.bottom - box.top;
      if (box.top - (pos.bottom - pos.top) - height > 0) {
        overlapY = height + (pos.bottom - pos.top);
        below = false;
      } else if (height > winH) {
        hints.style.height = winH - 5 + 'px';
        overlapY -= height - winH;
      }
      hints.style.top = (top = pos.bottom - overlapY) + 'px';
    }
    (options.container || document.body).appendChild(hints);
    cm.addKeyMap(this.keyMap = buildKeyMap(options, {
      moveFocus: function (n) {
        widget.changeActive(widget.selectedHint + n);
      },
      setFocus: function (n) {
        widget.changeActive(n);
      },
      menuSize: function () {
        return widget.screenAmount();
      },
      length: completions.length,
      close: function () {
        completion.close();
      },
      pick: function () {
        widget.pick();
      }
    }));
    if (options.closeOnUnfocus !== false) {
      var closingOnBlur;
      cm.on('blur', this.onBlur = function () {
        closingOnBlur = setTimeout(function () {
          completion.close();
        }, 100);
      });
      cm.on('focus', this.onFocus = function () {
        clearTimeout(closingOnBlur);
      });
    }
    var startScroll = cm.getScrollInfo();
    cm.on('scroll', this.onScroll = function () {
      var curScroll = cm.getScrollInfo(), editor = cm.getWrapperElement().getBoundingClientRect();
      var newTop = top + startScroll.top - curScroll.top;
      var point = newTop - (window.pageYOffset || (document.documentElement || document.body).scrollTop);
      if (!below)
        point += hints.offsetHeight;
      if (point <= editor.top || point >= editor.bottom)
        return completion.close();
      hints.style.top = newTop + 'px';
      hints.style.left = left + startScroll.left - curScroll.left + 'px';
    });
    CodeMirror.on(hints, 'dblclick', function (e) {
      var t = widget.getHintElement(hints, e.target || e.srcElement);
      if (t && t.hintId != null) {
        widget.changeActive(t.hintId);
        widget.pick();
      }
    });
    CodeMirror.on(hints, 'click', function (e) {
      var t = widget.getHintElement(hints, e.target || e.srcElement);
      if (t && t.hintId != null)
        widget.changeActive(t.hintId);
    });
    CodeMirror.on(hints, 'mousedown', function () {
      setTimeout(function () {
        cm.focus();
      }, 20);
    });
    CodeMirror.signal(data, 'select', completions[0], hints.firstChild);
    if (this.options.ghosting && this.data.list[0]) {
      this.removeGhost();
      this.ghost = new Ghost(this, this.data, this.data.list[0].displayText, this.pick.bind(this));
    }
    return true;
  }
  Widget.prototype = {
    close: function () {
      if (this.completion.widget != this)
        return;
      this.completion.widget = null;
      this.hints.parentNode.removeChild(this.hints);
      this.completion.cm.removeKeyMap(this.keyMap);
      this.removeGhost();
      var cm = this.completion.cm;
      if (this.options.closeOnUnfocus !== false) {
        cm.off('blur', this.onBlur);
        cm.off('focus', this.onFocus);
      }
      cm.off('scroll', this.onScroll);
    },
    pick: function () {
      this.completion.pick(this.data, this.selectedHint);
    },
    changeActive: function (i) {
      i = Math.max(0, Math.min(i, this.data.list.length - 1));
      if (this.selectedHint == i)
        return;
      var node = this.hints.childNodes[this.selectedHint];
      node.className = node.className.replace(' CodeMirror-hint-active', '');
      node = this.hints.childNodes[this.selectedHint = i];
      node.className += ' CodeMirror-hint-active';
      if (this.options.ghosting) {
        this.removeGhost();
        this.ghost = new Ghost(this, this.data, this.data.list[i].displayText, this.pick.bind(this));
      }
      if (node.offsetTop < this.hints.scrollTop)
        this.hints.scrollTop = node.offsetTop - 3;
      else if (node.offsetTop + node.offsetHeight > this.hints.scrollTop + this.hints.clientHeight)
        this.hints.scrollTop = node.offsetTop + node.offsetHeight - this.hints.clientHeight + 3;
      CodeMirror.signal(this.data, 'select', this.data.list[this.selectedHint], node);
    },
    screenAmount: function () {
      return Math.floor(this.hints.clientHeight / this.hints.firstChild.offsetHeight) || 1;
    },
    removeGhost: function () {
      if (!this.ghost) {
        return;
      }
      this.ghost.remove();
      return this;
    },
    getHintElement: function (parent, el) {
      while (el && el !== parent && !this.isHintElement(el)) {
        el = el.parentNode;
      }
      return el === parent ? void 0 : el;
      ;
    },
    isHintElement: function (el) {
      return el.nodeName && el.nodeName.toUpperCase() === 'LI' && el.className.split(/\s/).indexOf('CodeMirror-hint') !== -1;
      ;
    }
  };
  function Ghost(widget, data, text, accept) {
    var that = this;
    this.cm = widget.completion.cm;
    this.data = data;
    this.widget = widget;
    this.completion = widget.completion;
    this.cm.addKeyMap(this.keyMap = {
      'Tab': accept || function () {
        that.accept();
      },
      'Right': accept || function () {
        that.accept();
      }
    });
    if (!text) {
      return this.remove();
    }
    // At the moment, the ghost is going to assume the prefix text is accurate
    var suffix = this.suffix = text.substr(data.word.length);
    if (!suffix.length) {
      return this.remove();
    }
    // Creates the ghost element to be styled.
    var ghostHint = document.createElement('span');
    ghostHint.className = 'CodeMirror-hint-ghost';
    ghostHint.appendChild(document.createTextNode(suffix));
    // Abuse the bookmark feature of CodeMirror to achieve the desired completion
    // effect without modifying source code.
    this._ghost = this.cm.setBookmark(this.data.to, {
      widget: ghostHint,
      insertLeft: true
    });
  }
  Ghost.prototype = {
    accept: function () {
      if (this.suffix && this.data) {
        this.cm.replaceRange(this.suffix, this.data.to, this.data.to);
      }
      return this.remove();
    },
    remove: function () {
      if (this._ghost) {
        this._ghost.clear();
      }
      this.cm.removeKeyMap(this.keyMap);
      delete this.ghost;
      delete this.suffix;
      delete this.widget.ghost;
      return this;
    }
  };
}());
CodeMirror.defineMode('xml', function (config, parserConfig) {
  var indentUnit = config.indentUnit;
  var multilineTagIndentFactor = parserConfig.multilineTagIndentFactor || 1;
  var multilineTagIndentPastTag = parserConfig.multilineTagIndentPastTag || true;
  var Kludges = parserConfig.htmlMode ? {
      autoSelfClosers: {
        'area': true,
        'base': true,
        'br': true,
        'col': true,
        'command': true,
        'embed': true,
        'frame': true,
        'hr': true,
        'img': true,
        'input': true,
        'keygen': true,
        'link': true,
        'meta': true,
        'param': true,
        'source': true,
        'track': true,
        'wbr': true
      },
      implicitlyClosed: {
        'dd': true,
        'li': true,
        'optgroup': true,
        'option': true,
        'p': true,
        'rp': true,
        'rt': true,
        'tbody': true,
        'td': true,
        'tfoot': true,
        'th': true,
        'tr': true
      },
      contextGrabbers: {
        'dd': {
          'dd': true,
          'dt': true
        },
        'dt': {
          'dd': true,
          'dt': true
        },
        'li': { 'li': true },
        'option': {
          'option': true,
          'optgroup': true
        },
        'optgroup': { 'optgroup': true },
        'p': {
          'address': true,
          'article': true,
          'aside': true,
          'blockquote': true,
          'dir': true,
          'div': true,
          'dl': true,
          'fieldset': true,
          'footer': true,
          'form': true,
          'h1': true,
          'h2': true,
          'h3': true,
          'h4': true,
          'h5': true,
          'h6': true,
          'header': true,
          'hgroup': true,
          'hr': true,
          'menu': true,
          'nav': true,
          'ol': true,
          'p': true,
          'pre': true,
          'section': true,
          'table': true,
          'ul': true
        },
        'rp': {
          'rp': true,
          'rt': true
        },
        'rt': {
          'rp': true,
          'rt': true
        },
        'tbody': {
          'tbody': true,
          'tfoot': true
        },
        'td': {
          'td': true,
          'th': true
        },
        'tfoot': { 'tbody': true },
        'th': {
          'td': true,
          'th': true
        },
        'thead': {
          'tbody': true,
          'tfoot': true
        },
        'tr': { 'tr': true }
      },
      doNotIndent: { 'pre': true },
      allowUnquoted: true,
      allowMissing: true
    } : {
      autoSelfClosers: {},
      implicitlyClosed: {},
      contextGrabbers: {},
      doNotIndent: {},
      allowUnquoted: false,
      allowMissing: false
    };
  var alignCDATA = parserConfig.alignCDATA;
  // Return variables for tokenizers
  var tagName, type;
  function inText(stream, state) {
    function chain(parser) {
      state.tokenize = parser;
      return parser(stream, state);
    }
    var ch = stream.next();
    if (ch == '<') {
      if (stream.eat('!')) {
        if (stream.eat('[')) {
          if (stream.match('CDATA['))
            return chain(inBlock('atom', ']]>'));
          else
            return null;
        } else if (stream.match('--')) {
          return chain(inBlock('comment', '-->'));
        } else if (stream.match('DOCTYPE', true, true)) {
          stream.eatWhile(/[\w\._\-]/);
          return chain(doctype(1));
        } else {
          return null;
        }
      } else if (stream.eat('?')) {
        stream.eatWhile(/[\w\._\-]/);
        state.tokenize = inBlock('meta', '?>');
        return 'meta';
      } else {
        var isClose = stream.eat('/');
        tagName = '';
        var c;
        while (c = stream.eat(/[^\s\u00a0=<>\"\'\/?]/))
          tagName += c;
        if (!tagName)
          return 'error';
        type = isClose ? 'closeTag' : 'openTag';
        state.tokenize = inTag;
        return 'tag';
      }
    } else if (ch == '&') {
      var ok;
      if (stream.eat('#')) {
        if (stream.eat('x')) {
          ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(';');
        } else {
          ok = stream.eatWhile(/[\d]/) && stream.eat(';');
        }
      } else {
        ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(';');
      }
      return ok ? 'atom' : 'error';
    } else {
      stream.eatWhile(/[^&<]/);
      return null;
    }
  }
  function inTag(stream, state) {
    var ch = stream.next();
    if (ch == '>' || ch == '/' && stream.eat('>')) {
      state.tokenize = inText;
      type = ch == '>' ? 'endTag' : 'selfcloseTag';
      return 'tag';
    } else if (ch == '=') {
      type = 'equals';
      return null;
    } else if (ch == '<') {
      return 'error';
    } else if (/[\'\"]/.test(ch)) {
      state.tokenize = inAttribute(ch);
      state.stringStartCol = stream.column();
      return state.tokenize(stream, state);
    } else {
      stream.eatWhile(/[^\s\u00a0=<>\"\']/);
      return 'word';
    }
  }
  function inAttribute(quote) {
    var closure = function (stream, state) {
      while (!stream.eol()) {
        if (stream.next() == quote) {
          state.tokenize = inTag;
          break;
        }
      }
      return 'string';
    };
    closure.isInAttribute = true;
    return closure;
  }
  function inBlock(style, terminator) {
    return function (stream, state) {
      while (!stream.eol()) {
        if (stream.match(terminator)) {
          state.tokenize = inText;
          break;
        }
        stream.next();
      }
      return style;
    };
  }
  function doctype(depth) {
    return function (stream, state) {
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == '<') {
          state.tokenize = doctype(depth + 1);
          return state.tokenize(stream, state);
        } else if (ch == '>') {
          if (depth == 1) {
            state.tokenize = inText;
            break;
          } else {
            state.tokenize = doctype(depth - 1);
            return state.tokenize(stream, state);
          }
        }
      }
      return 'meta';
    };
  }
  var curState, curStream, setStyle;
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--)
      curState.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function pushContext(tagName, startOfLine) {
    var noIndent = Kludges.doNotIndent.hasOwnProperty(tagName) || curState.context && curState.context.noIndent;
    curState.context = {
      prev: curState.context,
      tagName: tagName,
      indent: curState.indented,
      startOfLine: startOfLine,
      noIndent: noIndent
    };
  }
  function popContext() {
    if (curState.context)
      curState.context = curState.context.prev;
  }
  function element(type) {
    if (type == 'openTag') {
      curState.tagName = tagName;
      curState.tagStart = curStream.column();
      return cont(attributes, endtag(curState.startOfLine));
    } else if (type == 'closeTag') {
      var err = false;
      if (curState.context) {
        if (curState.context.tagName != tagName) {
          if (Kludges.implicitlyClosed.hasOwnProperty(curState.context.tagName.toLowerCase())) {
            popContext();
          }
          err = !curState.context || curState.context.tagName != tagName;
        }
      } else {
        err = true;
      }
      if (err)
        setStyle = 'error';
      return cont(endclosetag(err));
    }
    return cont();
  }
  function endtag(startOfLine) {
    return function (type) {
      var tagName = curState.tagName;
      curState.tagName = curState.tagStart = null;
      if (type == 'selfcloseTag' || type == 'endTag' && Kludges.autoSelfClosers.hasOwnProperty(tagName.toLowerCase())) {
        maybePopContext(tagName.toLowerCase());
        return cont();
      }
      if (type == 'endTag') {
        maybePopContext(tagName.toLowerCase());
        pushContext(tagName, startOfLine);
        return cont();
      }
      return cont();
    };
  }
  function endclosetag(err) {
    return function (type) {
      if (err)
        setStyle = 'error';
      if (type == 'endTag') {
        popContext();
        return cont();
      }
      setStyle = 'error';
      return cont(arguments.callee);
    };
  }
  function maybePopContext(nextTagName) {
    var parentTagName;
    while (true) {
      if (!curState.context) {
        return;
      }
      parentTagName = curState.context.tagName.toLowerCase();
      if (!Kludges.contextGrabbers.hasOwnProperty(parentTagName) || !Kludges.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
        return;
      }
      popContext();
    }
  }
  function attributes(type) {
    if (type == 'word') {
      setStyle = 'attribute';
      return cont(attribute, attributes);
    }
    if (type == 'endTag' || type == 'selfcloseTag')
      return pass();
    setStyle = 'error';
    return cont(attributes);
  }
  function attribute(type) {
    if (type == 'equals')
      return cont(attvalue, attributes);
    if (!Kludges.allowMissing)
      setStyle = 'error';
    else if (type == 'word') {
      setStyle = 'attribute';
      return cont(attribute, attributes);
    }
    return type == 'endTag' || type == 'selfcloseTag' ? pass() : cont();
  }
  function attvalue(type) {
    if (type == 'string')
      return cont(attvaluemaybe);
    if (type == 'word' && Kludges.allowUnquoted) {
      setStyle = 'string';
      return cont();
    }
    setStyle = 'error';
    return type == 'endTag' || type == 'selfCloseTag' ? pass() : cont();
  }
  function attvaluemaybe(type) {
    if (type == 'string')
      return cont(attvaluemaybe);
    else
      return pass();
  }
  return {
    startState: function () {
      return {
        tokenize: inText,
        cc: [],
        indented: 0,
        startOfLine: true,
        tagName: null,
        tagStart: null,
        context: null
      };
    },
    token: function (stream, state) {
      if (!state.tagName && stream.sol()) {
        state.startOfLine = true;
        state.indented = stream.indentation();
      }
      if (stream.eatSpace())
        return null;
      setStyle = type = tagName = null;
      var style = state.tokenize(stream, state);
      state.type = type;
      if ((style || type) && style != 'comment') {
        curState = state;
        curStream = stream;
        while (true) {
          var comb = state.cc.pop() || element;
          if (comb(type || style))
            break;
        }
      }
      state.startOfLine = false;
      return setStyle || style;
    },
    indent: function (state, textAfter, fullLine) {
      var context = state.context;
      // Indent multi-line strings (e.g. css).
      if (state.tokenize.isInAttribute) {
        return state.stringStartCol + 1;
      }
      if (state.tokenize != inTag && state.tokenize != inText || context && context.noIndent)
        return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
      // Indent the starts of attribute names.
      if (state.tagName) {
        if (multilineTagIndentPastTag)
          return state.tagStart + state.tagName.length + 2;
        else
          return state.tagStart + indentUnit * multilineTagIndentFactor;
      }
      if (alignCDATA && /<!\[CDATA\[/.test(textAfter))
        return 0;
      if (context && /^<\//.test(textAfter))
        context = context.prev;
      while (context && !context.startOfLine)
        context = context.prev;
      if (context)
        return context.indent + indentUnit;
      else
        return 0;
    },
    electricChars: '/',
    blockCommentStart: '<!--',
    blockCommentEnd: '-->',
    configuration: parserConfig.htmlMode ? 'html' : 'xml',
    helperType: parserConfig.htmlMode ? 'html' : 'xml'
  };
});
CodeMirror.defineMIME('text/xml', 'xml');
CodeMirror.defineMIME('application/xml', 'xml');
if (!CodeMirror.mimeModes.hasOwnProperty('text/html'))
  CodeMirror.defineMIME('text/html', {
    name: 'xml',
    htmlMode: true
  });
(function () {
  'use strict';
  angular.module('ramlEditorApp', [
    'ui.bootstrap.modal',
    'ui.bootstrap.tpls',
    'ui.tree',
    'ramlConsoleApp',
    'codeMirror',
    'fs',
    'raml',
    'stringFilters',
    'utils',
    'lightweightDOM',
    'splitter',
    'validate',
    'autoFocus',
    'rightClick',
    'dragAndDrop'
  ]).run([
    '$window',
    '$location',
    function ($window, $location) {
      // Adding proxy settings for api console
      var disableProxy = $location.search().xDisableProxy === 'true';
      $window.RAML.Settings.proxy = disableProxy ? '' : '/proxy/';
    }
  ]);
  ;
}());
/*jshint bitwise: false*/
'use strict';
if (!Array.prototype.find) {
  Array.prototype.find = function (predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;
    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}
if (!Array.prototype.includes) {
  Array.prototype.includes = function (searchElement) {
    var O = Object(this);
    var len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1]) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {
        k = 0;
      }
    }
    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement || searchElement !== searchElement && currentElement !== currentElement) {
        return true;
      }
      k++;
    }
    return false;
  };
}
if (!Array.prototype.reduce) {
  Array.prototype.reduce = function (callback) {
    if (this === null) {
      throw new TypeError('Array.prototype.reduce called on null or undefined');
    }
    if (typeof callback !== 'function') {
      throw new TypeError(callback + ' is not a function');
    }
    var t = Object(this), len = t.length >>> 0, k = 0, value;
    if (arguments.length === 2) {
      value = arguments[1];
    } else {
      while (k < len && !(k in t)) {
        k++;
      }
      if (k >= len) {
        throw new TypeError('Reduce of empty array with no initial value');
      }
      value = t[k++];
    }
    for (; k < len; k++) {
      if (k in t) {
        value = callback(value, t[k], k, t);
      }
    }
    return value;
  };
}
'use strict';
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (text) {
    return this.indexOf(text) === 0;
  };
}
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function (text) {
    return this.lastIndexOf(text) === this.length - text.length;
  };
}
if (!window.Map) {
  window.Map = window.es6Map;
}
(function () {
  'use strict';
  angular.module('utils', []).value('indentUnit', 2).factory('safeApply', [
    '$rootScope',
    '$exceptionHandler',
    function safeApplyFactory($rootScope, $exceptionHandler) {
      return function safeApply(scope, expr) {
        scope = scope || $rootScope;
        if ([
            '$apply',
            '$digest'
          ].indexOf(scope.$root && scope.$root.$$phase || scope.$$phase) !== -1) {
          try {
            return scope.$eval(expr);
          } catch (e) {
            $exceptionHandler(e);
          }
        } else {
          return scope.$apply(expr);
        }
      };
    }
  ]).factory('safeApplyWrapper', [
    'safeApply',
    function safeApplyWrapperFactory(safeApply) {
      return function safeApplyWrapper(scope, expr) {
        return function safeApplyWrapperInner1() {
          var args = Array.prototype.slice.call(arguments, 0);
          return safeApply(scope, function safeApplyWrapperInner2() {
            return expr.apply(this, args);
          });
        };
      };
    }
  ]).factory('getTime', function () {
    return Date.now || function () {
      return new Date().getTime();
    };
  }).factory('debounce', [
    '$timeout',
    '$q',
    function debounceFactory($timeout, $q) {
      /**
      * Ensures that a function will be called just once
      * after a period of time expires.
      *
      * @param {Function} target the function to debounce
      * @param {number} wait the wait delay in miliseconds
      */
      return function (target, wait) {
        var timeout = null;
        var deferred = $q.defer();
        return function () {
          var context = this;
          var args = arguments;
          var invokeTarget = function invokeTarget() {
            // call the target function, resolve the promise and reset local state for following calls
            timeout = null;
            deferred.resolve(target.apply(context, args));
            deferred = $q.defer();
          };
          // if timeout exists means that the function is being called again before the delay has finished
          // so we cancel the delayed execution in order to re-schedule it
          timeout && $timeout.cancel(timeout);
          // schedule (or re-schedule) the delayed execution
          timeout = $timeout(invokeTarget, wait);
          // return a promise that will be resolved when the target function is called
          return deferred.promise;
        };
      };
    }
  ]).value('generateSpaces', function (spaceCount) {
    spaceCount = spaceCount || 0;
    return new Array(spaceCount + 1).join(' ');
  }).factory('generateTabs', [
    'generateSpaces',
    'indentUnit',
    function (generateSpaces, indentUnit) {
      return function (tabs, customIndentUnit) {
        customIndentUnit = customIndentUnit || indentUnit;
        tabs = tabs || 0;
        return new Array(tabs + 1).join(generateSpaces(indentUnit));
      };
    }
  ]).value('$prompt', function (message, value) {
    return window.prompt(message, value);
  }).value('$confirm', function (message) {
    return window.confirm(message);
  }).factory('generateName', function () {
    // generateName(names, defaultName, extension)
    // Takes a list of names under the current directory, uses defaultName as a pattern,
    // and add enumeration to the end of the defaultName.
    //
    // For example:
    // name        = ["Untitled-1.raml", "Untitled-2.raml", "test.raml"]
    // defaultName = 'Untitled-'
    // extension   = 'raml'
    //
    // will return 'Untitled-3.raml'
    return function generateName(names, defaultName, extension) {
      extension = extension ? '.' + extension : '';
      var currentMax = Math.max.apply(undefined, names.map(function (name) {
          var re = new RegExp(defaultName + '(\\d+)');
          var match = name.match(re);
          return match ? match[1] : 0;
        }).concat(0));
      return defaultName + (currentMax + 1) + extension;
    };
  }).factory('scroll', function () {
    var keys = {
        37: true,
        38: true,
        39: true,
        40: true
      };
    function preventDefault(e) {
      e = e || window.event;
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }
    }
    function keyDown(e) {
      if (keys[e.keyCode]) {
        preventDefault(e);
      }
    }
    function wheel(e) {
      preventDefault(e);
    }
    return {
      enable: function () {
        if (window.removeEventListener) {
          window.removeEventListener('DOMMouseScroll', wheel, false);
        }
        window.onmousewheel = document.onmousewheel = document.onkeydown = null;
      },
      disable: function () {
        if (window.addEventListener) {
          window.addEventListener('DOMMouseScroll', wheel, false);
        }
        window.onmousewheel = document.onmousewheel = wheel;
        document.onkeydown = keyDown;
      }
    };
  }).factory('resolveUri', [
    '$window',
    function resolveUri($window) {
      return function resolveUri(uri) {
        // starts with "http://" OR "https://" OR <scheme>://"
        if (/^\w+:\/\//.test(uri)) {
          return uri;
        }
        // starts with "/"
        if (uri[0] === '/') {
          return $window.location.origin + uri;
        }
        return $window.location.origin + $window.location.pathname.split('/').slice(0, -1).concat(uri).join('/');
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('raml').value('config', {
    set: function (key, value) {
      localStorage['config.' + key] = value;
    },
    get: function (key, defaultValue) {
      key = 'config.' + key;
      if (key in localStorage) {
        return localStorage[key];
      }
      return defaultValue;
    },
    remove: function (key) {
      delete localStorage['config.' + key];
    },
    clear: function () {
      localStorage.clear();
    }
  });
  ;
}());
/**
 * The lightweight-dom module provides a DOM-like API over raml documents. For
 * performance reasons, this DOM is lazy; navigation from one node to
 * another involves parsing RAML rather than walking an actual DOM.
 *
 * The parsing code is built on lightweight-parse, for which this module is
 * intended to be a facade.
 * It is designed for editor purposes and not intended to be a compliant
 * RAML parser, but an MVP implementation designed to make things like reliably
 * showing the right shelf items a matter not of string parsing but of RAML DOM
 * inspection/traversal.
 *
 * Since this is a designer DOM, it attempts to return as much data as possible
 * even if a document is correctly formed. To this end, parents/children are
 * defined as having a less than/greater than tab count. For example:
 * Foo:
 *     Bar:
 *           Baz:
 * The child of Foo is Bar and the child of Bar is Baz. The reverse traversal
 * is Baz to Bar to Foo. So, it is thus up to client code to detect proper
 * nesting by inspecting nodes' tabCount. For example, code could autocorrect
 * users' code, show an error, or ignore the issue and let the user fix the
 * errors themselves.
 */
(function () {
  'use strict';
  angular.module('lightweightDOM', ['lightweightParse']).factory('getNode', [
    'getSpaceCount',
    'getTabCount',
    'getLineIndent',
    'isArrayStarter',
    'isCommentStarter',
    'extractKeyValue',
    function getNodeFactory(getSpaceCount, getTabCount, getLineIndent, isArrayStarter, isCommentStarter, extractKeyValue) {
      var cache = {};
      //region LazyNode Class Definition
      /**
       * Builds a new lazy node from the given content.
       * @param editor The CodeMirror raml editor containing the RAML document
       * @param lineNumber The line to read the node from.
       * @constructor
       * @throws If lineNumber is out of range of the editor's contents
       */
      function LazyNode(editor, lineNumber, line) {
        this.editor = editor;
        this.lineNumber = lineNumber;
        this.line = line;
        this.lineIndent = getLineIndent(this.line, editor.getOption('indentUnit'));
        this.isEmpty = this.lineIndent.spaceCount === this.line.length;
        this.isComment = !this.isEmpty && isCommentStarter(this.line);
        this.isArrayStarter = !this.isComment && isArrayStarter(this.line);
        this.isStructural = !this.isEmpty && !this.isComment;
      }
      LazyNode.prototype.getKeyValue = function getKeyValue() {
        if (!this.keyValue) {
          this.keyValue = extractKeyValue(this.line);
        }
        return this.keyValue;
      };
      LazyNode.prototype.getKey = function getKey() {
        return this.getKeyValue().key;
      };
      LazyNode.prototype.getValue = function getValue() {
        return this.getKeyValue().value;
      };
      /**
       * @returns {LazyNode} The next structural sibling node, or null.
       */
      LazyNode.prototype.getNextSibling = function getNextSibling() {
        // Calculate the correct tab indent for the next sibling:
        // For non-array nodes, the indent is identical
        // For array node, the indent is one greater
        var nextLineNumber = this.lineNumber;
        while (true) {
          var nextNode = getNode(this.editor, ++nextLineNumber);
          if (nextNode === null) {
            return null;
          }
          // Skip empty elements and comments
          if (!nextNode.isStructural) {
            continue;
          }
          // If the next node is at our tab level it is always a sibling
          if (nextNode.lineIndent.tabCount === this.lineIndent.tabCount) {
            return nextNode;
          }
          // Array case:
          // Previous element is non-starter in previous array:
          if (this.isArrayStarter && !nextNode.isArrayStarter && nextNode.lineIndent.tabCount === this.lineIndent.tabCount + 1) {
            return nextNode;
          }
          // Previous element is starter in previous array:
          if (!this.isArrayStarter && nextNode.isArrayStarter && nextNode.lineIndent.tabCount === this.lineIndent.tabCount - 1) {
            return nextNode;
          }
          // If we end up at a lower tab count, then there are no more siblings possible
          if (nextNode.lineIndent.tabCount < this.lineIndent.tabCount) {
            return null;
          }
        }
      };
      /**
       * @returns {LazyNode} The previous structural sibling node, or null.
       */
      LazyNode.prototype.getPreviousSibling = function getPreviousSibling() {
        // Calculate the correct tab indent for the previous sibling:
        // For non-array nodes, the indent is identical
        // For array node, the indent is one less OR an element that is an array starter
        var prevLineNumber = this.lineNumber;
        while (true) {
          prevLineNumber -= 1;
          var prevNode = getNode(this.editor, prevLineNumber);
          if (prevNode === null) {
            return null;
          }
          // Ignore comments and empty lines
          if (!prevNode.isStructural) {
            continue;
          }
          // If the previous node is at our tab level it is always a sibling
          if (prevNode.lineIndent.tabCount === this.lineIndent.tabCount) {
            return prevNode;
          }
          // Array cases:
          // Previous element is non-starter in previous array:
          if (this.isArrayStarter && !prevNode.isArrayStarter && prevNode.lineIndent.tabCount === this.lineIndent.tabCount + 1) {
            return prevNode;
          }
          // Previous element is starter in previous array:
          if (!this.isArrayStarter && prevNode.isArrayStarter && prevNode.lineIndent.tabCount === this.lineIndent.tabCount - 1) {
            return prevNode;
          }
          //If we end up at a lower tab count, then there are no more siblings possible
          if (prevNode.lineIndent.tabCount < this.lineIndent.tabCount) {
            return null;
          }
        }
      };
      /**
       * @returns {LazyNode} The first structural child node, or null.
       */
      LazyNode.prototype.getFirstChild = function getFirstChild() {
        var nextNodeTabCount = this.lineIndent.tabCount + (this.isArrayStarter ? 2 : 1);
        var nextLineNumber = this.lineNumber;
        while (true) {
          var nextNode = getNode(this.editor, ++nextLineNumber);
          if (nextNode === null) {
            return null;
          }
          // If we end up at the same or lower tab count, then there are no children possible
          if (nextNode.lineIndent.tabCount < nextNodeTabCount) {
            return null;
          }
          // look at any node at or beyond the tabCount since the document could be malformed,
          // but we still want to return children.
          if (nextNode.lineIndent.tabCount >= nextNodeTabCount && nextNode.isStructural) {
            return nextNode;
          }
        }
      };
      /**
       * @returns {LazyNode} The parent node, or null if this is a root node
       */
      LazyNode.prototype.getParent = function getParent() {
        // For members of arrays that aren't the first array element, the parent is
        // two tabs over, e.g
        // documentation:
        //   - title: foo
        //     content: bar <- 2 tabs over from parent
        var parentNodeTabCount = this.lineIndent.tabCount - (!this.isArrayStarter && this.getIsInArray() ? 2 : 1);
        var prevLineNumber = this.lineNumber;
        while (true) {
          var prevNode = getNode(this.editor, --prevLineNumber);
          if (prevNode === null) {
            return null;
          }
          // look at any node at or beyond the tabCount since the document could be malformed,
          // but we still want to return a parent if we can find one.
          if (prevNode.lineIndent.tabCount <= parentNodeTabCount && prevNode.isStructural) {
            return prevNode;
          }
        }
      };
      /**
       * @returns {[LazyNode]} All direct descendants of this node
       */
      LazyNode.prototype.getChildren = function getChildren() {
        var children = [];
        var child = this.getFirstChild();
        while (child !== null) {
          children.push(child);
          child = child.getNextSibling();
        }
        return children;
      };
      /**
       * @returns {[LazyNode]} The current node plus any nodes at the same tab
       * level with the same parent. For arrays, returns all members of the
       * node's array. Array consists first of current node, then previous neighbors
       * then next neighbors.
       */
      LazyNode.prototype.getSelfAndNeighbors = function getSelfAndNeighbors() {
        var nodes = [];
        var inArray = this.getIsInArray();
        var node = this;
        while (node && node.getIsInArray() === inArray) {
          nodes.push(node);
          if (node.isArrayStarter) {
            break;
          }
          node = node.getPreviousSibling();
        }
        node = this.getNextSibling();
        while (node && !node.isArrayStarter && node.getIsInArray() === inArray) {
          nodes.push(node);
          node = node.getNextSibling();
        }
        return nodes;
      };
      /**
       * @returns {Boolean} Whether or not the node is in an array
       */
      LazyNode.prototype.getIsInArray = function getIsInArray() {
        // Walk previous siblings until we find one that starts an array, or we run
        // out of siblings.
        // Note: We don't use recursion here since JS has a low recursion limit of 1000
        if (this.isArrayStarter) {
          return true;
        }
        // Move up until we find a node one tab count less: If it is
        // an array starter, we are in an array
        var node = this.getPreviousSibling();
        while (node && node.lineIndent.tabCount >= this.lineIndent.tabCount) {
          node = node.getPreviousSibling();
        }
        return !!(node && node.isArrayStarter && node.lineIndent.tabCount === this.lineIndent.tabCount - 1);
      };
      /**
       * @returns {Array} Returns array containing all parent nodes of
       * this node, with the direct parent being the last element in the
       * array.
       */
      LazyNode.prototype.getPath = function getPath() {
        var path = [];
        var node = this;
        while (node = node.getParent()) {
          path.unshift(node);
        }
        return path;
      };
      /**
       * Executes the testFunc against this node and its parents, moving up the
       * tree until no more nodes are found.  Will halt if the test function
       * returns true.
       * @param testFunc Function to execute against current node and parents
       * @returns {LazyNode} The first node where testFunc returns true, or null.
       */
      LazyNode.prototype.selfOrParent = function selfOrParent(testFunc) {
        return this.first(this.getParent, testFunc);
      };
      /**
       * Executes the testFunc against this node and its prior siblings. Will
       * halt if the test function returns true.
       * @param testFunc Function to execute against current node and parents
       * @returns {LazyNode} The first node where testFunc returns true, or null.
       */
      LazyNode.prototype.selfOrPrevious = function selfOrPrevious(testFunc) {
        return this.first(this.getPreviousSibling, testFunc);
      };
      /**
       * Executes the test function against all nodes, including the current one,
       * returned by nextNodeFunc. Halts when no more nodes are found or testFunc
       * returns a truthy value.
       * @param nextNodeFunc Function that returns the next node to search.
       * @param testFunc Function that returns a node that matches a filter.
       * @returns {LazyNode} The first node where testFunc returns true, or null.
       */
      LazyNode.prototype.first = function first(nextNodeFunc, testFunc) {
        var node = this;
        while (node) {
          if (testFunc(node)) {
            return node;
          }
          node = nextNodeFunc.apply(node);
        }
        return null;
      };
      //endregion
      /**
       * @param editor The CodeMirror raml editor containing the RAML document
       * @param lineNumber The line to read the node from, or the current cursor
       *                line if not specified.
       * @returns {LazyNode} Instance of LazyNode at given line, or null if the
       * line is not a number or out of editor bounds.
       */
      function getNode(editor, lineNumber) {
        // If the line number is a number but out of bounds then we return null.
        // If the line number is not a number, we use the current editor line.
        var cursor = editor.getCursor();
        var codeLineNum = arguments.length > 1 ? lineNumber : cursor.line;
        var line = editor.getLine(codeLineNum);
        var cachedNode = cache[codeLineNum];
        if (line === undefined) {
          return null;
        }
        // Special case: If a node is non-structural, e.g. an empty line or a comment, then by
        // contract with upper layers, we use the cursor position if it is at the line.
        // This matches the behavior of the shelf and autocomplete features.
        // It is, admittedly, a little bit obscure but based on all editor use cases we've looked at, it works.
        if (cursor.line === codeLineNum) {
          var spaceCount = getSpaceCount(line);
          if (spaceCount === line.length || line[spaceCount] === '#') {
            line = line.slice(0, cursor.ch);
          }
        }
        if (!cachedNode || cachedNode.line !== line) {
          cachedNode = cache[codeLineNum] = new LazyNode(editor, codeLineNum, line);
        }
        return cachedNode;
      }
      return getNode;
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('lightweightParse', ['utils']).factory('getSpaceCount', function getSpaceCountFactory() {
    return function getSpaceCount(line) {
      for (var i = 0, length = line.length; i < length; i++) {
        if (line[i] !== ' ') {
          break;
        }
      }
      return i;
    };
  }).factory('getTabCount', [
    'indentUnit',
    function getTabCountFactory(indentUnit) {
      return function getTabCount(spaceCount, indentSize) {
        indentSize = indentSize || indentUnit;
        return Math.floor(spaceCount / indentSize);
      };
    }
  ]).factory('getLineIndent', [
    'getSpaceCount',
    'getTabCount',
    function getLineIndentFactory(getSpaceCount, getTabCount) {
      return function getLineIndent(line, indentSize) {
        var spaceCount = getSpaceCount(line);
        return {
          spaceCount: spaceCount,
          tabCount: getTabCount(spaceCount, indentSize),
          content: spaceCount ? line.slice(spaceCount) : line
        };
      };
    }
  ]).factory('isArrayStarter', [
    'getSpaceCount',
    function isArrayStarterFactory(getSpaceCount) {
      return function isArrayStarter(line) {
        var spaceCount = getSpaceCount(line);
        return line[spaceCount] === '-' && line[spaceCount + 1] === ' ';
      };
    }
  ]).factory('isCommentStarter', [
    'getSpaceCount',
    function isCommentStarterFactory(getSpaceCount) {
      return function isCommentStarter(line) {
        var spaceCount = getSpaceCount(line);
        return line[spaceCount] === '#';
      };
    }
  ]).factory('extractKeyValue', function extractKeyValueFactory() {
    /**
       * Removes the whitespaces from the line between start and end indices.
       *
       * @param line The line that needs to be trimmed.
       * @param start The index of left border of the line where trimming should begin.
       * If value is negative, it'll be computed based on length of the line as [length + start].
       * @param end The index of the right border of the line where trimming should end.
       * If value is negative, it'll be computed based on length of the line as [length + end].
       *
       * @returns The trimmed line without whitespaces between start and end.
       */
    function trim(line, start, end) {
      start = start || 0;
      end = end || line.length;
      if (start < 0) {
        start = line.length + start;
      }
      if (end < 0) {
        end = line.length + end;
      }
      while (start < end && line[start] === ' ') {
        start += 1;
      }
      while (start < end && line[end - 1] === ' ') {
        end -= 1;
      }
      if (start === 0 && end === line.length) {
        return line;
      }
      return line.slice(start, end);
    }
    /**
       * Transforms a value which is a string into an object that provides additional
       * information such as whether value is an alias or a reference.
       *
       * @param value The value that needs to be transformed.
       *
       * @returns {{text, isAlias, isReference}}
       */
    function transformValue(value) {
      if (!value) {
        return null;
      }
      return {
        text: value,
        isAlias: value[0] === '&',
        isReference: value[0] === '*'
      };
    }
    return function extractKeyValue(line) {
      var start = 0;
      var end = line.length;
      var indexOf = line.indexOf('#');
      if (indexOf !== -1) {
        end = indexOf;
      }
      indexOf = line.indexOf('- ');
      if (indexOf !== -1 && indexOf < end) {
        start = indexOf + 2;
      }
      indexOf = line.indexOf(': ', start);
      if (indexOf !== -1 && indexOf < end) {
        return {
          key: trim(line, start, indexOf),
          value: transformValue(trim(line, indexOf + 2, end))
        };
      }
      indexOf = line.lastIndexOf(':', end);
      if (indexOf === end - 1) {
        return {
          key: trim(line, start, end - 1),
          value: null
        };
      }
      return {
        key: null,
        value: transformValue(trim(line, start, end))
      };
    };
  }).factory('getScopes', [
    'getLineIndent',
    function getScopesFactory(getLineIndent) {
      var lastArrayCache;
      function areArraysEqual(a, b) {
        if (a === undefined || b === undefined) {
          return false;
        }
        if (a.length !== b.length) {
          return false;
        }
        for (var i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) {
            return false;
          }
        }
        return true;
      }
      return function getScopes(arrayOfLines) {
        if (lastArrayCache && areArraysEqual(lastArrayCache.key, arrayOfLines)) {
          return lastArrayCache.value;
        }
        var currentIndexes = {};
        var zipValues = arrayOfLines.map(function (line, index) {
            var lineIndentInfo = getLineIndent(line);
            return {
              tabCount: lineIndentInfo.tabCount,
              content: lineIndentInfo.content,
              lineNumber: index
            };
          });
        var levelTable = zipValues.reduce(function (result, currentLine) {
            var currentArray = currentIndexes[currentLine.tabCount - 1], lastArrayIndex, currentIndex;
            if (currentArray) {
              lastArrayIndex = currentArray.length - 1;
              currentIndex = currentIndexes[currentLine.tabCount - 1][lastArrayIndex];
            } else if (currentLine.tabCount > 1) {
              // Case for lists, we fetch a level lower
              currentArray = currentIndexes[currentLine.tabCount - 2];
              // Ignore this line if the tab level is invalid
              if (currentArray) {
                lastArrayIndex = currentArray.length - 1;
                currentIndex = currentIndexes[currentLine.tabCount - 2][lastArrayIndex];
                result[currentIndex] = result[currentIndex] || [];
                result[currentIndex].push({
                  lineNumber: currentLine.lineNumber,
                  content: currentLine.content,
                  tabCount: currentLine.tabCount
                });
                currentIndexes[currentLine.tabCount - 1] = currentIndexes[currentLine.tabCount - 1] || [];
                currentIndexes[currentLine.tabCount - 1].push(currentLine.lineNumber);
              }
              return result;
            } else {
              // Case of the first element of the first level
              currentIndex = 0;
            }
            result[currentIndex] = result[currentIndex] || [];
            result[currentIndex].push({
              lineNumber: currentLine.lineNumber,
              content: currentLine.content,
              tabCount: currentLine.tabCount
            });
            currentIndexes[currentLine.tabCount] = currentIndexes[currentLine.tabCount] || [];
            currentIndexes[currentLine.tabCount].push(currentLine.lineNumber);
            return result;
          }, {});
        lastArrayCache = {
          result: {
            scopeLevels: currentIndexes,
            scopesByLine: levelTable
          },
          lines: arrayOfLines
        };
        return {
          scopeLevels: currentIndexes,
          scopesByLine: levelTable
        };
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('codeFolding', [
    'raml',
    'lightweightParse'
  ]).factory('getFoldRange', [
    'getLineIndent',
    function getFoldRangeFactory(getLineIndent) {
      return function getFoldRange(cm, start) {
        var line = cm.getLine(start.line);
        var lineIndentInfo = getLineIndent(line);
        var nextLineIndentInfo;
        if (!lineIndentInfo.content) {
          return;
        }
        var nextLine = cm.getLine(start.line + 1);
        if (!nextLine) {
          return;
        }
        var tabCount = lineIndentInfo.tabCount;
        var nextTabCount = getLineIndent(nextLine).tabCount;
        if (nextTabCount > tabCount) {
          for (var i = start.line + 2, end = cm.lineCount(); i < end; i++) {
            nextLine = cm.getLine(i);
            nextLineIndentInfo = getLineIndent(nextLine);
            nextTabCount = nextLineIndentInfo.tabCount;
            if (nextTabCount <= tabCount && nextLineIndentInfo.content) {
              nextLine = cm.getLine(i - 1);
              return {
                from: CodeMirror.Pos(start.line, line.length),
                to: CodeMirror.Pos(i - 1, nextLine.length)
              };
            }
            if (i === end - 1) {
              nextLine = cm.getLine(end - 1);
              return {
                from: CodeMirror.Pos(start.line, line.length),
                to: CodeMirror.Pos(end - 1, nextLine.length)
              };
            }
          }
        }
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('codeMirror', [
    'raml',
    'ramlEditorApp',
    'codeFolding'
  ]).factory('codeMirror', [
    '$rootScope',
    'ramlSuggest',
    'codeMirrorHighLight',
    'generateSpaces',
    'generateTabs',
    'getFoldRange',
    'isArrayStarter',
    'getSpaceCount',
    'getTabCount',
    'config',
    'extractKeyValue',
    function ($rootScope, ramlSuggest, codeMirrorHighLight, generateSpaces, generateTabs, getFoldRange, isArrayStarter, getSpaceCount, getTabCount, config, extractKeyValue) {
      var editor = null;
      var service = { CodeMirror: CodeMirror };
      service.removeTabs = function (line, indentUnit) {
        var spaceCount = getTabCount(getSpaceCount(line), indentUnit) * indentUnit;
        return spaceCount ? line.slice(spaceCount) : line;
      };
      service.tabKey = function (cm) {
        var cursor = cm.getCursor();
        var line = cm.getLine(cursor.line);
        var indentUnit = cm.getOption('indentUnit');
        var spaces;
        var result;
        var unitsToIndent;
        if (cm.somethingSelected()) {
          cm.indentSelection('add');
          return;
        }
        result = service.removeTabs(line, indentUnit);
        result = result.length ? result : '';
        // if in half/part of a tab, add the necessary spaces to complete the tab
        if (result !== '' && result.replace(/ /g, '') === '') {
          unitsToIndent = indentUnit - result.length;  // if not ident normally
        } else {
          unitsToIndent = indentUnit;
        }
        spaces = generateSpaces(unitsToIndent);
        cm.replaceSelection(spaces, 'end', '+input');
      };
      service.backspaceKey = function (cm) {
        var cursor = cm.getCursor();
        var line = cm.getLine(cursor.line).slice(0, cursor.ch);
        var indentUnit = cm.getOption('indentUnit');
        var spaceCount = line.length - line.replace(/\s+$/, '').length;
        var lineEndsWithTab = spaceCount >= indentUnit;
        // delete indentation if there is at least one right before
        // the cursor and number of whitespaces is a multiple of indentUnit
        //
        // we do it for better user experience as if you had 3 whitespaces
        // before cursor and pressed Backspace, you'd expect cursor to stop
        // at second whitespace to continue typing RAML content, otherwise
        // you'd end up at first whitespace and be forced to hit Spacebar
        if (lineEndsWithTab && spaceCount % indentUnit === 0) {
          for (var i = 0; i < indentUnit; i++) {
            cm.deleteH(-1, 'char');
          }
          return;
        }
        cm.deleteH(-1, 'char');
      };
      var MODES = {
          xml: { name: 'xml' },
          xsd: {
            name: 'xml',
            alignCDATA: true
          },
          json: {
            name: 'javascript',
            json: true
          },
          md: { name: 'gfm' },
          raml: { name: 'raml' }
        };
      var defaultKeys = {
          'Cmd-S': 'save',
          'Ctrl-S': 'save',
          'Shift-Tab': 'indentLess',
          'Shift-Ctrl-T': 'toggleTheme'
        };
      var ramlKeys = {
          'Ctrl-Space': 'autocomplete',
          'Cmd-S': 'save',
          'Ctrl-S': 'save',
          'Shift-Tab': 'indentLess',
          'Shift-Ctrl-T': 'toggleTheme'
        };
      var autocomplete = function onChange(cm) {
        if (cm.getLine(cm.getCursor().line).trim()) {
          cm.execCommand('autocomplete');
        }
      };
      service.configureEditor = function (editor, extension) {
        var mode = MODES[extension] || MODES.raml;
        editor.setOption('mode', mode);
        if (mode.name === 'raml') {
          editor.setOption('extraKeys', ramlKeys);
          editor.on('change', autocomplete);
        } else {
          editor.setOption('extraKeys', defaultKeys);
          editor.off('change', autocomplete);
        }
      };
      service.enterKey = function (cm) {
        function getParent(lineNumber, spaceCount) {
          for (var i = lineNumber - 1; i >= 0; i--) {
            if (getSpaceCount(cm.getLine(i)) < spaceCount) {
              return extractKeyValue(cm.getLine(i)).key;
            }
          }
        }
        var cursor = cm.getCursor();
        var endOfLine = cursor.ch >= cm.getLine(cursor.line).length - 1;
        var line = cm.getLine(cursor.line).slice(0, cursor.ch);
        var lineStartsArray = isArrayStarter(line);
        var spaceCount = getSpaceCount(line);
        var spaces = generateSpaces(spaceCount);
        var parent = getParent(cursor.line, spaceCount);
        var traitOrType = [
            'traits',
            'resourceTypes'
          ].indexOf(parent) !== -1;
        if (endOfLine) {
          (function () {
            if (traitOrType) {
              spaces += generateTabs(2);
              return;
            } else if (lineStartsArray) {
              spaces += generateTabs(1);
            }
            if (line.replace(/\s+$/, '').slice(-1) === '|') {
              spaces += generateTabs(1);
              return;
            }
            var nextLine = cm.getLine(cursor.line + 1);
            if (nextLine && getSpaceCount(nextLine) > spaceCount) {
              spaces += generateTabs(1);
            }
          }());
        } else {
          if (lineStartsArray) {
            spaces += generateTabs(1);
          }
        }
        cm.replaceSelection('\n' + spaces, 'end', '+input');
      };
      service.createEditor = function (el, extraOptions) {
        var shouldEnableFoldGutter = JSON.parse(config.get('folding', 'true'));
        var foldGutterConfig = false;
        var cm;
        var options;
        if (shouldEnableFoldGutter) {
          foldGutterConfig = {
            rangeFinder: CodeMirror.fold.indent,
            foldOnChangeTimeSpan: 300,
            updateViewportTimeSpan: 200
          };
        }
        options = {
          mode: 'raml',
          theme: 'solarized dark',
          lineNumbers: true,
          lineWrapping: true,
          autofocus: true,
          indentWithTabs: false,
          indentUnit: 2,
          tabSize: 2,
          keyMap: 'tabSpace',
          foldGutter: foldGutterConfig,
          gutters: [
            'CodeMirror-lint-markers',
            'CodeMirror-linenumbers',
            'CodeMirror-foldgutter'
          ]
        };
        if (extraOptions) {
          Object.keys(extraOptions).forEach(function (key) {
            options[key] = extraOptions[key];
          });
        }
        cm = new CodeMirror(el, options);
        cm.setSize('100%', '100%');
        cm.foldCode(0, { rangeFinder: CodeMirror.fold.indent });
        var charWidth = cm.defaultCharWidth();
        var basePadding = 4;
        cm.on('renderLine', function (cm, line, el) {
          var offset = CodeMirror.countColumn(line.text, null, cm.getOption('tabSize')) * charWidth;
          el.style.textIndent = '-' + offset + 'px';
          el.style.paddingLeft = basePadding + offset + 'px';
        });
        return cm;
      };
      service.initEditor = function () {
        var el = document.getElementById('code');
        var cm = service.createEditor(el);
        // for testing automation purposes
        editor = window.editor = cm;
        return cm;
      };
      service.getEditor = function () {
        return editor;
      };
      (function bootstrap() {
        CodeMirror.keyMap.tabSpace = {
          Tab: service.tabKey,
          Backspace: service.backspaceKey,
          Enter: service.enterKey,
          fallthrough: ['default']
        };
        CodeMirror.commands.save = function () {
          $rootScope.$broadcast('event:save');
        };
        CodeMirror.commands.autocomplete = function (cm) {
          CodeMirror.showHint(cm, CodeMirror.hint.raml, {
            completeSingle: false,
            ghosting: false,
            async: true
          });
        };
        CodeMirror.commands.toggleTheme = function () {
          $rootScope.$broadcast('event:toggle-theme');
        };
        CodeMirror.defineMode('raml', codeMirrorHighLight.highlight);
        CodeMirror.defineMIME('text/x-raml', 'raml');
        CodeMirror.registerHelper('hint', 'raml', ramlSuggest.autocompleteHelper.bind(ramlSuggest));
        CodeMirror.registerHelper('fold', 'indent', getFoldRange);
      }());
      return service;
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('codeMirror').factory('codeMirrorErrors', [
    'codeMirror',
    '$timeout',
    function (codeMirror, $timeout) {
      var CodeMirror = codeMirror.CodeMirror;
      var GUTTER_ID = 'CodeMirror-lint-markers';
      var SEVERITIES = /^(?:error|warning)$/;
      var service = {};
      function showTooltip(content, node) {
        var tt = document.createElement('div');
        tt.className = 'CodeMirror-lint-tooltip';
        tt.appendChild(content.cloneNode(true));
        var offset = $(node).offset();
        tt.style.top = Math.max(0, offset.top - tt.offsetHeight - 5) + 'px';
        tt.style.left = offset.left + 20 + 'px';
        if (tt.style.opacity !== null) {
          tt.style.opacity = 1;
        }
        document.body.appendChild(tt);
        return tt;
      }
      function rm(elt) {
        if (elt.parentNode) {
          elt.parentNode.removeChild(elt);
        }
      }
      function hideTooltip(tt) {
        if (!tt.parentNode) {
          return;
        }
        if (tt.style.opacity === null) {
          rm(tt);
        }
        tt.style.opacity = 0;
        $timeout(function () {
          rm(tt);
        }, 200);
      }
      function showTooltipFor(content, node) {
        var tooltip = showTooltip(content, node);
        var errorNode = node;
        var openTrace = function (event) {
          hide(tooltip);
          var path = event.target.dataset.path;
          if (path) {
            var $scope = angular.element(errorNode).scope();
            $scope.$emit('event:raml-editor-file-select', path);
          }
        };
        function isMouseOverElement(element, e) {
          var left = $(element).offset().left;
          var right = left + $(element).outerWidth();
          var mouseOverX = left <= e.clientX && e.clientX <= right + 5;
          var top = $(element).offset().top;
          var bottom = top + $(element).outerHeight();
          var mouseOverY = top <= e.clientY && e.clientY <= bottom;
          return mouseOverX && mouseOverY;
        }
        function hide(e) {
          if (tooltip) {
            var mouseOverError = isMouseOverElement(errorNode, e);
            var mouseOverTooltip = isMouseOverElement(tooltip, e);
            if (!(mouseOverTooltip || mouseOverError)) {
              CodeMirror.off(tooltip, 'mousedown', openTrace);
              CodeMirror.off(document, 'mousemove', hide);
              hideTooltip(tooltip);
              tooltip = null;
            }
          }
        }
        var poll = setInterval(function () {
            if (tooltip) {
              for (var n = node;; n = n.parentNode) {
                if (n === document.body) {
                  return;
                }
                if (!n) {
                  hide();
                  break;
                }
              }
            } else {
              return clearInterval(poll);
            }
          }, 400);
        CodeMirror.on(tooltip, 'mousedown', openTrace);
        CodeMirror.on(document, 'mousemove', hide);
      }
      function clearMarks(cm) {
        cm.clearGutter(GUTTER_ID);
      }
      function getMaxSeverity(a, b) {
        return a === 'error' ? a : b;
      }
      function groupByLine(annotations) {
        var lines = [];
        for (var i = 0, len = annotations.length; i < len; ++i) {
          var annotation = annotations[i], line = annotation.line || 1;
          (lines[line] || (lines[line] = [])).push(annotation);
        }
        return lines;
      }
      function annotationTooltip(annotation) {
        var severity = annotation.severity;
        if (!SEVERITIES.test(severity)) {
          severity = 'error';
        }
        var tip = document.createElement('div');
        tip.className = 'CodeMirror-lint-message-' + severity;
        var message = annotation.message;
        // if error belongs to different file, add tracing information to message
        if (annotation.path) {
          message += ' at line ' + annotation.tracingLine + ' col ' + annotation.tracingColumn + ' in ' + '<a href="javascript:" data-path="/' + annotation.path + '">' + annotation.path + '</a>';
        }
        tip.innerHTML = '<p class=CodeMirror-tag-' + severity + '>' + severity + '</p>' + '<p class="CodeMirror-message">' + message + '</p>';
        return tip;
      }
      function makeMarker(labels, severity, multiple, tooltips, annotations) {
        var marker = document.createElement('div');
        var inner = marker;
        marker.className = 'CodeMirror-lint-marker-' + severity;
        if (multiple) {
          inner = marker.appendChild(document.createElement('div'));
          inner.className = 'CodeMirror-lint-marker-multiple';
        }
        if (tooltips !== false) {
          CodeMirror.on(inner, 'mouseenter', function () {
            showTooltipFor(labels, inner);
          });
        }
        //For testing automation purposes
        marker.setAttribute('data-marker-line', annotations[0].line);
        marker.setAttribute('data-marker-message', annotations[0].message);
        return marker;
      }
      service.displayAnnotations = function (annotationsNotSorted, editor) {
        editor = editor || codeMirror.getEditor();
        clearMarks(editor);
        var annotations = groupByLine(annotationsNotSorted);
        for (var line = 0; line < annotations.length; ++line) {
          var anns = annotations[line];
          if (!anns) {
            continue;
          }
          var maxSeverity = null;
          var tipLabel = document.createDocumentFragment();
          for (var i = 0; i < anns.length; ++i) {
            var ann = anns[i];
            var severity = ann.severity;
            if (!SEVERITIES.test(severity)) {
              severity = 'error';
            }
            maxSeverity = getMaxSeverity(maxSeverity, severity);
            tipLabel.appendChild(annotationTooltip(ann));
          }
          editor.setGutterMarker(line - 1, GUTTER_ID, makeMarker(tipLabel, maxSeverity, anns.length > 1, true, anns));
        }
      };
      service.clearAnnotations = function () {
        clearMarks(codeMirror.getEditor());
      };
      return service;
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('raml').value('snippets', {
    options: [
      'options:',
      '  description: <<insert text or markdown here>>'
    ],
    head: [
      'head:',
      '  description: <<insert text or markdown here>>'
    ],
    get: [
      'get:',
      '  description: <<insert text or markdown here>>'
    ],
    post: [
      'post:',
      '  description: <<insert text or markdown here>>'
    ],
    put: [
      'put:',
      '  description: <<insert text or markdown here>>'
    ],
    delete: [
      'delete:',
      '  description: <<insert text or markdown here>>'
    ],
    trace: [
      'trace:',
      '  description: <<insert text or markdown here>>'
    ],
    connect: [
      'connect:',
      '  description: <<insert text or markdown here>>'
    ],
    patch: [
      'patch:',
      '  description: <<insert text or markdown here>>'
    ],
    '<resource>': [
      '/newResource:',
      '  displayName: resourceName'
    ],
    title: ['title: My API'],
    version: ['version: v0.1'],
    baseuri: ['baseUri: http://server/api/{version}']
  }).factory('ramlSnippets', [
    'snippets',
    function (snippets) {
      var service = {};
      var emptyValues = [];
      var extendValue = ['extends'];
      var fragments = [
          {
            label: 'Trait',
            keyValues: emptyValues
          },
          {
            label: 'ResourceType',
            keyValues: emptyValues
          },
          {
            label: 'Library',
            keyValues: ['usage']
          },
          {
            label: 'Overlay',
            keyValues: extendValue
          },
          {
            label: 'Extension',
            keyValues: extendValue
          },
          {
            label: 'DataType',
            keyValues: emptyValues
          },
          {
            label: 'DocumentationItem',
            keyValues: [
              'title',
              'content'
            ]
          },
          {
            label: 'NamedExample',
            keyValues: ['value']
          },
          {
            label: 'AnnotationTypeDeclaration',
            keyValues: emptyValues
          },
          {
            label: 'SecurityScheme',
            keyValues: ['type']
          },
          {
            label: '',
            keyValues: ['title']
          }
        ];
      function getRequiredValuesForFragment(typedFragment) {
        return fragments.find(function (fragment) {
          return fragment.label === typedFragment;
        }).keyValues;
      }
      service.getEmptyRaml = function (ramlVersion, fragmentLabel) {
        var version = ramlVersion ? ramlVersion : '1.0';
        var type = fragmentLabel ? ' ' + fragmentLabel : '';
        var requiredValues = getRequiredValuesForFragment(fragmentLabel ? fragmentLabel : '');
        var ramlContent = ['#%RAML ' + version + type];
        requiredValues.forEach(function (value) {
          ramlContent.push(value + ':');
        });
        return ramlContent.join('\n');
      };
      service.getSnippet = function getSnippet(suggestion) {
        var key = suggestion.key;
        var metadata = suggestion.metadata || {};
        var snippet = snippets[key.toLowerCase()];
        if (snippet) {
          return snippet;
        }
        if (metadata.isText) {
          //For text elements that are part of an array
          //we do not add an empty line break:
          return suggestion.isList ? [key] : [
            key,
            ''
          ];
        }
        return [key + ':'];
      };
      return service;
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('codeMirror').value('highlightRootElement', function (name, titleClass, contentClass, state, level, key) {
    // Using one level of nesting nest (ie. [name + '.level']) instead of
    // [name].level to use default copy state function.
    if (level <= state[name + '.level']) {
      state[name + '.level'] = 0;
      state[name + '.inside'] = false;
    }
    if (name.indexOf(key) >= 0) {
      state[name + '.level'] = level;
      state[name + '.inside'] = true;
      return titleClass;
    }
    if (state[name + '.inside']) {
      return contentClass;
    }
    return false;
  }).value('booleanValues', [
    'true',
    'false'
  ]).factory('keywordRegex', [
    'booleanValues',
    function (booleanValues) {
      return new RegExp('\\b((' + booleanValues.join(')|(') + '))$', 'i');
    }
  ]).factory('token', [
    'keywordRegex',
    'highlightRootElement',
    'getLineIndent',
    'indentUnit',
    function (keywordRegex, highlightRootElement, getLineIndent, indentUnit) {
      return function (stream, state) {
        var ch = stream.peek();
        var esc = state.escaped;
        state.escaped = false;
        /* RAML tag */
        if (ch === '#' && /^#%RAML (0\.8|1\.0|1\.0\s\w+)$/.test(stream.string.trim())) {
          stream.skipToEnd();
          return 'raml-tag';
        }
        /* comments */
        if (ch === '#' && (stream.pos === 0 || /\s/.test(stream.string.charAt(stream.pos - 1)))) {
          stream.skipToEnd();
          return 'comment';
        }
        if (state.literal && stream.indentation() > state.keyCol) {
          stream.skipToEnd();
          return 'none';
        } else if (state.literal) {
          state.literal = false;
        }
        if (stream.sol()) {
          state.keyCol = 0;
          state.pair = false;
          state.pairStart = false;
          /* document start */
          if (stream.match(/---/)) {
            return 'def';
          }
          /* document end */
          if (stream.match(/\.\.\./)) {
            return 'def';
          }
          /* array list item */
          if (stream.match(/\s*-\s+/)) {
            return 'meta';
          }
        }
        /* pairs (associative arrays) -> key */
        if (!state.pair && stream.match(/^\s*([a-z0-9\?\/\{\}\._\-])+(?=\s*:)/i)) {
          var key = stream.string.replace(/^\s+|\s+$/g, '').split(':')[0];
          var sanitizedKey = key.slice(-1) === '?' ? key.slice(0, -1) : key;
          var level = getLineIndent(stream.string).tabCount;
          state.pair = true;
          state.keyCol = stream.indentation();
          if (stream.string.match(/^\s*\- /i)) {
            state.keyCol += indentUnit;
          }
          /* methods */
          if (level <= state.methodLevel || key.indexOf('/') === 0) {
            state.methodLevel = 0;
            state.insideMethod = false;
          }
          if ([
              'options',
              'get',
              'head',
              'post',
              'put',
              'delete',
              'trace',
              'connect',
              'patch'
            ].indexOf(sanitizedKey) !== -1) {
            state.methodLevel = level;
            state.insideMethod = true;
            return 'method-title';
          }
          if (state.insideMethod) {
            return 'method-content';
          }
          var rootElements = highlightRootElement('traits', 'trait-title', 'trait-content', state, level, key) || highlightRootElement('resourceTypes', 'resource-type-title', 'resource-type-content', state, level, key) || highlightRootElement('schemas', 'schema-title', 'schema-content', state, level, key) || highlightRootElement('securitySchemes', 'security-scheme-title', 'security-scheme-content', state, level, key);
          if (rootElements) {
            return rootElements;
          }
          /* resources */
          if (key.indexOf('/') === 0) {
            return 'resource';
          }
          return 'key';
        }
        if (state.pair && stream.match(/^:\s*/)) {
          state.pairStart = true;
          return 'meta';
        }
        /* inline pairs/lists */
        if (stream.match(/^(\{|\}|\[|\])/)) {
          if (ch === '{') {
            state.inlinePairs++;
          } else if (ch === '}') {
            state.inlinePairs--;
          } else if (ch === '[') {
            state.inlineList++;
          } else {
            state.inlineList--;
          }
          return 'meta';
        }
        /* list seperator */
        if (state.inlineList > 0 && !esc && ch === ',') {
          stream.next();
          return 'meta';
        }
        /* pairs seperator */
        if (state.inlinePairs > 0 && !esc && ch === ',') {
          state.keyCol = 0;
          state.pair = false;
          state.pairStart = false;
          stream.next();
          return 'meta';
        }
        /* start of value of a pair */
        if (state.pairStart) {
          /* block literals */
          if (stream.match(/^\s*(\||\>)\s*/)) {
            state.literal = true;
            return 'meta';
          }
          /* references */
          if (stream.match(/^\s*(\&|\*)[a-z0-9\._\-]+\b/i)) {
            return 'variable-2';
          }
          /* numbers */
          if (state.inlinePairs === 0 && stream.match(/^\s*-?[0-9\.\,]+\s?$/)) {
            return 'number';
          }
          if (state.inlinePairs > 0 && stream.match(/^\s*-?[0-9\.\,]+\s?(?=(,|\}))/)) {
            return 'number';
          }
          /* keywords */
          if (stream.match(keywordRegex)) {
            return 'keyword';
          }
        }
        /* nothing found, continue */
        state.pairStart = false;
        state.escaped = ch === '\\';
        stream.next();
        return null;
      };
    }
  ]).value('startState', function () {
    return {
      pair: false,
      pairStart: false,
      keyCol: 0,
      inlinePairs: 0,
      inlineList: 0,
      literal: false,
      escaped: false
    };
  }).factory('yamlMode', [
    'token',
    'startState',
    function (token, startState) {
      return function () {
        return {
          token: token,
          startState: startState
        };
      };
    }
  ]).run([
    'codeMirror',
    'yamlMode',
    function (codeMirror, yamlMode) {
      var CodeMirror = codeMirror.CodeMirror;
      CodeMirror.defineMode('yaml', yamlMode);
      CodeMirror.defineMIME('text/x-yaml', 'yaml');
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('codeMirror').factory('codeMirrorHighLight', [
    'indentUnit',
    function (indentUnit) {
      var mode = {};
      mode.highlight = function highlight(config) {
        mode.indentationOverlay = {
          token: function token(stream, state) {
            if (state.cutoff === undefined || stream.column() <= state.cutoff) {
              if (stream.match('  ')) {
                return 'indent indent-col-' + stream.column();
              } else if (stream.match(' ')) {
                return 'indent-incomplete';
              }
            }
            stream.skipToEnd();
          },
          startState: function startState() {
            return {};
          }
        };
        mode.yaml = CodeMirror.overlayMode(CodeMirror.getMode(config, 'yaml'), mode.indentationOverlay);
        mode.xml = CodeMirror.overlayMode(CodeMirror.getMode(config, 'xml'), mode.indentationOverlay);
        mode.json = CodeMirror.overlayMode(CodeMirror.getMode(config, {
          name: 'javascript',
          json: true
        }), mode.indentationOverlay);
        mode.markdown = CodeMirror.overlayMode(CodeMirror.getMode(config, 'gfm'), mode.indentationOverlay);
        return {
          startState: function startState() {
            return {
              token: mode._yaml,
              localMode: null,
              localState: null,
              yamlState: mode.yaml.startState()
            };
          },
          copyState: function copyState(state) {
            var local;
            if (state.localState) {
              local = CodeMirror.copyState(state.localMode, state.localState);
              if (!local.parentIndentation) {
                local.parentIndentation = state.localState.parentIndentation;
              }
            }
            return {
              token: state.token,
              localMode: state.localMode,
              localState: local,
              yamlState: CodeMirror.copyState(mode.yaml, state.yamlState)
            };
          },
          innerMode: function innerMode(state) {
            return {
              state: state.localState || state.yamlState,
              mode: state.localMode || mode.yaml
            };
          },
          token: function token(stream, state) {
            return state.token(stream, state);
          }
        };
      };
      mode._yaml = function (stream, state) {
        if (/(content|description):(\s?)\|/.test(stream.string)) {
          mode._setMode('markdown', stream, state);
        }
        if (/application\/json:/.test(stream.string)) {
          mode._setMode('json', stream, state, 2);
        }
        if (/text\/xml:/.test(stream.string)) {
          mode._setMode('xml', stream, state, 2);
        }
        return mode.yaml.token(stream, state.yamlState);
      };
      mode._xml = function (stream, state) {
        return mode._applyMode('xml', stream, state);
      };
      mode._json = function (stream, state) {
        return mode._applyMode('json', stream, state);
      };
      mode._markdown = function (stream, state) {
        return mode._applyMode('markdown', stream, state);
      };
      mode._setMode = function (modeName, stream, state, indent) {
        state.token = mode['_' + modeName];
        state.localMode = mode[modeName];
        state.localState = mode[modeName].startState();
        state.localState.parentIndentation = stream.indentation() + (indent || 0);
        if (stream.string.match(/^\s*\- /i)) {
          state.localState.parentIndentation += indentUnit;
        }
        if (modeName === 'markdown') {
          state.localState.base.parentIndentation = state.localState.parentIndentation;
        }
      };
      mode._applyMode = function (modeName, stream, state) {
        if (/(schema|example):(\s?)\|/.test(stream.string)) {
          return mode._yaml(stream, state);
        }
        if (stream.string.trim().length > 0 && stream.indentation() <= state.localState.parentIndentation) {
          state.token = mode._yaml;
          state.localState = state.localMode = null;
          return mode._yaml(stream, state);
        }
        state.localState.overlay.cutoff = state.localState.parentIndentation;
        return mode[modeName].token(stream, state.localState);
      };
      return mode;
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('fs', [
    'raml',
    'utils'
  ]).provider('ramlRepositoryConfig', function ramlRepositoryConfigProvider() {
    this.reloadFilesOnSave = false;
    this.$get = function ramlRepositoryConfig() {
      return { reloadFilesOnSave: this.reloadFilesOnSave };
    };
    return this;
  }).factory('ramlRepositoryElements', function () {
    function RamlFile(path, contents, options) {
      options = options || {};
      // remove the trailing slash to path if it exists
      if (path.slice(-1) === '/' && path.length > 1) {
        path = path.slice(0, -1);
      }
      this.type = 'file';
      this.path = path;
      this.name = path.slice(path.lastIndexOf('/') + 1);
      this.isDirectory = false;
      // extract extension
      if (this.name.lastIndexOf('.') > 0) {
        this.extension = this.name.slice(this.name.lastIndexOf('.') + 1);
      }
      this.contents = contents || '';
      this.persisted = options.persisted || false;
      this.dirty = options.dirty || !this.persisted;
      this.root = options.root;
    }
    RamlFile.prototype.copyTo = function copyTo(other) {
      other.contents = this.contents;
      other.persisted = this.persisted;
      other.loaded = this.loaded;
      other.dirty = this.dirty;
      other.doc = this.doc;
      return other;
    };
    RamlFile.prototype.clear = function clear() {
      this.dirty = false;
      this.persisted = true;
      this.loaded = false;
      this.contents = undefined;
      this.doc = undefined;
      return this;
    };
    function RamlDirectory(path, meta, children) {
      // remove the trailing slash to path if it exists
      if (path.slice(-1) === '/' && path.length > 1) {
        path = path.slice(0, -1);
      }
      children = children || [];
      this.type = 'directory';
      this.path = path;
      this.name = path.slice(path.lastIndexOf('/') + 1);
      this.meta = meta;
      this.collapsed = true;
      this.isDirectory = true;
      this.setChildren(children);
    }
    RamlDirectory.prototype.getDirectories = function getDirectories() {
      return this.children.filter(function (t) {
        return t.isDirectory;
      });
    };
    RamlDirectory.prototype.getFiles = function getFiles() {
      return this.children.filter(function (t) {
        return !t.isDirectory;
      });
    };
    RamlDirectory.prototype.forEachChildDo = function forEachChildDo(action) {
      this.listAllDescendants().forEach(action);
    };
    RamlDirectory.prototype.listAllDescendants = function listAllDescendants() {
      function listFor(directory, descendants) {
        if (!directory.isDirectory || !directory.children) {
          return descendants;
        }
        var newDescendants = descendants.concat(directory.children);
        return directory.children.filter(function (child) {
          return child && child.isDirectory;
        }).reduce(function (result, child) {
          return listFor(child, result);
        }, newDescendants);
      }
      return listFor(this, []);
    };
    RamlDirectory.prototype.sortChildren = function sortChildren() {
      this.children.sort(sortingFunction);
    };
    RamlDirectory.prototype.setChildren = function setChildren(children) {
      function notMetaFile(file) {
        return file.path.slice(-5) !== '.meta';
      }
      var separated = {
          folder: [],
          file: []
        };
      children.forEach(function (entry) {
        separated[entry.type || 'file'].push(entry);
      });
      var files = separated.file.filter(notMetaFile).map(function (file) {
          return new RamlFile(file.path, file.contents, {
            dirty: false,
            persisted: true,
            root: file.root
          });
        });
      var directories = separated.folder.map(function (directory) {
          return new RamlDirectory(directory.path, directory.meta, directory.children);
        });
      this.children = directories.concat(files).sort(sortingFunction);
    };
    /**
       * Function used to compare two ramlFile/ramlDirectory.
       * Sorting policy:
       * - Directories comes before files
       * - Sort file/directories alphabetically
       *
       * @returns {Integer} If the returned value is less than 0, sort a to a lower index than b, vice versa
       */
    function sortingFunction(a, b) {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      } else {
        return a.isDirectory ? -1 : 1;
      }
    }
    return {
      RamlDirectory: RamlDirectory,
      RamlFile: RamlFile,
      sortingFunction: sortingFunction
    };
  }).factory('ramlRepository', [
    '$q',
    '$rootScope',
    'ramlRepositoryConfig',
    'ramlRepositoryElements',
    'ramlSnippets',
    'fileSystem',
    function ($q, $rootScope, ramlRepositoryConfig, ramlRepositoryElements, ramlSnippets, fileSystem) {
      var RamlDirectory = ramlRepositoryElements.RamlDirectory;
      var RamlFile = ramlRepositoryElements.RamlFile;
      var sortingFunction = ramlRepositoryElements.sortingFunction;
      var service = {};
      var BASE_PATH = '/';
      // service.rootFile
      service.supportsFolders = fileSystem.supportsFolders || false;
      function handleErrorFor(file) {
        return function markFileWithError(error) {
          file.error = error;
          throw error;
        };
      }
      function findInsertIndex(source, dest) {
        var low = 0, high = dest.children.length - 1, mid;
        while (high >= low) {
          mid = Math.floor((low + high) / 2);
          if (sortingFunction(dest.children[mid], source) > 0) {
            high = mid - 1;
          } else {
            low = mid + 1;
          }
        }
        return low;
      }
      function insertFileSystem(parent, child) {
        // This assumes the paths are correct.
        var before = parent.path === '/' ? [''] : parent.path.split('/');
        var parts = child.path.split('/').slice(0, -1);
        var promise = $q.when(parent);
        parts.slice(before.length).forEach(function (part) {
          promise = promise.then(function (parent) {
            var path = service.join(parent.path, part);
            var exists = service.getByPath(path);
            // If the current path already exists.
            if (exists) {
              if (!exists.isDirectory) {
                return $q.reject(new Error('Can not create directory, file already exists: ' + path));
              }
              return exists;
            }
            return service.createDirectory(parent, part);
          });
        });
        return promise.then(function (parent) {
          var exists = service.getByPath(child.path);
          if (exists) {
            if (exists.isDirectory && child.isDirectory) {
              return exists;
            }
            return $q.reject(new Error('Path already exists: ' + child.path));
          }
          parent.children.splice(findInsertIndex(child, parent), 0, child);
          return child;
        });
      }
      // this function takes a target(ramlFile/ramlDirectory) and a name(String) as input
      // and returns the new path(String) after renaming the target
      function generateNewName(target, newName) {
        var parentPath = target.path.slice(0, target.path.lastIndexOf('/'));
        return parentPath + '/' + newName;
      }
      // Expose the sorting function
      service.sortingFunction = sortingFunction;
      // Returns the parent directory object of a file or a directory
      service.getParent = function getParent(target) {
        var path = target.path.slice(0, target.path.lastIndexOf('/'));
        if (path.length === 0) {
          path = '/';
        }
        return service.getByPath(path);
      };
      service.canExport = function canExport() {
        return fileSystem.hasOwnProperty('exportFiles');
      };
      service.exportFiles = function exportFiles() {
        return fileSystem.exportFiles();
      };
      service.createDirectory = function createDirectory(parent, name) {
        var path = service.join(parent.path, name);
        var directory = new RamlDirectory(path);
        var exists = service.getByPath(path);
        // If the file already exists, return it.
        if (exists) {
          return $q.when(exists);
        }
        return insertFileSystem(parent, directory).then(function () {
          return fileSystem.createFolder(directory.path);
        }).then(function () {
          return directory;
        });
      };
      service.generateDirectory = function createDirectory(parent, name) {
        return service.createDirectory(parent, name).then(function (directory) {
          $rootScope.$broadcast('event:raml-editor-directory-created', directory);
          return directory;
        });
      };
      // Loads the directory from the fileSystem into memory
      service.loadDirectory = function loadDirectory() {
        var _this = this;
        return fileSystem.directory(BASE_PATH).then(function (directory) {
          _this.rootFile = new RamlDirectory(directory.path, directory.meta, directory.children);
          return _this.rootFile;
        });
      };
      service.loadAndUpdateDirectory = function loadAndUpdateDirectory() {
        return fileSystem.directory(BASE_PATH).then(this.updateDirectory.bind(this));
      };
      service.updateDirectory = function updateDirectory(directory) {
        var dirtyFiles = new Map(this.rootFile.listAllDescendants().filter(function (element) {
            return element && !element.isDirectory && element.dirty;
          }).map(function (element) {
            return [
              element.path,
              element
            ];
          }));
        this.rootFile.setChildren(directory.children);
        this.rootFile.listAllDescendants().forEach(function (element) {
          var path = element.path;
          if (dirtyFiles.has(path)) {
            dirtyFiles.get(path).copyTo(element);
          }
        });
      };
      service.removeDirectory = function removeDirectory(directory) {
        // recursively remove all the child directory and files
        // and collect all promises into an array
        var promises = [];
        directory.getDirectories().forEach(function (dir) {
          promises.push(service.removeDirectory(dir));
        });
        directory.getFiles().forEach(function (file) {
          promises.push(service.removeFile(file));
        });
        // remove this directory object from parent's children list
        var parent = service.getParent(directory);
        var index = parent.children.indexOf(directory);
        if (index !== -1) {
          parent.children.splice(index, 1);
        }
        // make sure all children is removed from FS before we remove ourselves
        return $q.all(promises).then(function () {
          return fileSystem.remove(directory.path);
        }).then(function (directory) {
          $rootScope.$broadcast('event:raml-editor-directory-removed', directory);
        });
      };
      service.renameDirectory = function renameDirectory(directory, newName) {
        var newPath = generateNewName(directory, newName);
        var promise = fileSystem.rename(directory.path, newPath);
        // renames the path of each child under the current directory
        directory.forEachChildDo(function (c) {
          c.path = c.path.replace(directory.path, newPath);
        });
        return promise.then(function () {
          directory.name = newName;
          directory.path = newPath;
          $rootScope.$broadcast('event:raml-editor-filetree-modified', directory);
          return directory;
        }, handleErrorFor(directory));
      };
      service.saveFile = function saveFile(file) {
        return this.saveAndUpdate([file], file, ramlRepositoryConfig.reloadFilesOnSave);
      };
      service.saveAllFiles = function saveAllFiles(currentFile) {
        var filesToBeSaved = this.rootFile.listAllDescendants().filter(function (element) {
            return !element.isDirectory && element.dirty;
          });
        return this.saveAndUpdate(filesToBeSaved, currentFile, ramlRepositoryConfig.reloadFilesOnSave);
      };
      /**
         *  Saves all the files and, id 'update' is true, updates the directory and the file.
         *  It returns the file, updated if it corresponds.
         */
      service.saveAndUpdate = function saveAndUpdate(files, file, update) {
        if (update) {
          return this.saveAndUpdateRoot(files).then(this.loadFile.bind(this, file));
        } else {
          return saveFiles(files).then(function () {
            return file;
          });
        }
      };
      service.saveAndUpdateRoot = function (files) {
        var _this = this;
        function updateRootDirectory(directory) {
          return directory ? _this.updateDirectory(directory) : _this.loadAndUpdateDirectory();
        }
        return saveFiles(files).then(updateRootDirectory);
      };
      /**
         *  Saves all the files and returns a Promise with the root directory or undefined,
         *  it depend on the version of the file system.
         */
      function saveFiles(files) {
        function clearFiles(directory) {
          files.forEach(function (file) {
            file.clear();
          });
          return directory;
        }
        if (!files || files.length === 0) {
          return Promise.resolve();
        }
        if (files.length === 1) {
          return saveSingleFile(files[0]);
        }
        function pathContentObject(file) {
          return {
            path: file.path,
            content: file.contents
          };
        }
        var directory;
        if (fileSystem.saveAll) {
          directory = fileSystem.saveAll(files.map(pathContentObject));
        } else {
          directory = Promise.all(files.map(saveSingleFile)).then(function (results) {
            return results[0];
          });
        }
        return directory.then(clearFiles);
      }
      /**
         *  Saves the file and returns the content of the directory or undefined,
         *  it depend on the version of the file system.
         */
      function saveSingleFile(file) {
        function clearFile(directory) {
          file.clear();
          return directory;
        }
        return fileSystem.save(file.path, file.contents).then(clearFile);
      }
      service.renameFile = function renameFile(file, newName) {
        var newPath = generateNewName(file, newName);
        var promise = file.persisted ? fileSystem.rename(file.path, newPath) : $q.when(file);
        function modifyFile() {
          file.name = newName;
          file.path = newPath;
          $rootScope.$broadcast('event:raml-editor-filetree-modified', file);
          return file;
        }
        return promise.then(modifyFile, handleErrorFor(file));
      };
      service.loadFile = function loadFile(file) {
        function modifyFile(data) {
          file.dirty = false;
          file.persisted = true;
          file.loaded = true;
          file.contents = data;
          return file;
        }
        return fileSystem.load(file.path).then(modifyFile, handleErrorFor(file));
      };
      service.removeFile = function removeFile(file) {
        var promise;
        var parent = service.getParent(file);
        function modifyFile() {
          file.dirty = false;
          file.persisted = false;
          return Object.freeze(file);
        }
        // call to file system only when file is persisted
        // otherwise it's unknown because it's never been saved
        if (file.persisted) {
          promise = fileSystem.remove(file.path);
        } else {
          promise = $q.when(file);
        }
        return promise.then(modifyFile, handleErrorFor(file)).then(function () {
          // remove the file object from the parent's children list
          var index = parent.children.indexOf(file);
          if (index !== -1) {
            parent.children.splice(index, 1);
          }
          $rootScope.$broadcast('event:raml-editor-file-removed', file);
        });
      };
      service.createFile = function createFile(parent, name) {
        var path = service.join(parent.path, name);
        var file = new RamlFile(path);
        return insertFileSystem(parent, file).then(function () {
          $rootScope.$broadcast('event:raml-editor-file-created', file);
          return file;
        });
      };
      service.generateFile = function generateFile(parent, name, ramlVersion, fragmentLabel) {
        return service.createFile(parent, name).then(function (file) {
          if (file.extension === 'raml') {
            file.contents = ramlSnippets.getEmptyRaml(ramlVersion, fragmentLabel);
          }
          $rootScope.$broadcast('event:raml-editor-file-generated', file);
          return file;
        });
      };
      // Gets the ramlDirectory/ramlFile object by path from the memory
      service.getByPath = function getByPath(path) {
        // Nothing to do if no path
        if (!path) {
          return;
        }
        if (path === '/') {
          return this.rootFile;
        }
        path = path.replace(/\/$/, '');
        var queue = this.rootFile.children.slice();
        var current;
        while (queue.length) {
          current = queue.shift();
          if (current.path === path) {
            return current;
          }
          if (current.isDirectory) {
            queue = queue.concat(current.children);
          }
        }
      };
      service.rename = function rename(target, newName) {
        return target.isDirectory ? service.renameDirectory(target, newName) : service.renameFile(target, newName);
      };
      service.remove = function remove(target) {
        return target.isDirectory ? service.removeDirectory(target) : service.removeFile(target);
      };
      // move a file or directory to a specific destination
      // destination must be a ramlDirectory
      service.move = function move(target, destination) {
        if (!destination.isDirectory) {
          return;
        }
        var newPath = service.join(destination.path, target.name);
        var promise;
        if (target.isDirectory) {
          promise = fileSystem.rename(target.path, newPath);
          // renames the path of each child under the current directory
          target.forEachChildDo(function (c) {
            c.path = c.path.replace(target.path, newPath);
          });
        } else {
          promise = target.persisted ? fileSystem.rename(target.path, newPath) : $q.when(target);
        }
        return promise.then(function () {
          target.path = newPath;
          return target;
        }, handleErrorFor(target));
      };
      service.saveMeta = function saveMeta(file, meta) {
        var metaFile = new RamlFile(file.path + '.meta', JSON.stringify(meta));
        return service.saveFile(metaFile).then(function () {
          return meta;
        });
        ;
      };
      service.loadMeta = function loadMeta(file) {
        var metaFile = new RamlFile(file.path + '.meta');
        return service.loadFile(metaFile).then(function success(file) {
          return JSON.parse(file.contents);
        }, function failure() {
          return {};
        });
      };
      service.join = function () {
        return Array.prototype.reduce.call(arguments, function (path, segment) {
          if (segment == null) {
            return path;
          }
          if (segment.charAt(0) === '/') {
            return segment;
          }
          return path.replace(/\/$/, '') + '/' + segment;
        }, '/');
      };
      return service;
    }
  ]);
  ;
}());
'use strict';
// Util Functions
function range(start, stop) {
  var result = new Array(stop - start + 1);
  for (var i = start; i <= stop; i++) {
    result[i - start] = i;
  }
  return result;
}
// end Util Functions
var FSResolver = function (homeDirectory, ramlRepository) {
  this.parsePath = function (path) {
    return path.split('/').filter(function (pathMember) {
      return pathMember && pathMember !== '';
    });
  };
  this.getElement = function (path) {
    var pathMembers = this.parsePath(path);
    return this.getElementFromPath(pathMembers, 0, homeDirectory);
  };
  this.getElementFromPath = function (pathMembers, index, element) {
    if (pathMembers.length === index) {
      return element;
    }
    if (!element.isDirectory) {
      return undefined;
    }
    var child = this.getChild(element, pathMembers[index]);
    if (!child) {
      return child;
    }
    return this.getElementFromPath(pathMembers, index + 1, child);
  };
  this.getChild = function (directory, childName) {
    return directory.children.find(function (child) {
      return child.name === childName;
    });
  };
  this.getFileContentAsync = function (file) {
    if (file.loaded) {
      if (file.doc) {
        return Promise.resolve(file.doc.getValue());
      }
      if (file.contents) {
        return Promise.resolve(file.contents);
      }
    }
    var getFileContent = function (file) {
      return file.contents;
    };
    return ramlRepository.loadFile(file).then(getFileContent);
  };
  this.contentAsync = function (path) {
    var element = this.getElement(path);
    if (!element || element.isDirectory) {
      return Promise.resolve('');
    }
    return this.getFileContentAsync(element);
  };
  this.list = function (path) {
    var element = this.getElement(path);
    if (!element || !element.isDirectory) {
      return [];
    }
    return element.children.map(function (child) {
      return child.name;
    });
  };
  this.listAsync = function (path) {
    return Promise.resolve(this.list(path));
  };
  this.exists = function (path) {
    return this.getElement(path) ? true : false;
  };
  this.existsAsync = function (path) {
    return Promise.resolve(this.exists(path));
  };
  this.dirname = function (path) {
    var element = this.getElement(path);
    if (!element) {
      return '';
    }
    if (element.isDirectory) {
      return element.path;
    }
    var result = path.substring(0, path.lastIndexOf('/') + 1);
    return result || '';
  };
  this.resolve = function (contextPath, relativePath) {
    if (relativePath.startsWith('/')) {
      return relativePath;
    }
    var pathBeginning = contextPath.endsWith('/') ? contextPath : contextPath + '/';
    return pathBeginning + relativePath;
  };
  this.extname = function (path) {
    var element = this.getElement(path);
    if (!element || element.isDirectory) {
      return '';
    }
    var nameParts = element.name.split('.');
    if (nameParts.length <= 1) {
      return '';
    }
    return nameParts[nameParts.length - 1];
  };
  this.isDirectory = function (path) {
    var element = this.getElement(path);
    return element && element.isDirectory ? true : false;
  };
  this.isDirectoryAsync = function (path) {
    return Promise.resolve(this.isDirectory(path));
  };
};
var EditorStateProvider = function (fsResolver, path, editor) {
  function sum(total, size) {
    return total + size;
  }
  this.getText = function () {
    return editor.getValue();
  };
  this.getPath = function () {
    return path;
  };
  this.getBaseName = function () {
    var element = fsResolver.getElement(path);
    return element ? element.name : '';
  };
  var calcOffset = function (editor) {
    var cursor = editor.getCursor();
    var allPreviewsLinesSize = range(0, cursor.line - 1).map(function (index) {
        return editor.getLine(index).length + 1;
      }).reduce(sum, 0);
    return allPreviewsLinesSize + cursor.ch;
  };
  this.offset = calcOffset(editor);
  this.getOffset = function () {
    return this.offset;
  };
};
angular.module('ramlEditorApp').factory('ramlSuggest', [
  'ramlRepository',
  'ramlEditorMainHelpers',
  function (ramlRepository, ramlEditorMainHelpers) {
    this.FSResolver = FSResolver;
    this.EditorStateProvider = EditorStateProvider;
    function codemirrorHint(editor, suggestions) {
      var separator = /:?(:|\s|\.|\[|]|-)+|!/;
      var currentPrefix = function (line, ch) {
        if (!line) {
          return '';
        }
        var split = line.slice(0, ch).split(separator);
        return split[split.length - 1];
      };
      var currentSufix = function (line, ch) {
        if (!line) {
          return '';
        }
        var split = line.slice(ch).split(separator);
        return split[0];
      };
      var render = function (element, self, data) {
        element.innerHTML = [
          '<div>',
          data.displayText,
          '</div>',
          '<div class="category">',
          data.category,
          '</div>'
        ].join('');
      };
      var codemirrorSuggestion = function (suggestion) {
        return {
          displayText: suggestion.displayText || suggestion.text,
          text: suggestion.text,
          category: suggestion.category,
          render: render
        };
      };
      function isWordPartOfTheSuggestion(word, suggestion) {
        if (!word) {
          return true;
        }
        var lowerCaseText = suggestion.text.toLowerCase();
        return lowerCaseText.startsWith(word) && lowerCaseText !== word;
      }
      var cursor = editor.getCursor();
      var line = editor.getLine(cursor.line);
      var ch = cursor.ch;
      var prefix = currentPrefix(line, ch) || '';
      var suffix = currentSufix(line, ch);
      var word = prefix + suffix;
      var lowerCaseWord = word.toLowerCase();
      var toCh = editor.getLine(cursor.line).length;
      var fromCh = ch - prefix.length;
      var codeMirrorSuggestions = suggestions.filter(function (suggestion) {
          return isWordPartOfTheSuggestion(lowerCaseWord, suggestion);
        }).map(codemirrorSuggestion);
      return {
        word: word,
        list: codeMirrorSuggestions,
        from: CodeMirror.Pos(cursor.line, fromCh),
        to: CodeMirror.Pos(cursor.line, toCh)
      };
    }
    function beautifyCategoryName(suggestion) {
      if (suggestion.category === undefined || suggestion.category.toLowerCase() === 'unknown') {
        suggestion.category = 'others';
      }
      return suggestion;
    }
    function ensureTextFieldNotUndefined(suggestion) {
      suggestion.text = suggestion.text || suggestion.displayText || '';
      return suggestion;
    }
    function addTextSnippets(editor, suggestions) {
      var ch = editor.getCursor().ch;
      var addNewResource = suggestions.length > 0 && (ch === 0 || suggestions.find(function (s) {
          return s.category === 'methods' ? s : null;
        }));
      if (addNewResource && ramlEditorMainHelpers.isApiDefinition(editor.getValue())) {
        var prefix = addNewResource.replacementPrefix || '';
        var spaces = '\n' + new Array(ch - prefix.length + 1).join(' ') + '  ';
        return suggestions.concat({
          text: '/newResource:' + spaces + 'displayName: resourceName' + spaces,
          displayText: 'New Resource',
          category: 'resources',
          replacementPrefix: prefix
        });
      }
      return suggestions;
    }
    this.getSuggestions = function (homeDirectory, currentFile, editor) {
      var ramlSuggestions = RAML.Suggestions;
      var fsResolver = new FSResolver(homeDirectory, ramlRepository);
      var contentProvider = ramlSuggestions.getContentProvider(fsResolver);
      var editorStateProvider = new EditorStateProvider(fsResolver, currentFile.path, editor);
      return ramlSuggestions.suggestAsync(editorStateProvider, contentProvider).then(function (result) {
        return Array.isArray(result) ? result : [];
      }, function () {
        return [];
      }).then(function (suggestions) {
        return suggestions.map(beautifyCategoryName);
      }).then(function (suggestions) {
        return suggestions.map(ensureTextFieldNotUndefined);
      }).then(function (suggestions) {
        return addTextSnippets(editor, suggestions);
      });
    };
    // class methods
    this.suggest = function (homeDirectory, currentFile, editor) {
      return this.getSuggestions(homeDirectory, currentFile, editor);
    };
    this.autocompleteHelper = function (editor, callback, options, homeDirectory, currentFile) {
      if (!homeDirectory || !currentFile) {
        var $scope = angular.element(editor.getInputField()).scope();
        homeDirectory = homeDirectory || $scope.homeDirectory;
        currentFile = currentFile || $scope.fileBrowser.selectedFile;
      }
      this.getSuggestions(homeDirectory, currentFile, editor).then(function (suggestions) {
        return codemirrorHint(editor, suggestions);
      }).then(function (codemirrorHint) {
        callback(codemirrorHint);
      });
    };
    return this;
  }
]);
(function () {
  'use strict';
  function FileSystem() {
  }
  FileSystem.prototype = {
    directory: function (fullpath) {
      throw 'Not implemented: FileSystem list invoked with [fullpath=' + fullpath + ']';
    },
    save: function (fullpath, content) {
      throw 'Not implemented: FileSystem save invoked with [fullpath=' + fullpath + '] and [content=' + content + ']';
    },
    saveAll: function (contents) {
      throw 'Not implemented: FileSystem save all invoked with [contents=' + contents + ']';
    },
    createFolder: function (fullpath) {
      throw 'Not implemented: FileSystem createFolder invoked with [fullpath=' + fullpath + ']';
    },
    load: function (fullpath) {
      throw 'Not implemented: FileSystem load invoked with [fullpath=' + fullpath + ']';
    },
    remove: function (fullpath) {
      throw 'Not implemented: FileSystem remove invoked with [fullpath=' + fullpath + ']';
    },
    rename: function (source, destination) {
      throw 'Not implemented: FileSystem rename invoked with [source=' + source + '] and [destination=' + destination + ']';
    }
  };
  angular.module('fs').provider('fileSystem', function fileSystemProvider() {
    this.hasFactory = false;
    this.setFileSystemFactory = function (fileSystemFactory) {
      this.$get = fileSystemFactory;
      this.hasFactory = true;
    };
    this.$get = function () {
      return new FileSystem();
    };
    return this;
  });
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('newFileService', [
    'ramlRepository',
    'newNameModal',
    '$rootScope',
    'generateName',
    function newFolderService(ramlRepository, newNameModal, $rootScope, generateName) {
      var self = this;
      var specUrl = 'https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md#';
      self.files = {
        '0.8': {
          '': {
            label: '',
            name: 'API Spec',
            description: 'RAML 0.8 API Spec.',
            spec: 'https://github.com/raml-org/raml-spec/blob/master/versions/raml-08/raml-08.md'
          }
        },
        '1.0': {
          '': {
            label: '',
            name: 'API Spec',
            description: 'RAML 1.0 API Spec.',
            spec: specUrl + 'the-root-of-the-document'
          },
          'Trait': {
            label: 'Trait',
            name: 'Trait',
            description: 'Define a single trait with common characteristics for methods.',
            spec: specUrl + 'resource-types-and-traits'
          },
          'ResourceType': {
            label: 'ResourceType',
            name: 'Resource Type',
            description: 'Define a single resource type with common characteristics for resources.',
            spec: specUrl + 'resource-types-and-traits'
          },
          'Library': {
            label: 'Library',
            name: 'Library',
            description: 'Define a collection of data type declarations, resource type declarations, trait declarations, and security scheme declarations into modular, externalized, reusable groups.',
            spec: specUrl + 'libraries'
          },
          'Overlay': {
            label: 'Overlay',
            name: 'Overlay',
            description: 'Define an overlay that adds or overrides nodes of a RAML API definition while preserving its behavioral, functional aspects.',
            spec: specUrl + 'overlays'
          },
          'Extension': {
            label: 'Extension',
            name: 'Extension',
            description: 'Define an extension that adds or modifies nodes of a RAML API definition.',
            spec: specUrl + 'extensions'
          },
          'DataType': {
            label: 'DataType',
            name: 'Type',
            description: 'Define a single data type declaration.',
            spec: specUrl + 'raml-data-types'
          },
          'DocumentationItem': {
            label: 'DocumentationItem',
            name: 'User Documentation',
            description: 'Define a single page documentation item.',
            spec: specUrl + 'user-documentation'
          },
          'NamedExample': {
            label: 'NamedExample',
            name: 'Example',
            description: 'Define a single example for a given data type.',
            spec: specUrl + 'defining-examples-in-raml'
          },
          'AnnotationTypeDeclaration': {
            label: 'AnnotationTypeDeclaration',
            name: 'Annotation',
            description: 'Define a single annotation type declaration that describes additional metadata that can be applied to any RAML node.',
            spec: specUrl + 'annotations'
          },
          'SecurityScheme': {
            label: 'SecurityScheme',
            name: 'Security Scheme',
            description: 'Define a single security scheme that describes the mechanism to secure data access, identify requests, and determine access level and data visibility.',
            spec: specUrl + 'security-schemes'
          }
        }
      };
      function nameSuggestion(target, fragment, fragmentLabel) {
        var names = target.children.map(function (file) {
            return file.name;
          });
        var defaultName = (fragment.label !== '' ? fragmentLabel : 'api') + '-';
        return generateName(names, defaultName, 'raml');
      }
      self.prompt = function prompt(target, ramlVersion, fragmentLabel) {
        var parent = target.isDirectory ? target : ramlRepository.getParent(target);
        var validations = [{
              message: 'That file name is already taken.',
              validate: function (input) {
                var path = ramlRepository.join(parent.path, input);
                return !ramlRepository.getByPath(path);
              }
            }];
        var label = fragmentLabel ? fragmentLabel : '';
        var fragment = self.files[ramlVersion][label];
        var suggestedName = nameSuggestion(target, fragment, fragmentLabel);
        var title = 'Add new ' + fragment.name + ' file';
        return newNameModal.open(fragment.description, suggestedName, validations, title, fragment.spec).then(function (name) {
          // Need to catch errors from `generateFile`, otherwise
          // `newNameModel.open` will error random modal close strings.
          return ramlRepository.generateFile(parent, name, ramlVersion, label).catch(function (err) {
            return $rootScope.$broadcast('event:notification', {
              message: err.message,
              expires: true,
              level: 'error'
            });
          });
        });
      };
      self.newFragmentFile = function newFragmentFile(homeDirectory, fragmentType) {
        if (fragmentType === '') {
          return self.prompt(homeDirectory, '1.0');
        }
        return self.prompt(homeDirectory, '1.0', fragmentType);
      };
      self.newFile = function newFile(homeDirectory, version) {
        return self.prompt(homeDirectory, version);
      };
      return self;
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('newFolderService', [
    'ramlRepository',
    'newNameModal',
    function newFolderService(ramlRepository, newNameModal) {
      var self = this;
      self.prompt = function prompt(target) {
        var parent = target.isDirectory ? target : ramlRepository.getParent(target);
        var message = 'Input a name for your new folder:';
        var title = 'Add a new folder';
        var validations = [{
              message: 'That folder name is already taken.',
              validate: function (input) {
                var path = ramlRepository.join(parent.path, input);
                return !ramlRepository.getByPath(path);
              }
            }];
        return newNameModal.open(message, '', validations, title).then(function (name) {
          return ramlRepository.generateDirectory(parent, name);
        });
      };
      return self;
    }
  ]);
  ;
}());
(function () {
  'use strict';
  function localStorageFileSystemFactory($window, $q, $prompt, $timeout, localStorageHelper, FOLDER) {
    function fileNotFoundMessage(path) {
      return 'file with path="' + path + '" does not exist';
    }
    function addChildren(entry, fn) {
      if (entry.type === FOLDER) {
        entry.children = fn(entry.path);
      }
    }
    function findFolder(path) {
      var entries = [];
      localStorageHelper.forEach(function (entry) {
        if (entry.path.toLowerCase() === path.toLowerCase()) {
          addChildren(entry, findFiles);
          entries.push(entry);
        }
      });
      return entries.length > 0 ? entries[0] : null;
    }
    function findFiles(path) {
      if (path.lastIndexOf('/') !== path.length - 1) {
        path += '/';
      }
      var entries = [];
      localStorageHelper.forEach(function (entry) {
        if (entry.path.toLowerCase() !== path.toLowerCase() && extractParentPath(entry.path) + '/' === path) {
          addChildren(entry, findFiles);
          entries.push(entry);
        }
      });
      return entries;
    }
    /**
     *
     * Save in localStorage entries.
     *
     * File structure are objects that contain the following attributes:
     * * path: The full path (including the filename).
     * * content: The content of the file (only valid for files).
     * * isFolder: A flag that indicates whether is a folder or file.
     */
    var service = {};
    var delay = 500;
    service.supportsFolders = true;
    function validatePath(path) {
      if (path.indexOf('/') !== 0) {
        return {
          valid: false,
          reason: 'Path should start with "/"'
        };
      }
      return { valid: true };
    }
    function isValidParent(path) {
      var parent = extractParentPath(path);
      if (!localStorageHelper.has(parent) && parent !== '') {
        return false;
      }
      return true;
    }
    function hasChildrens(path) {
      var has = false;
      localStorageHelper.forEach(function (entry) {
        if (entry.path.indexOf(path + '/') === 0) {
          has = true;
        }
      });
      return has;
    }
    function extractNameFromPath(path) {
      var pathInfo = validatePath(path);
      if (!pathInfo.valid) {
        throw 'Invalid Path!';
      }
      // When the path is ended in '/'
      if (path.lastIndexOf('/') === path.length - 1) {
        path = path.slice(0, -1);
      }
      return path.slice(path.lastIndexOf('/') + 1);
    }
    function extractParentPath(path) {
      var pathInfo = validatePath(path);
      if (!pathInfo.valid) {
        throw 'Invalid Path!';
      }
      // When the path is ended in '/'
      if (path.lastIndexOf('/') === path.length - 1) {
        path = path.slice(0, -1);
      }
      return path.slice(0, path.lastIndexOf('/'));
    }
    /**
     * List files found in a given path.
     */
    service.directory = function (path) {
      var deferred = $q.defer();
      $timeout(function () {
        var isValidPath = validatePath(path);
        if (!isValidPath.valid) {
          deferred.reject(isValidPath.reason);
          return deferred.promise;
        }
        if (!localStorageHelper.has('/')) {
          localStorageHelper.set(path, {
            path: '/',
            name: '',
            type: 'folder',
            meta: { 'created': Math.round(new Date().getTime() / 1000) }
          });
        }
        deferred.resolve(findFolder(path));
      }, delay);
      return deferred.promise;
    };
    /**
     * Persist a file to an existing folder.
     */
    service.save = function (path, content) {
      var deferred = $q.defer();
      $timeout(function () {
        var name = extractNameFromPath(path);
        var entry = localStorageHelper.get(path);
        if (!isValidParent(path)) {
          deferred.reject(new Error('Parent folder does not exists: ' + path));
          return deferred.promise;
        }
        var file = {};
        if (entry) {
          if (entry.type === FOLDER) {
            deferred.reject('file has the same name as a folder');
            return deferred.promise;
          }
          entry.content = content;
          entry.meta.lastUpdated = Math.round(new Date().getTime() / 1000);
          file = entry;
        } else {
          file = {
            path: path,
            name: name,
            content: content,
            type: 'file',
            meta: { 'created': Math.round(new Date().getTime() / 1000) }
          };
        }
        localStorageHelper.set(path, file);
        deferred.resolve();
      }, delay);
      return deferred.promise;
    };
    /**
     * Create the folders contained in a path.
     */
    service.createFolder = function (path) {
      var deferred = $q.defer();
      var isValidPath = validatePath(path);
      if (!isValidPath.valid) {
        deferred.reject(isValidPath.reason);
        return deferred.promise;
      }
      if (localStorageHelper.has(path)) {
        deferred.reject(new Error('Folder already exists: ' + path));
        return deferred.promise;
      }
      var parent = extractParentPath(path);
      if (!localStorageHelper.has(parent)) {
        deferred.reject(new Error('Parent folder does not exists: ' + path));
        return deferred.promise;
      }
      $timeout(function () {
        localStorageHelper.set(path, {
          path: path,
          name: extractNameFromPath(path),
          type: 'folder',
          meta: { 'created': Math.round(new Date().getTime() / 1000) }
        });
        deferred.resolve();
      }, delay);
      return deferred.promise;
    };
    /**
     * Loads the content of a file.
     */
    service.load = function (path) {
      var deferred = $q.defer();
      $timeout(function () {
        var entry = localStorageHelper.get(path);
        if (entry && entry.type === 'file') {
          deferred.resolve(localStorageHelper.get(path).content);
        } else {
          deferred.reject(fileNotFoundMessage(path));
        }
      }, delay);
      return deferred.promise;
    };
    /**
     * Removes a file or directory.
     */
    service.remove = function (path) {
      var deferred = $q.defer();
      $timeout(function () {
        var entry = localStorageHelper.get(path);
        if (entry && entry.type === FOLDER && hasChildrens(path)) {
          deferred.reject('folder not empty');
          return deferred.promise;
        }
        localStorageHelper.remove(path);
        deferred.resolve();
      }, delay);
      return deferred.promise;
    };
    /**
     * Renames a file or directory
     */
    service.rename = function (source, destination) {
      var deferred = $q.defer();
      $timeout(function () {
        var sourceEntry = localStorageHelper.get(source);
        if (!sourceEntry) {
          deferred.reject('Source file or folder does not exists.');
          return deferred.promise;
        }
        var destinationEntry = localStorageHelper.get(destination);
        if (destinationEntry) {
          deferred.reject('File or folder already exists.');
          return deferred.promise;
        }
        if (!isValidParent(destination)) {
          deferred.reject('Destination folder does not exist.');
          return deferred.promise;
        }
        sourceEntry.path = destination;
        sourceEntry.name = extractNameFromPath(destination);
        localStorageHelper.remove(destination);
        localStorageHelper.remove(source);
        localStorageHelper.set(destination, sourceEntry);
        if (sourceEntry.type === FOLDER) {
          // if (!isValidPath(destination)) {
          //   deferred.reject('Destination is not a valid folder');
          //   return deferred.promise;
          // }
          //move all child items
          localStorageHelper.forEach(function (entry) {
            if (entry.path.toLowerCase() !== source.toLowerCase() && entry.path.indexOf(source) === 0) {
              var newPath = destination + entry.path.substring(source.length);
              localStorageHelper.remove(entry.path);
              entry.path = newPath;
              localStorageHelper.set(newPath, entry);
            }
          });
        }
        deferred.resolve();
      }, delay);
      return deferred.promise;
    };
    service.exportFiles = function exportFiles() {
      var jszip = new $window.JSZip();
      localStorageHelper.forEach(function (item) {
        // Skip root folder
        if (item.path === '/') {
          return;
        }
        // Skip meta files
        if (item.name.slice(-5) === '.meta') {
          return;
        }
        var path = item.path.slice(1);
        // Remove starting slash
        item.type === 'folder' ? jszip.folder(path) : jszip.file(path, item.content);
      });
      var fileName = $prompt('Please enter a ZIP file name:', 'api.zip');
      fileName && $window.saveAs(jszip.generate({ type: 'blob' }), fileName);
    };
    return service;
  }
  angular.module('fs').constant('LOCAL_PERSISTENCE_KEY', 'localStorageFilePersistence').constant('FOLDER', 'folder').factory('localStorageHelper', [
    'LOCAL_PERSISTENCE_KEY',
    function (LOCAL_PERSISTENCE_KEY) {
      return {
        forEach: function (fn) {
          for (var key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
              // A key is a local storage file system entry if it starts
              //with LOCAL_PERSISTENCE_KEY + '.'
              if (key.indexOf(LOCAL_PERSISTENCE_KEY + '.') === 0) {
                fn(JSON.parse(localStorage.getItem(key)));
              }
            }
          }
        },
        has: function (path) {
          var has = false;
          path = path || '/';
          this.forEach(function (entry) {
            if (entry.path.toLowerCase() === path.toLowerCase()) {
              has = true;
            }
          });
          return has;
        },
        set: function (path, content) {
          localStorage.setItem(LOCAL_PERSISTENCE_KEY + '.' + path, JSON.stringify(content));
        },
        get: function (path) {
          return JSON.parse(localStorage.getItem(LOCAL_PERSISTENCE_KEY + '.' + path));
        },
        remove: function (path) {
          localStorage.removeItem(LOCAL_PERSISTENCE_KEY + '.' + path);
        }
      };
    }
  ]).factory('localStorageFileSystem', localStorageFileSystemFactory).config(function (fileSystemProvider) {
    if (!fileSystemProvider.hasFactory) {
      fileSystemProvider.setFileSystemFactory(localStorageFileSystemFactory);
    }
  });
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').factory('mockingServiceUtils', [
    '$q',
    'jsTraverse',
    'ramlRepository',
    'refParser',
    function mockingServiceUtils($q, jsTraverse, ramlRepository, refParser) {
      return { dereference: dereference };
      // ---
      function dereferenceJsons(raml) {
        return $q.when().then(function () {
          var promises = [];
          jsTraverse.traverse(raml).forEach(function (value) {
            if (this.path.slice(-2).join('.') === 'body.application/json') {
              var jsonSchema;
              if (value.schema) {
                jsonSchema = value.schema;
              } else if (value.type) {
                jsonSchema = value.type;
              }
              if (Array.isArray(jsonSchema)) {
                jsonSchema = jsonSchema[0];
              }
              try {
                promises.push(refParser.dereference(JSON.parse(jsonSchema), { $refs: { read$Ref: read$Ref } }).then(JSON.stringify).then(function (schema) {
                  value.schema = schema;
                }));
              } catch (e) {
              }
            }
          });
          return $q.all(promises);
        });
      }
      function dereference(raml) {
        return dereferenceJsons(raml);
      }
      // ---
      function read$Ref($ref) {
        var path = $ref.path[0] === '/' ? $ref.path : '/' + $ref.path;
        var file = ramlRepository.getByPath(path);
        if (file) {
          return file.loaded ? $q.when(file) : ramlRepository.loadFile({ path: path }).then(function (file) {
            return file.contents;
          });
          ;
        }
        return $q.reject('File with path "' + path + '" does not exist');
      }
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('mockingServiceClient', [
    '$http',
    '$q',
    '$window',
    'resolveUri',
    function mockingServiceClientFactory($http, $q, $window, resolveUri) {
      var self = this;
      self.proxy = null;
      // self.baseUri = 'http://mocksvc.mulesoft.com';
      self.baseUri = 'http://ec2-52-201-242-128.compute-1.amazonaws.com';
      self.buildURL = function buildURL() {
        var url = self.baseUri + ['/mocks'].concat(Array.prototype.slice.call(arguments, 0)).join('/');
        var proxy = self.proxy || $window.RAML.Settings.proxy;
        if (proxy) {
          url = proxy + resolveUri(url);
        }
        return url;
      };
      function cleanBaseUri(mock) {
        var baseUri = mock.baseUri;
        var mocksQuantity = baseUri.match(/mocks\//g).length;
        if (mocksQuantity > 1) {
          var mocks = 'mocks/';
          for (var i = mocksQuantity; i > 1; i--) {
            var from = baseUri.indexOf(mocks);
            var to = baseUri.indexOf('/', from + mocks.length);
            baseUri = baseUri.substring(0, from) + baseUri.substring(to + 1, baseUri.length);
          }
        }
        mock.baseUri = baseUri;
      }
      self.simplifyMock = function simplifyMock(mock) {
        if (mock.baseUri) {
          cleanBaseUri(mock);
        }
        return {
          id: mock.id,
          baseUri: mock.baseUri,
          manageKey: mock.manageKey
        };
      };
      self.getMock = function getMock(mock) {
        return $http.get(self.buildURL(mock.id, mock.manageKey)).then(function success(response) {
          return self.simplifyMock(response.data);
        }, function failure(response) {
          if (response.status === 404) {
            return;
          }
          return $q.reject(response);
        });
      };
      self.createMock = function createMock(mock) {
        return $http.post(self.buildURL(), mock).then(function success(response) {
          return self.simplifyMock(response.data);
        });
      };
      self.updateMock = function updateMock(mock) {
        return $http({
          method: 'PATCH',
          url: self.buildURL(mock.id, mock.manageKey),
          data: {
            raml: mock.raml,
            json: mock.json
          }
        }).then(function success(response) {
          return self.simplifyMock(angular.extend(mock, response.data));
        });
      };
      self.deleteMock = function deleteMock(mock) {
        return $http.delete(self.buildURL(mock.id, mock.manageKey));
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('mockingService', [
    'mockingServiceClient',
    'mockingServiceUtils',
    'ramlRepository',
    function mockingServiceFactory(mockingServiceClient, mockingServiceUtils, ramlRepository) {
      var self = this;
      function getMockMeta(file) {
        return ramlRepository.loadMeta(file).then(function success(meta) {
          return meta.mock;
        });
        ;
      }
      function setMockMeta(file, mock) {
        return ramlRepository.loadMeta(file).then(function success(meta) {
          meta.mock = mock;
          return ramlRepository.saveMeta(file, meta);
        }).then(function success() {
          return mock;
        });
        ;
      }
      self.getMock = function getMock(file) {
        return getMockMeta(file);
      };
      self.createMock = function createMock(file, raml) {
        return dereferenceRaml(raml).then(function () {
          return mockingServiceClient.createMock({
            raml: file.contents,
            json: raml
          });
        }).then(function (mock) {
          return setMockMeta(file, mock);
        });
        ;
      };
      self.updateMock = function updateMock(file, raml) {
        return dereferenceRaml(raml).then(function () {
          return getMockMeta(file);
        }).then(function (mock) {
          return mock && mockingServiceClient.updateMock(angular.extend(mock, {
            raml: file.contents,
            json: raml
          }));
        }).then(function (mock) {
          return setMockMeta(file, mock);
        });
        ;
      };
      self.deleteMock = function deleteMock(file) {
        return getMockMeta(file).then(function (mock) {
          return mock && mockingServiceClient.deleteMock(mock);
        }).then(function success() {
          return setMockMeta(file, null);
        });
        ;
      };
      // ---
      function dereferenceRaml(raml) {
        return mockingServiceUtils.dereference(raml).catch(function (error) {
          console.error('dereferenceRaml failed', error.stack);
        });
        ;
      }
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('subMenuService', [
    '$timeout',
    '$window',
    function subMenuService($timeout, $window) {
      this.open = function (scope, subMenuName) {
        $timeout(function () {
          $window.addEventListener('click', function self() {
            scope.$apply(function () {
              scope[subMenuName] = false;
            });
            $window.removeEventListener('click', self);
          });
        });
        scope[subMenuName] = true;
      };
      this.openSubMenu = function (scope, subMenuName) {
        scope[subMenuName] = true;
      };
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('importModal', [
    '$modal',
    function importModal($modal) {
      var self = this;
      self.open = function open() {
        return $modal.open({
          templateUrl: 'views/import-modal.html',
          controller: 'ImportController'
        }).result;
      };
      return self;
    }
  ]).controller('ImportController', [
    '$scope',
    '$modalInstance',
    'swaggerToRAML',
    '$q',
    '$window',
    '$rootScope',
    'importService',
    'ramlRepository',
    function ConfirmController($scope, $modalInstance, swaggerToRAML, $q, $window, $rootScope, importService, ramlRepository) {
      $scope.importing = false;
      $scope.rootDirectory = ramlRepository.getByPath('/');
      // Handles <input type="file" onchange="angular.element(this).scope().handleFileSelect(this)">
      // this workaroud for binding the input file to a model won't work for 1.3.x since scope isn't available in onchange
      $scope.handleFileSelect = function (element) {
        $scope.mode.value = element.files[0];
      };
      function broadcastError(msg) {
        return $rootScope.$broadcast('event:notification', {
          message: msg,
          expires: true,
          level: 'error'
        });
      }
      /**
       * Import files from the local filesystem.
       *
       * @param {Object} mode
       */
      function importFile(mode) {
        if (!$scope.fileSupported) {
          return broadcastError('File upload not supported. Try upgrading your browser.');
        }
        $scope.importing = true;
        return importService.mergeFile($scope.rootDirectory, mode.value).then(function () {
          if (importService.isZip(mode.value)) {
            $rootScope.$broadcast('event:save-all');
          }
        }).then(function () {
          return $modalInstance.close(true);
        }).catch(function (err) {
          broadcastError(err.message);
        }).finally(function () {
          $scope.importing = false;
        });
      }
      /**
       * Import a RAML file from a Swagger specification.
       */
      function importSwagger(mode) {
        $scope.importing = true;
        // Attempt to import from a Swagger definition.
        var proxy = $window.RAML.Settings.proxy || '';
        var url = proxy + mode.value;
        return swaggerToRAML.url(url).then(function (contents) {
          var filename = extractFileName(mode.value, 'raml');
          return importService.createAndSaveFile($scope.rootDirectory, filename, contents);
        }).then(function () {
          return $modalInstance.close(true);
        }).catch(function (err) {
          broadcastError('Failed to import Swagger: ' + err.message);
        }).finally(function () {
          $scope.importing = false;
        });
      }
      function importSwaggerFile(mode) {
        $scope.importing = true;
        var importSwaggerPromise;
        if (importService.isZip(mode.value)) {
          importSwaggerPromise = swaggerToRAML.zip($scope.rootDirectory, mode.value).then(function () {
            $rootScope.$broadcast('event:save-all');
          });
        } else {
          importSwaggerPromise = swaggerToRAML.file(mode.value).then(function (contents) {
            var filename = extractFileName(mode.value.name, 'raml');
            return importService.createAndSaveFile($scope.rootDirectory, filename, contents);
          });
        }
        return importSwaggerPromise.then(function () {
          return $modalInstance.close(true);
        }).catch(function (err) {
          broadcastError('Failed to parse Swagger: ' + err.message);
        }).finally(function () {
          $scope.importing = false;
        });
      }
      $scope.options = [
        {
          name: 'RAML file',
          type: 'file',
          spec: 'RAML',
          callback: importFile
        },
        {
          name: 'OAS file',
          type: 'file',
          spec: 'OAS',
          callback: importSwaggerFile
        },
        {
          name: 'OAS spec',
          type: 'url',
          spec: 'OAS',
          callback: importSwagger
        }
      ];
      $scope.mode = $scope.options[0];
      // Check whether file import is supported.
      $scope.fileSupported = !!(window.File && window.FileReader && window.FileList && window.Blob);
      /**
       * Import using either import modes.
       *
       * @param {Object} form
       */
      $scope.import = function (form) {
        form.$submitted = true;
        $scope.submittedType = $scope.mode.type;
        if (form.$invalid || $scope.importing) {
          return;
        }
        try {
          return $scope.mode.callback($scope.mode);
        } catch (err) {
          $scope.importing = false;
          broadcastError(err);
        }
      };
      /**
       * Extract a usable filename from a path.
       *
       * @param  {String} path
       * @param  {String} [ext]
       * @return {String}
       */
      function extractFileName(path, ext) {
        var name = path.replace(/\/*$/, '');
        var index = name.lastIndexOf('/');
        if (index > -1) {
          name = name.substr(index);
        }
        if (ext) {
          name = name.replace(/\.[^\.]*$/, '') + '.' + ext;
        }
        return name;
      }
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('confirmModal', [
    '$rootScope',
    '$modal',
    function confirmModal($rootScope, $modal) {
      var self = this;
      /**
       * @param {String} title
       * @param {String} message
       * @param {Object} [options = {canDiscard, closeButtonLabel, discardButtonLabel, dismissButtonLabel, closeButtonCssClass}]
       */
      self.open = function open(message, title, options) {
        options = angular.extend({
          canDiscard: false,
          closeButtonLabel: 'OK',
          discardButtonLabel: 'Discard',
          dismissButtonLabel: 'Cancel',
          closeButtonCssClass: 'btn-primary'
        }, options);
        return $modal.open({
          templateUrl: 'views/confirm-modal.html',
          controller: 'ConfirmController',
          scope: angular.extend($rootScope.$new(), {
            title: title,
            message: message,
            canDiscard: options.canDiscard,
            closeButtonLabel: options.closeButtonLabel,
            discardButtonLabel: options.discardButtonLabel,
            dismissButtonLabel: options.dismissButtonLabel,
            closeButtonCssClass: options.closeButtonCssClass
          })
        }).result;
        ;
      };
      return self;
    }
  ]).controller('ConfirmController', [
    '$modalInstance',
    '$scope',
    function ConfirmController($modalInstance, $scope) {
      $scope.discard = function discard() {
        $modalInstance.dismiss(angular.extend(new Error(), { discard: true }));
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('newNameModal', [
    '$modal',
    function newNameModal($modal) {
      var self = this;
      self.open = function open(message, defaultName, validations, title, link) {
        return $modal.open({
          templateUrl: 'views/new-name-modal.html',
          controller: 'NewNameController',
          windowClass: 'modal in',
          resolve: {
            message: function messageResolver() {
              return message;
            },
            title: function titleResolver() {
              return title;
            },
            defaultName: function defaultNameResolver() {
              return defaultName;
            },
            validations: function validationsResolver() {
              return validations;
            },
            link: function linkResolver() {
              return link;
            }
          }
        }).result;
        ;
      };
      return self;
    }
  ]).controller('NewNameController', [
    '$modalInstance',
    '$scope',
    'message',
    'defaultName',
    'validations',
    'title',
    'link',
    function NewNameController($modalInstance, $scope, message, defaultName, validations, title, link) {
      $scope.input = {
        newName: defaultName,
        message: message,
        title: title,
        link: link
      };
      $scope.validationErrorMessage = '';
      $scope.isValid = function isValid(value) {
        if (value) {
          for (var i = 0; i < validations.length; i++) {
            if (!validations[i].validate(value)) {
              $scope.validationErrorMessage = validations[i].message;
              return false;
            }
          }
        }
        return true;
      };
      $scope.submit = function submit(form) {
        if (form.$invalid) {
          form.$submitted = true;
          return;
        }
        $modalInstance.close($scope.input.newName);
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('swaggerToRAML', [
    '$window',
    '$q',
    '$http',
    'importService',
    'apiSpecTransformer',
    function swaggerToRAML($window, $q, $http, importService, apiSpecTransformer) {
      var self = this;
      function replaceExtension(path, ext) {
        var index = path.lastIndexOf('.');
        if (index > -1) {
          path = path.substr(0, index);
        }
        return path + '.' + ext;
      }
      function ramlConverter() {
        return new apiSpecTransformer.Converter(apiSpecTransformer.Formats.SWAGGER, apiSpecTransformer.Formats.RAML10);
      }
      function doConvert(error, converter, deferred) {
        if (error) {
          deferred.reject(error);
        }
        try {
          converter.convert('yaml', function (err, result) {
            if (err) {
              return deferred.reject(err);
            }
            return deferred.resolve(result);
          });
        } catch (err) {
          deferred.reject(err);
        }
      }
      function convertZip(root, contents) {
        var decimalRegexp = /^\d+\.\d+$/;
        var swaggerYamlRegexp = /swagger\s*:\s*"{0,1}\d+\.\d+"{0,1}/;
        function isSwaggerSpec(text) {
          try {
            var parsedData = JSON.parse(text);
            return decimalRegexp.test(parsedData.swagger);
          } catch (err) {
            // Possibly YAML Data
            return swaggerYamlRegexp.test(text);
          }
        }
        function converte(files, name, deferred) {
          var content = files[name];
          // leave files that are not swagger unmodified
          if (!isSwaggerSpec(content)) {
            return deferred.resolve({
              name: name,
              content: content
            });
          }
          function toAbsolute(path) {
            return path.indexOf('http') !== 0 ? 'http://zip/' + path : path;
          }
          function toRelative(path) {
            return path.indexOf('http://zip/') === 0 ? path.substring('http://zip/'.length) : path;
          }
          // custom fileResolver to take in memory files from the zip
          var fileResolver = {
              canRead: function (url) {
                return this.read(url) != null;
              },
              read: function (url) {
                var path = toRelative(url.url);
                var content = files[path];
                if (!content) {
                  throw new Error('Could not load content for file ' + path);
                }
                return content;
              }
            };
          // convert main swagger spec
          var deferredConverter = $q.defer();
          var converter = ramlConverter();
          converter.loadFile(toAbsolute(name), function (error) {
            doConvert(error, converter, deferredConverter);
          }, {
            resolve: {
              file: fileResolver,
              http: fileResolver
            }
          });
          return deferredConverter.promise.then(function (convertedData) {
            deferred.resolve({
              name: replaceExtension(name, 'raml'),
              content: convertedData
            });
          });
        }
        return importService.importZip(root, contents, converte);
      }
      self.url = function convert(url) {
        // fetch and convert single file
        var deferred = $q.defer();
        var converter = ramlConverter();
        try {
          converter.loadFile(url, function (error) {
            doConvert(error, converter, deferred);
          });
        } catch (err) {
          deferred.reject(err);
        }
        return deferred.promise;
      };
      self.file = function zip(file) {
        var deferred = $q.defer();
        importService.readFile(file).then(function (content) {
          var converter = ramlConverter();
          converter.loadData(content).then(function (error) {
            doConvert(error, converter, deferred);
          }).catch(deferred.reject);
        }).catch(deferred.reject);
        return deferred.promise;
      };
      self.zip = function zip(rootDirectory, file) {
        var deferred = $q.defer();
        importService.readFile(file).then(function (contents) {
          convertZip(rootDirectory, contents).then(deferred.resolve).catch(deferred.reject);
        }).catch(deferred.reject);
        return deferred.promise;
      };
      return self;
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('ramlToSwagger', [
    '$q',
    'ramlRepository',
    'ramlEditorMainHelpers',
    'apiSpecTransformer',
    function ramlToSwagger($q, ramlRepository, ramlEditorMainHelpers, apiSpecTransformer) {
      var self = this;
      function findRootRaml(selectedFile) {
        if (selectedFile && ramlEditorMainHelpers.isApiDefinition(selectedFile.contents)) {
          return $q.when(selectedFile);
        }
        var defer = $q.defer();
        var rootDirectory = ramlRepository.getByPath('/');
        findRootRamlRecursive(rootDirectory, defer);
        return defer.promise;
      }
      function loadFile(file, defer) {
        (file.loaded ? $q.when(file) : ramlRepository.loadFile({ path: file.path })).then(function (loadedFile) {
          if (ramlEditorMainHelpers.isApiDefinition(loadedFile.contents)) {
            defer.resolve(loadedFile);
          }
        });
      }
      function findRootRamlRecursive(directory, defer) {
        for (var i = 0; i < directory.children.length; i++) {
          var child = directory.children[i];
          if (child.isDirectory) {
            findRootRamlRecursive(child, defer);
          } else {
            loadFile(child, defer);
          }
        }
      }
      function swaggerConverter() {
        return new apiSpecTransformer.Converter(apiSpecTransformer.Formats.RAML10, apiSpecTransformer.Formats.SWAGGER);
      }
      function doConvert(converter, file, format, deferred) {
        try {
          converter.convert(format, function (err, result) {
            if (err) {
              return deferred.reject(err);
            }
            return deferred.resolve({
              name: file.name,
              contents: result
            });
          });
        } catch (err) {
          deferred.reject(err);
        }
      }
      function convertData(file, format, deferred, options) {
        var converter = swaggerConverter();
        converter.loadData(file.contents, options).then(function () {
          doConvert(converter, file, format, deferred);
        }).catch(deferred.reject);
        return deferred;
      }
      function toSwagger(format, selectedFile) {
        var deferred = $q.defer();
        findRootRaml(selectedFile).then(function (rootRaml) {
          convertData(rootRaml, format, deferred);
        }).catch(function (err) {
          deferred.reject(err);
        });
        return deferred.promise;
      }
      self.json = function json(selectedFile) {
        return toSwagger('json', selectedFile);
      };
      self.yaml = function yaml(selectedFile) {
        return toSwagger('yaml', selectedFile);
      };
      return self;
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').service('importService', [
    '$q',
    '$window',
    'ramlRepository',
    'importServiceConflictModal',
    function importServiceFactory($q, $window, ramlRepository, importServiceConflictModal) {
      var self = this;
      /**
       * Merge a file with the specified directory.
       *
       * @param  {Object}  directory
       * @param  {File}    file
       * @return {Promise}
       */
      self.mergeFile = function (directory, file) {
        // Import every other file as normal.
        if (!self.isZip(file)) {
          return self.importFile(directory, file).then(ramlRepository.saveFile);
        }
        return self.readFile(file).then(function (contents) {
          return self.mergeZip(directory, contents);
        });
      };
      /**
       * Merge files into the specified directory.
       *
       * @param  {Object}   directory
       * @param  {FileList} files
       * @return {Promise}
       */
      self.mergeFileList = function (directory, files) {
        var imports = Array.prototype.map.call(files, function (file) {
            return function () {
              return self.mergeFile(directory, file);
            };
          });
        return promiseChain(imports);
      };
      /**
       * Import a single entry into the file system.
       *
       * @param  {Object}                     directory
       * @param  {(DirectoryEntry|FileEntry)} entry
       * @return {Promise}
       */
      self.importEntry = function (directory, entry) {
        var deferred = $q.defer();
        if (entry.isFile) {
          entry.file(function (file) {
            var path = ramlRepository.join(directory.path, entry.fullPath);
            return importFileToPath(directory, path, file).then(deferred.resolve, deferred.reject);
          }, deferred.reject);
        } else {
          var reader = entry.createReader();
          reader.readEntries(function (entries) {
            var imports = entries.filter(function (entry) {
                return canImport(entry.name);
              }).map(function (entry) {
                return function () {
                  return self.importEntry(directory, entry);
                };
              });
            return promiseChain(imports).then(deferred.resolve, deferred.reject);
          });
        }
        return deferred.promise;
      };
      /**
       * Import a single item into the file system.
       *
       * @param  {Object}           directory
       * @param  {DataTransferItem} item
       * @return {Promise}
       */
      self.importItem = function (directory, item) {
        if (item.webkitGetAsEntry) {
          return self.importEntry(directory, item.webkitGetAsEntry());
        }
        return self.importFile(directory, item.getAsFile());
      };
      /**
       * Import a single file into the file system.
       *
       * @param  {Object}  directory
       * @param  {File}    file
       * @return {Promise}
       */
      self.importFile = function (directory, file) {
        return importFileToPath(directory, file.name, file);
      };
      /**
       * Import using an event object.
       *
       * @param  {Object}  directory
       * @param  {Object}  e
       * @return {Promise}
       */
      self.importFromEvent = function (directory, e) {
        // Handle items differently since Chrome has support for folders.
        if (e.dataTransfer.items) {
          return self.importItemList(directory, e.dataTransfer.items);
        }
        return self.importFileList(directory, e.dataTransfer.files);
      };
      /**
       * Import an array of items into the file system.
       *
       * @param  {Object}               directory
       * @param  {DataTransferItemList} items
       * @return {Promise}
       */
      self.importItemList = function (directory, items) {
        var imports = Array.prototype.map.call(items, function (item) {
            return function () {
              return self.importItem(directory, item);
            };
          });
        return promiseChain(imports);
      };
      /**
       * Import an array of files into the file system.
       *
       * @param  {Object}   directory
       * @param  {FileList} files
       * @return {Promise}
       */
      self.importFileList = function (directory, files) {
        var imports = Array.prototype.map.call(files, function (file) {
            return function () {
              return self.importFile(directory, file);
            };
          });
        return promiseChain(imports);
      };
      /**
       * Create and save file.
       *
       * @param  {Object}  directory
       * @param  {String}  name
       * @param  {String}  content
       * @return {Promise}
       */
      self.createAndSaveFile = function (directory, name, content) {
        return self.createFile(directory, name, content).then(ramlRepository.saveFile);
      };
      /**
       * Create a file in the filesystem.
       *
       * @param  {Object}  directory
       * @param  {String}  name
       * @param  {String}  contents
       * @return {Promise}
       */
      self.createFile = function (directory, name, contents) {
        return self.checkExistence(directory, name).then(function (option) {
          if (option === importServiceConflictModal.SKIP_FILE) {
            return;
          }
          if (option === importServiceConflictModal.KEEP_FILE) {
            var altname = altFilename(directory, name);
            return createFileFromContents(directory, altname, contents);
          }
          if (option === importServiceConflictModal.REPLACE_FILE) {
            var path = ramlRepository.join(directory.path, name);
            var file = ramlRepository.getByPath(path);
            // Load the file if not loaded.
            return (file.loaded ? $q.when(file) : ramlRepository.loadFile({ path: path })).then(function (theFile) {
              // Check if content has changed.
              if (theFile.contents !== contents) {
                // Load the file current contents.
                file.contents = theFile.contents;
                // Mark the file as loaded.
                file.loaded = true;
                // When replacing a file, if it had not been opened in
                // the Designer yet, it might had not been initialized with its
                // CodeMirror instance.
                // Replace the original file contents with the imported file
                // contents.
                if (!file.doc) {
                  file.doc = new CodeMirror.Doc(contents);
                } else {
                  file.doc.setValue(contents);
                }
                // Mark the file as dirty.
                file.dirty = true;
              }
              return file;
            });
            ;
          }
          return createFileFromContents(directory, name, contents);
        });
      };
      /**
       * Create a directory in the filesystem.
       *
       * @param  {Object}  directory
       * @param  {String}  name
       * @return {Promise}
       */
      self.createDirectory = function (directory, name) {
        return ramlRepository.createDirectory(directory, name);
      };
      /**
       * Check whether a file exists and make a decision based on that.
       *
       * @param  {Object}  directory
       * @param  {String}  name
       * @return {Promise}
       */
      self.checkExistence = function (directory, name) {
        var path = ramlRepository.join(directory.path, name);
        if (!pathExists(path)) {
          return $q.when(null);
        }
        return importServiceConflictModal.open(path);
      };
      /**
       * Check whether a file is a zip.
       *
       * @param  {File}    file
       * @return {Boolean}
       */
      self.isZip = function (file) {
        // Can't check `file.type` as it's empty when read from a `FileEntry`.
        return /\.zip$/i.test(file.name);
      };
      /**
       * Read a file object as a text file.
       *
       * @param  {File}    file
       * @return {Promise}
       */
      self.readFile = function (file) {
        var deferred = $q.defer();
        var reader = new $window.FileReader();
        reader.onload = function () {
          return deferred.resolve(reader.result);
        };
        reader.onerror = function () {
          return deferred.reject(reader.error);
        };
        if (self.isZip(file)) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
        }
        return deferred.promise;
      };
      /**
       * Parse a ZIP file.
       *
       * @param  {String} contents
       * @return {Object}
       */
      self.parseZip = function (contents) {
        var zip = new $window.JSZip(contents);
        return sanitizeZipFiles(zip.files);
      };
      /**
       * Merge a zip with a directory in the file system.
       *
       * @param  {Object}  directory
       * @param  {String}  contents
       * @return {Promise}
       */
      self.mergeZip = function (directory, contents) {
        var files = removeCommonFilePrefixes(self.parseZip(contents));
        return importZipFiles(directory, files);
      };
      /**
       * Import a zip file into the current directory.
       *
       * @param  {Object}  directory
       * @param  {String}  contents
       * @param  {Function}  converter
       * @return {Promise}
       */
      self.importZip = function (directory, contents, converter) {
        var files = self.parseZip(contents);
        return importZipFiles(directory, files, converter);
      };
      /**
       * Import a single file at specific path.
       *
       * @param  {Object}  directory
       * @param  {String}  path
       * @param  {File}    file
       * @return {Promise}
       */
      function importFileToPath(directory, path, file) {
        return self.readFile(file).then(function (contents) {
          if (self.isZip(file)) {
            // Remove the zip file name from the end of the path.
            var dirname = path.replace(/[\\\/][^\\\/]*$/, '');
            return self.createDirectory(directory, dirname).then(function (directory) {
              return self.importZip(directory, contents);
            });
          }
          return self.createFile(directory, path, contents);
        });
      }
      /**
       * Import files from the zip object.
       *
       * @param  {Object}  directory
       * @param  {Object}  files
       * @param  {Function}  converter
       * @return {Promise}
       */
      function importZipFiles(directory, files, converter) {
        var imports = Object.keys(files).filter(canImport).map(function (name) {
            return function () {
              if (!converter) {
                return self.createFile(directory, name, files[name]);
              } else {
                // convert content before importing file
                var defer = $q.defer();
                converter(files, name, defer);
                return defer.promise.then(function (file) {
                  return self.createFile(directory, file.name, file.content);
                });
              }
            };
          });
        return promiseChain(imports);
      }
      /**
       * Sanitize a zip file object and remove unwanted metadata.
       *
       * @param  {Object} originalFiles
       * @return {Object}
       */
      function sanitizeZipFiles(originalFiles) {
        var files = {};
        Object.keys(originalFiles).forEach(function (name) {
          if (/^__MACOSX\//.test(name) || /\/$/.test(name)) {
            return;
          }
          files[name] = originalFiles[name].asText();
        });
        return files;
      }
      /**
       * Remove the common file prefix from a files object.
       *
       * @param  {Object} prefixedFiles
       * @return {String}
       */
      function removeCommonFilePrefixes(prefixedFiles) {
        // Sort the file names in order of length to get the common prefix.
        var prefix = Object.keys(prefixedFiles).map(function (name) {
            if (!/[\\\/]/.test(name)) {
              return [];
            }
            return name.replace(/[\\\/][^\\\/]*$/, '').split(/[\\\/]/);
          }).reduce(function (prefix, name) {
            // Iterate over each part and check the prefix matches. If a part
            // does not match, return everything before it as the new prefix.
            for (var i = 0; i < prefix.length; i++) {
              if (name[i] !== prefix[i]) {
                return name.slice(0, i);
              }
            }
            return prefix;
          }).join('/');
        // Return the file object with the same file names.
        if (!prefix) {
          return angular.extend({}, prefixedFiles);
        }
        var files = {};
        // Iterate over the original files and create a new object.
        Object.keys(prefixedFiles).forEach(function (name) {
          var newName = name.substr(prefix.length + 1);
          // If no text is left, it must have been the root directory.
          if (newName) {
            files[newName] = prefixedFiles[name];
          }
        });
        return files;
      }
      /**
       * Check whether a certain file should be imported.
       *
       * @param  {String}  name
       * @return {Boolean}
       */
      function canImport(name) {
        return !/(?:^|[\/\\])\./.test(name);
      }
      /**
       * Check whether the path already exists.
       *
       * @param  {String}  path
       * @return {Boolean}
       */
      function pathExists(path) {
        return !!ramlRepository.getByPath(path);
      }
      /**
       * Create a file in the filesystem without checking prior existence.
       *
       * @param  {Object}  directory
       * @param  {String}  name
       * @param  {String}  contents
       * @return {Promise}
       */
      function createFileFromContents(directory, name, contents) {
        return ramlRepository.createFile(directory, name).then(function (file) {
          file.contents = contents;
          return file;
        });
      }
      /**
       * Generate an alternative file name for storage.
       *
       * @param  {Object} directory
       * @param  {String} name
       * @return {String}
       */
      function altFilename(directory, name) {
        var path;
        var index = 0;
        var extIndex = name.lastIndexOf('.');
        var basename = extIndex > -1 ? name.substr(0, extIndex) : name;
        var extension = extIndex > -1 ? name.substr(extIndex) : '';
        do {
          var filename = basename + '-' + ++index + extension;
          path = ramlRepository.join(directory.path, filename);
        } while (pathExists(path));
        return path;
      }
      /**
       * Chain promises one after another.
       *
       * @param  {Array}   promises
       * @return {Promise}
       */
      function promiseChain(promises) {
        return promises.reduce(function (promise, chain) {
          return promise.then(chain);
        }, $q.when());
      }
    }
  ]);
}());
(function () {
  'use strict';
  var SKIP_FILE = 0;
  var KEEP_FILE = 1;
  var REPLACE_FILE = 2;
  angular.module('ramlEditorApp').service('importServiceConflictModal', [
    '$modal',
    function newNameModal($modal) {
      var self = this;
      self.open = function open(path) {
        return $modal.open({
          backdrop: 'static',
          templateUrl: 'views/import-service-conflict-modal.html',
          controller: 'ImportServiceConflictModal',
          resolve: {
            path: function pathResolver() {
              return path;
            }
          }
        }).result;
      };
      self.KEEP_FILE = KEEP_FILE;
      self.SKIP_FILE = SKIP_FILE;
      self.REPLACE_FILE = REPLACE_FILE;
      return self;
    }
  ]).controller('ImportServiceConflictModal', [
    '$scope',
    '$modalInstance',
    'path',
    function ImportServiceConflictModal($scope, $modalInstance, path) {
      $scope.path = path;
      $scope.skip = function () {
        $modalInstance.close(SKIP_FILE);
      };
      $scope.keep = function () {
        $modalInstance.close(KEEP_FILE);
      };
      $scope.replace = function () {
        $modalInstance.close(REPLACE_FILE);
      };
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').factory('apiSpecTransformer', [
    '$window',
    function apiSpecTransformer($window) {
      return $window.apiSpecTransformer;
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').factory('jsTraverse', [
    '$window',
    function jsTraverse($window) {
      return $window.jsTraverse;
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').factory('refParser', [
    '$window',
    function refParser($window) {
      return $window.$RefParser;
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('stringFilters', []).filter('dasherize', function () {
    return function (input) {
      return input ? input.toLowerCase().trim().replace(/\s/g, '-') : '';
    };
  });
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').constant('UPDATE_RESPONSIVENESS_INTERVAL', 800).controller('ramlEditorMain', [
    'UPDATE_RESPONSIVENESS_INTERVAL',
    '$scope',
    '$rootScope',
    '$timeout',
    '$window',
    'safeApply',
    'safeApplyWrapper',
    'debounce',
    'ramlParser',
    'ramlRepository',
    'codeMirror',
    'codeMirrorErrors',
    'config',
    '$prompt',
    '$confirm',
    '$modal',
    'mockingServiceClient',
    '$q',
    'ramlEditorMainHelpers',
    function (UPDATE_RESPONSIVENESS_INTERVAL, $scope, $rootScope, $timeout, $window, safeApply, safeApplyWrapper, debounce, ramlParser, ramlRepository, codeMirror, codeMirrorErrors, config, $prompt, $confirm, $modal, mockingServiceClient, $q, ramlEditorMainHelpers) {
      var editor, lineOfCurrentError, currentFile;
      function extractCurrentFileLabel(file) {
        var label = '';
        if (file) {
          label = file.path;
          if (file.dirty) {
            label = '* ' + label;
          }
        }
        return label;
      }
      function calculatePositionOfErrorMark(currentLine) {
        function onlyFolds(textMark) {
          return textMark.__isFold;
        }
        function toStartingLine(textMark) {
          return textMark.find().from.line;
        }
        function toMinimum(currentMin, val) {
          return Math.min(currentMin, val);
        }
        var position = { line: currentLine };
        return editor.findMarksAt(position).filter(onlyFolds).map(toStartingLine).reduce(toMinimum, lineOfCurrentError);
      }
      function formatErrorMessage(message, actualLine, displayLine) {
        if (displayLine === actualLine) {
          return message;
        }
        return 'Error on line ' + (actualLine + 1) + ': ' + message;
      }
      $window.setTheme = function setTheme(theme) {
        config.set('theme', theme);
        $scope.theme = $rootScope.theme = theme;
        safeApply($scope);
      };
      $scope.$on('event:raml-editor-file-selected', function onFileSelected(event, file) {
        currentFile = file;
        if (ramlEditorMainHelpers.isApiDefinitionLike(file.contents)) {
          // Empty console so that we remove content from previous open RAML file
          $rootScope.$broadcast('event:raml-parsed', {});
        }
        // Every file must have a unique document for history and cursors.
        if (!file.doc) {
          file.doc = new CodeMirror.Doc(file.contents);
        }
        editor.swapDoc(file.doc);
        editor.focus();
        // After swapping the doc, configure the editor for the current file
        // extension.
        codeMirror.configureEditor(editor, file.extension);
        $scope.fileParsable = $scope.getIsFileParsable(file);
        // Inform the editor source has changed. This is also called when the
        // editor triggers the change event, swapping the doc does not trigger
        // that event, so we must explicitly call the sourceUpdated function.
        $scope.sourceUpdated();
      });
      $scope.$watch('fileBrowser.selectedFile.contents', function (contents) {
        if (contents != null && contents !== editor.getValue()) {
          currentFile.doc = new CodeMirror.Doc(contents);
          editor.swapDoc(currentFile.doc);
        }
      });
      var updateFile = debounce(function updateFile() {
          $rootScope.$broadcast('event:file-updated');
        }, config.get('updateResponsivenessInterval', UPDATE_RESPONSIVENESS_INTERVAL));
      $scope.$on('event:raml-editor-file-created', updateFile);
      $scope.$on('event:raml-editor-file-removed', updateFile);
      $scope.$on('event:raml-editor-file-removed', function onFileSelected(event, file) {
        if (currentFile === file) {
          currentFile = undefined;
          editor.swapDoc(new CodeMirror.Doc(''));
        }
      });
      $scope.canExportFiles = function canExportFiles() {
        return ramlRepository.canExport();
      };
      $scope.supportsFolders = ramlRepository.supportsFolders;
      $scope.sourceUpdated = function sourceUpdated() {
        var source = editor.getValue();
        var selectedFile = $scope.fileBrowser.selectedFile;
        $scope.clearErrorMarks();
        selectedFile.contents = source;
        $scope.fileParsable = $scope.getIsFileParsable(selectedFile);
        updateFile();
      };
      $scope.loadRaml = function loadRaml(definition, location) {
        return ramlParser.loadPath(location, function contentAsync(path) {
          var file = ramlRepository.getByPath(path);
          if (file) {
            return (file.loaded ? $q.when(file) : ramlRepository.loadFile({ path: path })).then(function (file) {
              return file.contents;
            });
            ;
          }
          return $q.reject('ramlEditorMain: loadRaml: contentAsync: ' + path + ': no such path');
        }).then(function (raml) {
          return ramlEditorMainHelpers.isApiDefinitionLike(definition) ? raml : null;
        });
        ;
      };
      $scope.clearErrorMarks = function clearErrorMarks() {
        codeMirrorErrors.clearAnnotations();
        $scope.hasErrors = false;
        $scope.currentErrorCount = 0;
        $scope.currentWarningCount = 0;
      };
      $scope.$on('event:file-updated', function onFileUpdated() {
        $scope.clearErrorMarks();
        var file = $scope.fileBrowser.selectedFile;
        if (!file || !$scope.fileParsable || file.contents.trim() === '') {
          $scope.currentError = undefined;
          lineOfCurrentError = undefined;
          return;
        }
        $scope.loadRaml(file.contents, file.path).then(safeApplyWrapper($scope, function completeParse(api) {
          var issues = api.errors;
          // errors and warnings
          if (issues && issues.length > 0) {
            $rootScope.$broadcast('event:raml-parser-error', issues);
            $scope.currentWarningCount = issues.reduce(function (count, issue) {
              return issue.isWarning ? count + 1 : count;
            }, 0);
            $scope.currentErrorCount = issues.reduce(function (count, issue) {
              return !issue.isWarning ? count + 1 : count;
            }, 0);
          }
          if ($scope.currentErrorCount === 0) {
            var raml = api.specification;
            $scope.fileBrowser.selectedFile.raml = raml;
            $rootScope.$broadcast('event:raml-parsed', raml);
          }
        }), safeApplyWrapper($scope, function failureParse(error) {
          $rootScope.$broadcast('event:raml-parser-error', error.parserErrors || error);
        }));
      });
      $scope.$on('event:raml-parsed', safeApplyWrapper($scope, function onRamlParser(event, raml) {
        $scope.raml = raml;
        $scope.title = raml && raml.title;
        $scope.version = raml && raml.version;
        $scope.currentError = undefined;
        lineOfCurrentError = undefined;
      }));
      $scope.$on('event:raml-parser-error', safeApplyWrapper($scope, function onRamlParserError(event, errors) {
        var parserErrors = Array.isArray(errors) ? errors : [{
              line: 0,
              column: 1,
              message: errors.message,
              isWarning: errors.isWarning
            }];
        codeMirrorErrors.displayAnnotations(parserErrors.map(function mapErrorToAnnotation(error) {
          var errorInfo = error;
          var tracingInfo = {
              line: undefined,
              column: undefined,
              path: undefined
            };
          var needErrorPath = error.trace !== undefined;
          function findError(errors, selectedFile) {
            for (var i = 0; i < errors.length; i++) {
              var error = errors[i];
              if (error.path === selectedFile.name) {
                error.from = errorInfo;
                return error;
              } else if (error.trace) {
                var innerError = findError(error.trace, selectedFile);
                if (innerError) {
                  innerError.from = error;
                  return innerError;
                }
              }
            }
          }
          if (needErrorPath) {
            var selectedFile = event.currentScope.fileBrowser.selectedFile;
            var selectedFilePath = selectedFile.path;
            var lastDirectoryIndex = selectedFilePath.lastIndexOf('/') + 1;
            var folderPath = selectedFilePath.substring(selectedFilePath[0] === '/' ? 1 : 0, lastDirectoryIndex);
            errorInfo = findError(error.trace, selectedFile);
            if (errorInfo) {
              errorInfo.isWarning = error.isWarning;
              var rangeFrom = rangePoint(errorInfo.from.range);
              tracingInfo = {
                line: rangeFrom.line,
                column: rangeFrom.column,
                path: folderPath + errorInfo.from.path
              };
            } else {
              // should not happen... todo parser bug
              errorInfo = {
                message: error.message,
                isWarning: error.isWarning
              };
              var traceRange = rangePoint(error.range);
              tracingInfo = {
                line: traceRange.line,
                column: traceRange.column,
                path: folderPath + error.path
              };
            }
          }
          var range = rangePoint(errorInfo.range);
          return {
            line: range.line,
            column: range.column,
            message: errorInfo.message,
            severity: errorInfo.isWarning ? 'warning' : 'error',
            path: tracingInfo.path,
            tracingLine: tracingInfo.line,
            tracingColumn: tracingInfo.column
          };
        }));
      }));
      function rangePoint(range) {
        if (range && range.start) {
          return {
            line: 1 + range.start.line,
            column: range.start.column
          };
        }
        if (range && Array.isArray(range)) {
          return {
            line: 1 + range[0],
            column: range[1]
          };
        }
        return {
          line: 1,
          column: 1
        };
      }
      $scope.openHelp = function openHelp() {
        $modal.open({ templateUrl: 'views/help.html' });
      };
      $scope.getIsFileParsable = function getIsFileParsable(file) {
        return ramlEditorMainHelpers.isRamlFile(file.extension) && ramlEditorMainHelpers.isApiDefinitionLike(file.contents);
      };
      $scope.getIsMockingServiceVisible = function getIsMockingServiceVisible() {
        if ($scope.mockingServiceDisabled || !$scope.fileParsable) {
          return false;
        }
        return true;
      };
      $scope.getIsShelfVisible = function getIsShelfVisible() {
        if (!$scope.fileParsable) {
          return false;
        }
        return true;
      };
      $scope.getIsConsoleVisible = function getIsConsoleVisible() {
        return $scope.fileParsable && $scope.raml;
      };
      $scope.toggleShelf = function toggleShelf() {
        $scope.shelf.collapsed = !$scope.shelf.collapsed;
        config.set('shelf.collapsed', $scope.shelf.collapsed);
      };
      $scope.getSelectedFileAbsolutePath = function getSelectedFileAbsolutePath() {
        var result = extractCurrentFileLabel(currentFile);
        if ($scope.currentErrorCount) {
          result += ' (' + $scope.currentErrorCount + ' ' + ($scope.currentErrorCount > 1 ? 'errors' : 'error') + ')';
        } else if ($scope.currentWarningCount) {
          result += ' (' + $scope.currentWarningCount + ' ' + ($scope.currentWarningCount > 1 ? 'warnings' : 'warning') + ')';
        }
        return result;
      };
      $scope.$on('event:toggle-theme', function onToggleTheme() {
        $window.setTheme($scope.theme === 'dark' ? 'light' : 'dark');
      });
      (function bootstrap() {
        $scope.currentError = undefined;
        $scope.theme = $rootScope.theme = config.get('theme', 'dark');
        $scope.shelf = {};
        $scope.shelf.collapsed = JSON.parse(config.get('shelf.collapsed', 'false'));
        $scope.editor = editor = codeMirror.initEditor();
        editor.on('fold', function (cm, start, end) {
          if (start.line <= lineOfCurrentError && lineOfCurrentError <= end.line) {
            codeMirrorErrors.displayAnnotations([{
                line: start.line + 1,
                message: formatErrorMessage($scope.currentError.message, lineOfCurrentError, start.line)
              }]);
          }
        });
        editor.on('unfold', function () {
          var displayLine = calculatePositionOfErrorMark(lineOfCurrentError);
          var message = formatErrorMessage($scope.currentError.message, lineOfCurrentError, displayLine);
          codeMirrorErrors.displayAnnotations([{
              line: displayLine + 1,
              message: message
            }]);
        });
        editor.on('change', function onChange() {
          $scope.sourceUpdated();
        });
        $window.alreadyNotifiedExit = false;
        $window.editorFilesystemIsDirty = function editorFilesystemIsDirty() {
          var dirtyFile = false;
          $scope.homeDirectory.forEachChildDo(function (t) {
            dirtyFile = t.dirty || dirtyFile;
          });
          return dirtyFile;
        };
        // Warn before leaving the page
        $window.onbeforeunload = function () {
          if (!$window.alreadyNotifiedExit && $window.editorFilesystemIsDirty()) {
            return 'WARNING: You have unsaved changes. Those will be lost if you leave this page.';
          }
        };
        if ($scope.mockingServiceBaseUri) {
          mockingServiceClient.baseUri = $scope.mockingServiceBaseUri;
        }
      }());
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').factory('ramlEditorMainHelpers', function ramlEditorMainHelpers() {
    return {
      isRamlFile: isRamlFile,
      isApiDefinition: isApiDefinition,
      isApiDefinitionLike: isApiDefinitionLike
    };
    // ---
    function isRamlFile(extension) {
      return extension === 'raml';
    }
    function isApiDefinitionLike(raml) {
      return isApiDefinition(raml) || isTypedFragment(raml);
    }
    // ---
    function isApiDefinition(raml) {
      return /^#%RAML\s(0\.8|1\.0)\s*$/.test(getFirstLine(raml));
    }
    function isTypedFragment(raml) {
      return /^#%RAML\s1\.0\s(Trait|ResourceType|Library|Overlay|Extension|DataType|DocumentationItem|NamedExample|AnnotationTypeDeclaration|SecurityScheme)\s*$/.test(getFirstLine(raml));
    }
    function getFirstLine(raml) {
      return raml.split(/\r\n|\n/)[0];
    }
  });
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').factory('applySuggestion', function applySuggestionFactory() {
    return function applySuggestion(editor, suggestion) {
      var replacementPrefix = suggestion.replacementPrefix || '';
      var cursor = editor.getCursor();
      var rangeEnd = {
          line: cursor.line,
          ch: editor.getLine(cursor.line).length
        };
      var rangeStart = {
          line: cursor.line,
          ch: cursor.ch - replacementPrefix.length
        };
      editor.replaceRange(suggestion.key, rangeStart, rangeEnd);
      var suggestionLines = suggestion.key.split('\n');
      var ch = suggestionLines.length > 1 ? suggestionLines[suggestionLines.length - 1].length : cursor.ch + suggestionLines[0].length - replacementPrefix.length;
      var line = cursor.line + suggestionLines.length - 1;
      editor.setCursor({
        line: line,
        ch: ch
      });
      editor.focus();
    };
  }).factory('newSuggestions', [
    'ramlSuggest',
    function (ramlSuggest) {
      var groupBy = function (items, key) {
        var addItemToResult = function (result, item) {
          var list = result[item[key]] || [];
          list.push(item);
          result[item[key]] = list;
          return result;
        };
        return items.reduce(addItemToResult, {});
      };
      var createModel = function (suggestions) {
        var items = suggestions.map(function (suggestion) {
            return {
              category: suggestion.category,
              title: suggestion.displayText || suggestion.text,
              key: suggestion.text,
              replacementPrefix: suggestion.replacementPrefix || ''
            };
          });
        var categoryMap = groupBy(items, 'category');
        var categories = Object.keys(categoryMap).map(function (key) {
            return {
              name: key,
              items: categoryMap[key]
            };
          });
        return { categories: categories };  // model
      };
      return function (homeDirectory, selectedFile, editor) {
        return ramlSuggest.suggest(homeDirectory, selectedFile, editor).then(createModel);
      };
    }
  ]).controller('ramlEditorShelf', [
    '$scope',
    'safeApplyWrapper',
    'newSuggestions',
    'applySuggestion',
    function ($scope, safeApplyWrapper, newSuggestions, applySuggestion) {
      var editor = $scope.editor;
      function updateModel(suggestions) {
        $scope.model = suggestions;
        $scope.$digest();
      }
      $scope.cursorMoved = safeApplyWrapper(null, function cursorMoved() {
        newSuggestions($scope.homeDirectory, $scope.fileBrowser.selectedFile, editor).then(updateModel);
      });
      $scope.orderSections = function orderSections(section) {
        var index = [
            'root',
            'docs',
            'methods',
            'parameters',
            'responses',
            'security',
            'resources',
            'traits and types'
          ].indexOf(section.name.toLowerCase());
        return index === -1 ? index.length : index;
      };
      $scope.itemClick = function itemClick(suggestion) {
        applySuggestion(editor, suggestion);
      };
      editor.on('cursorActivity', $scope.cursorMoved);
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').constant('NOTIFICATION_TIMEOUT', 3000).controller('notifications', [
    'NOTIFICATION_TIMEOUT',
    '$scope',
    '$timeout',
    function (NOTIFICATION_TIMEOUT, $scope, $timeout) {
      var notifications = [];
      $scope.shouldDisplayNotifications = false;
      function processNotifications() {
        var args;
        if (notifications.length) {
          args = notifications.splice(0, 1)[0];
          $scope.message = args.message;
          $scope.expires = args.expires;
          $scope.level = args.level || 'info';
          // info, error
          $scope.shouldDisplayNotifications = true;
          if (args.expires) {
            $timeout(function () {
              $scope.shouldDisplayNotifications = false;
              processNotifications();
            }, NOTIFICATION_TIMEOUT);
          }
        }
      }
      $scope.$on('event:notification', function (e, args) {
        notifications.push(JSON.parse(JSON.stringify(args)));
        processNotifications();
      });
      $scope.hideNotifications = function () {
        $scope.shouldDisplayNotifications = false;
        processNotifications();
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').controller('mockingServiceController', [
    '$scope',
    'mockingService',
    'getNode',
    function mockingServiceControllerFactory($scope, mockingService, getNode) {
      function addBaseUri() {
        function setLine(lineNumber, line, prefix) {
          $scope.editor.setLine(lineNumber, (prefix || '') + $scope.editor.getLine(lineNumber) + '\n' + line);
        }
        var baseUri = 'baseUri: ' + $scope.mock.baseUri;
        var node = getNode($scope.editor, 0);
        // try to find `baseUri` line
        while (node) {
          if (node.getKey() === 'baseUri') {
            if (node.getValue().text !== $scope.mock.baseUri) {
              setLine(node.lineNumber, baseUri, '#');
            }
            return;
          }
          node = node.getNextSibling();
        }
        // try to find `---` line
        for (var i = 0; $scope.editor.getLine(i); i++) {
          if ($scope.editor.getLine(i).trim() === '---') {
            setLine(i, baseUri);
            return;
          }
        }
        // place it right after RAML version tag
        setLine(0, baseUri);
      }
      function removeBaseUri() {
        var baseUriLine = 'baseUri: ' + $scope.mock.baseUri;
        var lineNumber = void 0;
        var line = void 0;
        // trying to find mocked baseUri
        // and remove it
        for (lineNumber = 0; lineNumber < $scope.editor.lineCount(); lineNumber++) {
          line = $scope.editor.getLine(lineNumber).trim();
          if (line === baseUriLine) {
            $scope.editor.removeLine(lineNumber);
            break;
          }
        }
        // trying to find previous commented out baseUri
        // and uncomment it
        for (lineNumber = Math.min(lineNumber, $scope.editor.lineCount() - 1); lineNumber >= 0; lineNumber--) {
          line = $scope.editor.getLine(lineNumber).trim();
          if (line.indexOf('#') === 0 && line.slice(1).trim().indexOf('baseUri: ') === 0) {
            $scope.editor.setLine(lineNumber, line.slice(1).trim());
            break;
          }
        }
      }
      function loading(promise) {
        $scope.loading = true;
        return promise.finally(function onFinally() {
          $scope.loading = false;
        });
      }
      function setMock(mock) {
        $scope.mock = mock;
        $scope.enabled = !!mock;
      }
      function getMock() {
        loading(mockingService.getMock($scope.fileBrowser.selectedFile).then(setMock).then(function () {
          if ($scope.mock) {
            addBaseUri();
          }
        }));
      }
      function createMock() {
        loading(mockingService.createMock($scope.fileBrowser.selectedFile, $scope.fileBrowser.selectedFile.raml).then(setMock).then(addBaseUri));
      }
      function updateMock() {
        mockingService.updateMock($scope.fileBrowser.selectedFile, $scope.fileBrowser.selectedFile.raml).then(setMock);
        ;
      }
      function deleteMock() {
        loading(mockingService.deleteMock($scope.fileBrowser.selectedFile).then(function () {
          removeBaseUri();
        }).then(setMock));
      }
      $scope.toggleMockingService = function toggleMockingService() {
        if (!$scope.fileBrowser.selectedFile) {
          return;
        }
        if ($scope.enabled) {
          deleteMock();
          return;
        }
        createMock();
      };
      $scope.$watch('fileBrowser.selectedFile', function watch(newValue) {
        if (newValue) {
          getMock();
        } else {
          setMock();
        }
      });
      $scope.$watch('fileBrowser.selectedFile.raml', function watch() {
        if ($scope.enabled) {
          updateMock();
        }
      });
    }
  ]);
  ;
}());
(function () {
  'use strict';
  /**
   * Flex layout splitter
   */
  angular.module('splitter', []).directive('ngSplitter', [
    '$window',
    'config',
    function ($window, config) {
      // Extend angular jqlite with .prev as an opposite to .next
      if (!angular.element.prototype.prev) {
        /**
           * Get the immediately preceding sibling of each element in the set of matched elements.
           */
        angular.element.prototype.prev = function prev() {
          var value;
          if (this.length) {
            value = this[0].previousSibling;
            while (value !== null && value.nodeType !== 1) {
              value = value.previousSibling;
            }
          }
          return angular.isDefined(value) ? angular.element(value) : this;
        };
      }
      function getCollapseTarget(splitter) {
        return splitter.attr('ng-splitter-collapse-target');
      }
      function getMinWidth(splitter) {
        return splitter.attr('ng-splitter-min-width');
      }
      function getCollapseTargetEl(splitter) {
        return splitter[getCollapseTarget(splitter)]();
      }
      function getNonCollapseTargetEl(splitter) {
        return splitter[{
          next: 'prev',
          prev: 'next'
        }[getCollapseTarget(splitter)]]();
      }
      /**
         * Scales the splitter to the requested size, clipping the size based on
         * our constraints and toggling the resize chevron if the size of the
         * next element goes to the minimum value.
         *
         * @param splitter Splitter that was moved
         * @param size Pixels to resize to
         */
      function resizeCollapseTarget(splitter, size) {
        var minWidth = getMinWidth(splitter);
        if (typeof minWidth === 'undefined' || size >= minWidth) {
          getCollapseTargetEl(splitter).css('min-width', Math.max(0, size) + 'px');
        }
        return Math.max(0, size);
      }
      /**
         * @param splitter Splitter that was moved
         * @param sizeAttr 'width' or 'height'
         * @param delta Pixels to resize by
         * @returns New collapse target size after it has been resized
         */
      function performResizeCollapseTarget(splitter, sizeAttr, delta) {
        var collapseTargetEl = getCollapseTargetEl(splitter);
        var collapseTargetElSize = getOffsetSize(collapseTargetEl, sizeAttr);
        var nonCollapseTargetEl = getNonCollapseTargetEl(splitter);
        var nonCollapseTargetElSize = getOffsetSize(nonCollapseTargetEl, sizeAttr);
        var sign = {
            next: 1,
            prev: -1
          }[getCollapseTarget(splitter)];
        // Force delta to be as small as possible to make
        // sure collapse target doesn't over grow if there is
        // no space left
        if (nonCollapseTargetElSize + delta * sign < 0) {
          delta = nonCollapseTargetElSize * sign * -1;
        }
        if (delta) {
          collapseTargetElSize = resizeCollapseTarget(splitter, collapseTargetElSize - delta * sign);
        }
        return collapseTargetElSize;
      }
      /**
         * @param element Element whose offset size we want
         * @param sizeAttr 'width' or 'height'
         * @returns {Number} offset size
         */
      function getOffsetSize(element, sizeAttr) {
        var offsetSizeProperty = 'offset' + sizeAttr[0].toUpperCase() + sizeAttr.slice(1);
        return element[0][offsetSizeProperty];
      }
      //region Splitter config
      /**
         * Loads the splitter size and optionally applies it to the next element
         * after the splitter
         * @param splitter The splitter element. Should have a unique id.
         * @param sizeAttr 'width' or 'height'
         * @returns {Number} The splitter size
         */
      function loadSize(splitter, sizeAttr) {
        //If no size was saved, use the current size;
        return config.get('splitterSize_' + splitter.attr('id')) || saveSize(splitter, sizeAttr);
      }
      /**
         * Saves the splitter size
         * @param splitter The splitter element. Should have a unique id.
         * @param sizeAttr 'width' or 'height'
         * @returns {Number} The size of the splitter
         */
      function saveSize(splitter, sizeAttr) {
        var size = getOffsetSize(getCollapseTargetEl(splitter), sizeAttr);
        config.set('splitterSize_' + splitter.attr('id'), size);
        return size;
      }
      /**
         * Loads whether the splitter was collapsed by the user
         * @param splitter The splitter element. Should have a unique id.
         * @returns {boolean} Whether the splitter was collapsed by the user
         */
      function loadIsCollapsed(splitter) {
        return config.get('splitterCollapsed_' + splitter.attr('id')) === 'true';
      }
      /**
         * Saves whether the splitter is collapsed
         * @param splitter The splitter element. Should have a unique id.
         * @param collapsed Whether the splitter is collapsed
         */
      function saveIsCollapsed(splitter, collapsed) {
        config.set('splitterCollapsed_' + splitter.attr('id'), collapsed);
      }
      /**
         * Toggles the collapse target visibility
         * @param splitter The splitter that owns the chevron
         * @param collapse False means expand collapse target, true
         * means collapse target is shown
         */
      function toggleCollapseTarget(splitter, collapse) {
        collapse = arguments.length > 1 ? collapse : !loadIsCollapsed(splitter);
        splitter.toggleClass('collapsed', collapse);
        getCollapseTargetEl(splitter).toggleClass('hide-display', collapse);
        saveIsCollapsed(splitter, collapse);
      }
      //endregion
      return {
        restrict: 'A',
        link: function (scope, splitter, attrs) {
          var isActive = false;
          var userIsDragging = true;
          var vertical = attrs.ngSplitter === 'vertical';
          var sizeAttr = vertical ? 'width' : 'height';
          var posAttr = vertical ? 'clientX' : 'clientY';
          var lastPos;
          var lastSize = loadSize(splitter, sizeAttr);
          var lastCollapsed = loadIsCollapsed(splitter);
          var parent = splitter.parent();
          // Restore collapse target state (size and collapsed)
          // from last session
          resizeCollapseTarget(splitter, lastSize);
          toggleCollapseTarget(splitter, lastCollapsed);
          // Configure UI events
          splitter.on('mousedown', function onMouseDown(event) {
            // Only respond to left mouse button
            if (event.button !== 0) {
              return;
            }
            lastPos = event[posAttr];
            lastSize = loadSize(splitter, sizeAttr);
            lastCollapsed = loadIsCollapsed(splitter);
            isActive = true;
            parent.addClass('noselect');
          });
          ;
          angular.element($window).on('mousemove', function onMouseMove(event) {
            if (isActive) {
              userIsDragging = true;
              // Scale the collapse target
              var collapsed = performResizeCollapseTarget(splitter, sizeAttr, event[posAttr] - lastPos) === 0;
              // Collapse the target if its size has reached zero
              //
              // We don't want to toggle the state every 1px and for
              // that reason we compare current state with last one
              if (collapsed !== lastCollapsed) {
                toggleCollapseTarget(splitter, collapsed);
              }
              lastPos = event[posAttr];
              lastCollapsed = collapsed;
            }
          }).on('mouseup', function onMouseUp() {
            if (isActive) {
              if (lastCollapsed) {
                // Preserve collapse target's size if it
                // has reached collapsed state during drag & drop operation
                //
                // We do it to make sure collapsed target expands to proper size
                // when users try to expand it in current or next session
                toggleCollapseTarget(splitter, true);
                resizeCollapseTarget(splitter, lastSize);
              } else {
                saveSize(splitter, sizeAttr);
              }
              isActive = false;
              parent.removeClass('noselect');
            }
          });
          ;
          // Wire up the tiny button that handles collapse and expand operations
          splitter.children('.split').on('mousedown', function onClick() {
            userIsDragging = false;
          });
          splitter.children('.split').on('mouseup', function onClick() {
            // Need to make sure that the user is clicking, not dragging:
            if (!userIsDragging) {
              toggleCollapseTarget(splitter);
              userIsDragging = true;
              isActive = false;
            }
          });
        }
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('validate', []).directive('ngValidate', [
    '$parse',
    function ($parse) {
      return {
        require: 'ngModel',
        link: function (scope, element, attrs, ngModelController) {
          var fn = $parse(attrs.ngValidate);
          scope.$watch(attrs.ngModel, function (value) {
            var validity = fn(scope, { $value: value });
            ngModelController.$setValidity('validate', validity);
          });
        }
      };
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('autoFocus', []).directive('ngAutoFocus', [
    '$timeout',
    function ($timeout) {
      return {
        link: function (scope, element, attrs) {
          scope.$watch(attrs.ngAutoFocus, function (value) {
            if (!value) {
              return;
            }
            $timeout(function () {
              element[0].focus();
            }, 100);
          });
        }
      };
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('rightClick', []).directive('ngRightClick', [
    '$parse',
    function ($parse) {
      return function (scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.on('contextmenu', function (e) {
          scope.$apply(function () {
            e.preventDefault();
            fn(scope, { $event: e });
          });
        });
      };
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditor', function () {
    return {
      restrict: 'E',
      scope: {
        mockingServiceDisabled: '=',
        mockingServiceBaseUri: '='
      },
      templateUrl: 'views/raml-editor-main.tmpl.html',
      controller: 'ramlEditorMain'
    };
  });
  ;
}());
(function () {
  'use strict';
  angular.module('dragAndDrop', []).directive('ngDragEnter', [
    '$parse',
    function ($parse) {
      return function (scope, element, attrs) {
        var fn = $parse(attrs.ngDragEnter);
        var entered = 0;
        element.on('dragleave', function () {
          entered--;
        });
        element.on('dragenter', function (e) {
          entered++;
          if (entered !== 1) {
            return;
          }
          scope.$apply(function () {
            e.preventDefault();
            fn(scope, { $event: e });
          });
        });
      };
    }
  ]).directive('ngDragLeave', [
    '$parse',
    function ($parse) {
      return function (scope, element, attrs) {
        var fn = $parse(attrs.ngDragLeave);
        var entered = 0;
        element.on('dragenter', function () {
          entered++;
        });
        element.on('dragleave', function (e) {
          entered--;
          if (entered !== 0) {
            return;
          }
          scope.$apply(function () {
            e.preventDefault();
            fn(scope, { $event: e });
          });
        });
      };
    }
  ]).directive('ngDrop', [
    '$parse',
    function ($parse) {
      return function (scope, element, attrs) {
        var fn = $parse(attrs.ngDrop);
        element.on('dragover', function (e) {
          e.preventDefault();
        });
        element.on('drop', function (e) {
          scope.$apply(function () {
            e.preventDefault();
            e.stopPropagation();
            fn(scope, { $event: e.originalEvent });
          });
        });
      };
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorContextMenu', [
    '$injector',
    '$window',
    'confirmModal',
    'newNameModal',
    'ramlRepository',
    'newFileService',
    'newFolderService',
    'subMenuService',
    'scroll',
    function ramlEditorContextMenu($injector, $window, confirmModal, newNameModal, ramlRepository, newFileService, newFolderService, subMenuService, scroll) {
      function createActions(target) {
        var saveAction = {
            label: 'Save',
            execute: function execute() {
              return ramlRepository.saveFile(target);
            }
          };
        var newFileAction = {
            label: 'New File',
            fragments: newFileService.files['1.0'],
            execute: function execute(fragmentLabel) {
              if (fragmentLabel) {
                return newFileService.prompt(target, '1.0', fragmentLabel);
              }
            },
            newFile: function newFile() {
              return newFileService.prompt(target, '0.8');
            }
          };
        var newFolderAction = {
            label: 'New Folder',
            execute: function execute() {
              return newFolderService.prompt(target);
            }
          };
        var renameAction = {
            label: 'Rename',
            execute: function execute() {
              var parent = ramlRepository.getParent(target);
              var message = target.isDirectory ? 'Enter a new name for this folder:' : 'Enter a new name for this file:';
              var title = target.isDirectory ? 'Rename a folder' : 'Rename a file';
              var validations = [{
                    message: 'This name is already taken.',
                    validate: function validate(input) {
                      var path = ramlRepository.join(parent.path, input);
                      return !ramlRepository.getByPath(path);
                    }
                  }];
              return newNameModal.open(message, target.name, validations, title).then(function (name) {
                ramlRepository.rename(target, name);
              });
              ;
            }
          };
        var deleteAction = {
            label: 'Delete',
            execute: function execute() {
              var message;
              var title;
              if (target.isDirectory) {
                message = 'Are you sure you want to delete "' + target.name + '" and all its contents?';
                title = 'Delete folder';
              } else {
                message = 'Are you sure you want to delete "' + target.name + '"?';
                title = 'Delete file';
              }
              return confirmModal.open(message, title, {
                closeButtonLabel: 'Delete',
                closeButtonCssClass: 'btn-danger'
              }).then(function () {
                return ramlRepository.remove(target);
              });
              ;
            }
          };
        if (target.isDirectory) {
          return [
            newFileAction,
            newFolderAction,
            renameAction,
            deleteAction
          ];
        }
        return [
          saveAction,
          renameAction,
          deleteAction
        ];
      }
      function outOfWindow(el) {
        var rect = el.getBoundingClientRect();
        return !(rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth));
      }
      return {
        restrict: 'E',
        templateUrl: 'views/raml-editor-context-menu.tmpl.html',
        link: function link(scope, element) {
          scope.openFileMenu = function (action) {
            if (action.label === 'New File') {
              subMenuService.openSubMenu(scope, 'showFileMenu');
            }
          };
          scope.closeFileMenu = function () {
            scope.showFileMenu = false;
          };
          function positionMenu(element, event) {
            var top = event.pageY;
            var left = event.pageX;
            var menuContainer = angular.element(element[0].children[0]);
            menuContainer.css('top', top + 'px');
            menuContainer.css('left', left + 'px');
            setTimeout(function () {
              if (outOfWindow(menuContainer[0])) {
                menuContainer.css('top', top - menuContainer[0].offsetHeight + 'px');
              }
            }, 0);
          }
          function close(e) {
            if (e && e.target.firstChild.nodeValue.match('New File')) {
              return;
            }
            scroll.enable();
            scope.$apply(function () {
              delete contextMenuController.target;
              scope.opened = false;
              $window.removeEventListener('click', close);
              $window.removeEventListener('keydown', closeOnEscape);
            });
          }
          function closeOnEscape(e) {
            if (e.which === 27) {
              e.preventDefault();
              close();
            }
          }
          var contextMenuController = {
              open: function open(event, target) {
                scroll.disable();
                this.target = target;
                scope.actions = createActions(target);
                event.stopPropagation();
                positionMenu(element, event);
                $window.addEventListener('click', close);
                $window.addEventListener('keydown', closeOnEscape);
                scope.opened = true;
              }
            };
          scope.registerContextMenu(contextMenuController);
        },
        scope: true
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorFileBrowser', [
    '$q',
    '$window',
    '$rootScope',
    '$timeout',
    'config',
    'ramlRepository',
    'newNameModal',
    'importService',
    function ($q, $window, $rootScope, $timeout, config, ramlRepository, newNameModal, importService) {
      function Controller($scope) {
        var fileBrowser = this;
        var unwatchSelectedFile = angular.noop;
        var contextMenu = void 0;
        $scope.toggleFolderCollapse = function (node) {
          node.collapsed = !node.collapsed;
        };
        $scope.fileTreeOptions = function () {
          var duplicateName = false;
          return {
            accept: function (sourceNodeScope, destNodesScope, destIndex) {
              var accept;
              var source = sourceNodeScope.$modelValue;
              var dest = destIndex < 0 ? $scope.homeDirectory : destNodesScope.$modelValue[destIndex];
              // if the destination is a file, select its parent directory as destination
              if (!dest.isDirectory) {
                dest = destNodesScope.$nodeScope ? destNodesScope.$nodeScope.$modelValue : $scope.homeDirectory;
              }
              // Check if the destination is a child of the source
              var destIsChild = ramlRepository.getParent(source).path === dest.path || dest.path.slice(0, source.path.length) === source.path;
              duplicateName = dest.children.filter(function (c) {
                return c.name === source.name;
              }).length > 0;
              accept = !duplicateName && !destIsChild;
              if (accept) {
                fileBrowser.cursorState = 'ok';
              } else {
                fileBrowser.cursorState = 'no';
              }
              return accept;
            },
            dropped: function (event) {
              var source = event.source.nodeScope.$modelValue;
              var dest = event.dest.nodesScope.$nodeScope ? event.dest.nodesScope.$nodeScope.$modelValue : $scope.homeDirectory;
              // do the actual moving
              ramlRepository.move(source, dest).then(function () {
                return fileBrowser.select(source);
              });
            },
            dragStop: function (event) {
              // when drag is stopped or canceled, reset the cursor
              fileBrowser.cursorState = '';
              if (!event.canceled && duplicateName) {
                $rootScope.$broadcast('event:notification', {
                  message: 'Failed: duplicate file name found in the destination folder.',
                  expires: true,
                  level: 'error'
                });
              }
            }
          };
        }();
        fileBrowser.select = function select(target) {
          if (target.isDirectory) {
            return fileBrowser.selectDirectory(target);
          }
          return fileBrowser.selectFile(target);
        };
        $scope.$on('event:raml-editor-file-select', function (event, filePath) {
          var file = ramlRepository.getByPath(filePath);
          fileBrowser.selectFile(file);
        });
        fileBrowser.selectFile = function selectFile(file) {
          // If we select a file that is already active, just modify 'currentTarget', no load needed
          if (fileBrowser.selectedFile && fileBrowser.selectedFile.$$hashKey === file.$$hashKey) {
            fileBrowser.currentTarget = file;
            return;
          }
          unwatchSelectedFile();
          var isLoaded = file.loaded || !file.persisted;
          var afterLoading = isLoaded ? $q.when(file) : ramlRepository.loadFile(file);
          afterLoading.then(function (file) {
            fileBrowser.selectedFile = fileBrowser.currentTarget = file;
            $scope.$emit('event:raml-editor-file-selected', file);
            unwatchSelectedFile = $scope.$watch('fileBrowser.selectedFile.contents', function (newContents, oldContents) {
              if (newContents !== oldContents) {
                file.dirty = true;
              }
            });
          });
        };
        fileBrowser.selectDirectory = function selectDirectory(directory) {
          $scope.$emit('event:raml-editor-directory-selected', directory);
        };
        /**
         * This function is used for expanding all the ancestors of a target
         * node in the file tree.
         *
         * @param target {RamlDirectory/RamlFile}
         */
        function expandAncestors(target) {
          // stop at the top-level directory
          if (target.path === '/') {
            return;
          }
          var parent = ramlRepository.getParent(target);
          parent.collapsed = false;
          expandAncestors(parent);
        }
        fileBrowser.saveFile = function saveFile(file) {
          ramlRepository.saveFile(file).then(function () {
            return $rootScope.$broadcast('event:notification', {
              message: 'File saved.',
              expires: true
            });
          });
          ;
        };
        fileBrowser.dropFile = function dropFile(event, directory) {
          return importService.importFromEvent(directory, event).then(function () {
            directory.collapsed = false;
          }).catch(function (err) {
            $rootScope.$broadcast('event:notification', {
              message: err.message,
              expires: true,
              level: 'error'
            });
          });
        };
        fileBrowser.showContextMenu = function showContextMenu(event, target) {
          contextMenu.open(event, target);
        };
        fileBrowser.contextMenuOpenedFor = function contextMenuOpenedFor(target) {
          return contextMenu && contextMenu.target === target;
        };
        function saveListener(e) {
          if (e.which === 83 && (e.metaKey || e.ctrlKey) && !(e.shiftKey || e.altKey)) {
            e.preventDefault();
            $scope.$apply(function () {
              fileBrowser.saveFile(fileBrowser.selectedFile);
            });
          }
        }
        $window.addEventListener('keydown', saveListener);
        $scope.fileBrowser = fileBrowser;
        $scope.registerContextMenu = function registerContextMenu(cm) {
          contextMenu = cm;
        };
        $scope.$on('event:raml-editor-file-generated', function (event, file) {
          fileBrowser.selectFile(file);
        });
        $scope.$on('event:raml-editor-directory-created', function (event, dir) {
          fileBrowser.selectDirectory(dir);
        });
        $scope.$on('event:raml-editor-file-selected', function (event, file) {
          expandAncestors(file);
        });
        $scope.$on('event:raml-editor-directory-selected', function (event, dir) {
          expandAncestors(dir);
        });
        $scope.$on('event:raml-editor-filetree-modified', function (event, target) {
          ramlRepository.getParent(target).sortChildren();
        });
        $scope.$on('event:raml-editor-file-removed', function (event, file) {
          $timeout(function () {
            var files = $scope.homeDirectory.getFiles();
            if (files.length === 0) {
              promptWhenFileListIsEmpty();
            } else if (file === fileBrowser.selectedFile) {
              fileBrowser.selectFile(files[0]);
            }
          });
        });
        $scope.$on('$destroy', function () {
          $window.removeEventListener('keydown', saveListener);
        });
        // watch for selected file path changes, update config if needed
        $scope.$watch('fileBrowser.selectedFile.path', function (newPath, oldPath) {
          if (newPath !== oldPath) {
            config.set('currentFile', JSON.stringify({
              path: newPath,
              name: newPath.slice(newPath.lastIndexOf('/') + 1)
            }));
          }
        });
        function promptWhenFileListIsEmpty() {
          var defaultName = 'Untitled-1.raml';
          var message = 'File system has no files, please input a name for the new file:';
          var validation = [];
          var title = 'Add a new file';
          newNameModal.open(message, defaultName, validation, title).then(function (result) {
            return ramlRepository.generateFile($scope.homeDirectory, result);
          }, function () {
            return ramlRepository.generateFile($scope.homeDirectory, defaultName);
          });
        }
        /**
         * Finds a root file which should have `root` property set to `true`
         * starting at root directory and going down through hierarchy using DFS
         * and current position pointer instead of `shift` operation which is
         * expensive. If there are multiple root files, which should not happen,
         * it returns the very first one and stops the search.
         *
         * @param rootDirectory {RamlDirectory} A root directory to start search at
         *
         * @returns {RamlFile} A root file which is a file with `root` property set to `true`
         */
        function findRootFile(rootDirectory) {
          var queue = [rootDirectory];
          var pos = 0;
          while (pos < queue.length) {
            var directory = queue[pos];
            var files = directory.children;
            var entity = void 0;
            for (var i = 0; i < files.length; i++) {
              entity = files[i];
              if (entity.type === 'file' && entity.root) {
                return entity;
              }
              if (entity.type === 'directory') {
                queue.push(entity);
              }
            }
            pos += 1;
          }
        }
        ramlRepository.loadDirectory().then(function (directory) {
          $scope.homeDirectory = directory;
          fileBrowser.rootFile = findRootFile(directory);
          var files = [];
          $scope.homeDirectory.forEachChildDo(function (child) {
            if (!child.isDirectory) {
              files.push(child);
            }
          });
          if (!files.length) {
            promptWhenFileListIsEmpty();
            return;
          }
          // select a file in the following order:
          //   - previously selected file
          //   - root file
          //   - first file
          var currentFile = JSON.parse(config.get('currentFile', '{}'));
          var fileToOpen = ramlRepository.getByPath(currentFile.path) || fileBrowser.rootFile || files[0];
          fileBrowser.selectFile(fileToOpen);
        });
        ;
      }
      return {
        restrict: 'E',
        templateUrl: 'views/raml-editor-file-browser.tmpl.html',
        controller: Controller
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorProjectButton', [
    '$timeout',
    '$window',
    'subMenuService',
    function ramlEditorProjectButton($timeout, $window, subMenuService) {
      return {
        restrict: 'E',
        templateUrl: 'views/menu/project-menu.tmpl.html',
        link: function (scope) {
          scope.openProjectMenu = function () {
            subMenuService.open(scope, 'showProjectMenu');
          };
          scope.openFileMenu = function () {
            subMenuService.openSubMenu(scope, 'showFileMenu');
          };
          scope.closeFileMenu = function () {
            scope.showFileMenu = false;
          };
        }
      };
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorSaveFileButton', [
    '$rootScope',
    'ramlRepository',
    'ramlRepositoryConfig',
    function ramlEditorSaveFileButton($rootScope, ramlRepository, ramlRepositoryConfig) {
      return {
        restrict: 'E',
        replace: true,
        template: '<li role="save-button" ng-click="saveFile()">' + '<a><i class="fa fa-save"></i>&nbsp;Save</a>' + '</li>',
        link: function (scope) {
          scope.saveFile = function saveFile() {
            var file = scope.fileBrowser.selectedFile;
            return ramlRepository.saveFile(file).then(function success(file) {
              $rootScope.$broadcast('event:notification', {
                message: 'File saved.',
                expires: true
              });
              if (ramlRepositoryConfig.reloadFilesOnSave) {
                $rootScope.$broadcast('event:raml-editor-file-selected', file);
                file.dirty = false;
                file.persisted = true;
              }
            });
          };
        }
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorSaveAllButton', [
    '$rootScope',
    'ramlRepository',
    'ramlRepositoryConfig',
    function ramlEditorSaveAllButton($rootScope, ramlRepository, ramlRepositoryConfig) {
      return {
        restrict: 'E',
        replace: true,
        template: '<li role="save-all-button" ng-click="saveAllFiles()">' + '<a><i class="fa fa-save"></i>&nbsp;Save All</a>' + '</li>',
        link: function (scope) {
          scope.saveAllFiles = function saveAllFiles() {
            var file = scope.fileBrowser.selectedFile;
            return ramlRepository.saveAllFiles(file).then(function success(file) {
              $rootScope.$broadcast('event:notification', {
                message: 'All files saved.',
                expires: true
              });
              if (ramlRepositoryConfig.reloadFilesOnSave) {
                console.log(scope.homeDirectory);
                $rootScope.$broadcast('event:raml-editor-file-selected', file);
                file.dirty = false;
                file.persisted = true;
              }
            });
          };
          $rootScope.$on('event:save-all', function () {
            scope.saveAllFiles();
          });
        }
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorNewFolderButton', [
    'newFolderService',
    function ramlEditorNewFolderButton(newFolderService) {
      return {
        restrict: 'E',
        replace: true,
        template: '<li ng-show="supportsFolders" role="new-folder-button" ng-click="newFolder()">' + '<a><i class="fa fa-folder-open"></i>&nbsp;New Folder</a>' + '</li>',
        link: function (scope) {
          scope.newFolder = function newFolder() {
            return newFolderService.prompt(scope.homeDirectory);
          };
        }
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorNewFileMenu', [
    'newFileService',
    'subMenuService',
    function ramlEditorNewFileMenu(newFileService, subMenuService) {
      return {
        restrict: 'E',
        replace: true,
        scope: {
          showFileMenu: '=',
          showFragmentMenu: '=',
          openFileMenuCondition: '@',
          menuRole: '@'
        },
        templateUrl: 'views/menu/new-file-menu.tmpl.html',
        link: function (scope) {
          scope.closeFragmentMenu = function () {
            scope.showFragmentMenu = false;
          };
          scope.openFragmentMenu = function () {
            subMenuService.openSubMenu(scope, 'showFragmentMenu');
            scope.fragments = newFileService.files['1.0'];
          };
          scope.newFragmentFile = function newFragmentFile(fragmentType) {
            return newFileService.newFragmentFile(scope.$parent.homeDirectory, fragmentType);
          };
          scope.newFile = function newFile(version) {
            return newFileService.newFile(scope.$parent.homeDirectory, version);
          };
          scope.notSorted = function (fragments) {
            if (!fragments) {
              return [];
            }
            return Object.keys(fragments).map(function (f) {
              return fragments[f];
            });
          };
        }
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorExportMenu', [
    'ramlRepository',
    'subMenuService',
    'ramlToSwagger',
    '$window',
    '$location',
    '$rootScope',
    function ramlEditorExportMenu(ramlRepository, subMenuService, ramlToSwagger, $window, $location, $rootScope) {
      return {
        restrict: 'E',
        templateUrl: 'views/menu/export-menu.tmpl.html',
        link: function (scope) {
          scope.xOasExport = scope.xOasExport || $location.search().xOasExport === 'true';
          function saveFile(yaml, name) {
            var blob = new Blob([yaml], { type: 'application/json;charset=utf-8' });
            $window.saveAs(blob, name);
          }
          function broadcastError(msg) {
            return $rootScope.$broadcast('event:notification', {
              message: msg,
              expires: true,
              level: 'error'
            });
          }
          function replaceExtension(path, ext) {
            var index = path.lastIndexOf('.');
            if (index > -1) {
              path = path.substr(0, index);
            }
            return path + '.' + ext;
          }
          scope.openExportMenu = function () {
            subMenuService.openSubMenu(scope, 'showExportMenu');
          };
          scope.closeExportMenu = function () {
            scope.showExportMenu = false;
          };
          scope.exportZipFiles = function exportZipFiles() {
            ramlRepository.exportFiles();
          };
          scope.exportJsonFiles = function exportJsonFiles() {
            var selectedFile = scope.fileBrowser.selectedFile;
            ramlToSwagger.json(selectedFile).then(function (convert) {
              var lines = JSON.stringify(convert.contents, null, 2);
              saveFile(lines, replaceExtension(convert.name, 'json'));
            }).catch(function (error) {
              broadcastError(error);
            });
          };
          scope.exportYamlFiles = function exportYamlFiles() {
            var selectedFile = scope.fileBrowser.selectedFile;
            ramlToSwagger.yaml(selectedFile).then(function (convert) {
              saveFile(convert.contents, replaceExtension(convert.name, 'yaml'));
            }).catch(function (error) {
              broadcastError(error);
            });
          };
        }
      };
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorImportButton', [
    '$injector',
    'importModal',
    function ramlEditorImportButton($injector, importModal) {
      return {
        restrict: 'E',
        replace: true,
        template: '<li role="import-button" ng-click="importFile()">' + '<a><i class="fa fa-cloud-download"></i>&nbsp;Import</a>' + '</li>',
        link: function (scope) {
          scope.importFile = function importFile() {
            return importModal.open();
          };
        }
      };
    }
  ]);
  ;
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorViewButton', [
    '$timeout',
    '$window',
    'subMenuService',
    '$rootScope',
    function ramlEditorViewButton($timeout, $window, subMenuService, $rootScope) {
      return {
        restrict: 'E',
        templateUrl: 'views/menu/view-menu.tmpl.html',
        link: function (scope) {
          scope.openViewMenu = function () {
            subMenuService.open(scope, 'showViewMenu');
          };
          scope.toogleBackgroundColor = function () {
            $rootScope.$broadcast('event:toggle-theme');
          };
        }
      };
    }
  ]);
}());
(function () {
  'use strict';
  angular.module('ramlEditorApp').directive('ramlEditorHelpButton', [
    '$modal',
    '$timeout',
    '$window',
    'subMenuService',
    function ramlEditorHelpButton($modal, $timeout, $window, subMenuService) {
      return {
        restrict: 'E',
        templateUrl: 'views/menu/help-menu.tmpl.html',
        link: function (scope) {
          scope.openHelpContextMenu = function () {
            subMenuService.open(scope, 'menuContextHelpOpen');
          };
          scope.openHelpModal = function openHelpModal() {
            $modal.open({ templateUrl: 'views/modal/help.html' });
          };
        }
      };
    }
  ]);
}());
/**
 * This file overwrites the ui-tree-node directive from the angular-ui-tree
 * module to modify the behaviour of tree drag-and-drop to better suit the use case
 * of file trees
 */
(function () {
  'use strict';
  angular.module('ui.tree').directive('uiTreeNode', [
    'treeConfig',
    '$uiTreeHelper',
    '$window',
    '$document',
    '$timeout',
    'ramlRepository',
    'config',
    function (treeConfig, $uiTreeHelper, $window, $document, $timeout, ramlRepository, config) {
      return {
        require: [
          '^uiTreeNodes',
          '^uiTree',
          '?uiTreeNode'
        ],
        link: function (scope, element, attrs, controllersArr) {
          var currentConfig = {};
          angular.extend(currentConfig, treeConfig);
          if (currentConfig.nodeClass) {
            element.addClass(currentConfig.nodeClass);
          }
          scope.init(controllersArr);
          scope.collapsed = !!$uiTreeHelper.getNodeAttribute(scope, 'collapsed');
          scope.$watch(attrs.collapsed, function (val) {
            if (typeof val === 'boolean') {
              scope.collapsed = val;
            }
          });
          scope.$watch('collapsed', function (val) {
            $uiTreeHelper.setNodeAttribute(scope, 'collapsed', val);
            attrs.$set('collapsed', val);
          });
          var elements;
          // As a parameter for callbacks
          var firstMoving, dragInfo, pos, dropAccpeted;
          var dragElm, hiddenPlaceElm;
          var hasTouch = 'ontouchstart' in window;
          var dragDelaying = true;
          var dragStarted = false;
          var dragTimer = null;
          var dragCanceled = false;
          var expandTimer = null;
          var expandDelay = 1000;
          // ms
          var body = document.body, html = document.documentElement, documentHeight, documentWidth;
          var dragStart = function (e) {
            if (!hasTouch && (e.button === 2 || e.which === 3)) {
              // disable right click
              return;
            }
            if (e.uiTreeDragging || e.originalEvent && e.originalEvent.uiTreeDragging) {
              // event has already fired in other scope.
              return;
            }
            // the element which is clicked
            var eventElm = angular.element(e.target);
            var eventScope = eventElm.scope();
            if (!eventScope || !eventScope.$type) {
              return;
            }
            if (eventScope.$type !== 'uiTreeNode' && eventScope.$type !== 'uiTreeHandle') {
              // Check if it is a node or a handle
              return;
            }
            if (eventScope.$type === 'uiTreeNode' && eventScope.$handleScope) {
              // If the node has a handle, then it should be clicked by the handle
              return;
            }
            var eventElmTagName = eventElm.prop('tagName').toLowerCase();
            if (eventElmTagName === 'input' || eventElmTagName === 'textarea' || eventElmTagName === 'button' || eventElmTagName === 'select') {
              // if it's a input or button, ignore it
              return;
            }
            // check if it or it's parents has a 'data-nodrag' attribute
            while (eventElm && eventElm[0] && eventElm[0] !== element) {
              if ($uiTreeHelper.nodrag(eventElm)) {
                // if the node mark as `nodrag`, DONOT drag it.
                return;
              }
              eventElm = eventElm.parent();
            }
            if (!scope.beforeDrag(scope)) {
              return;
            }
            e.uiTreeDragging = true;
            // stop event bubbling
            if (e.originalEvent) {
              e.originalEvent.uiTreeDragging = true;
            }
            e.preventDefault();
            var eventObj = $uiTreeHelper.eventObj(e);
            firstMoving = true;
            dragInfo = $uiTreeHelper.dragInfo(scope);
            var tagName = scope.$element.prop('tagName');
            hiddenPlaceElm = angular.element($window.document.createElement(tagName));
            if (currentConfig.hiddenClass) {
              hiddenPlaceElm.addClass(currentConfig.hiddenClass);
            }
            pos = $uiTreeHelper.positionStarted(eventObj, scope.$element);
            dragElm = angular.element($window.document.createElement(scope.$parentNodesScope.$element.prop('tagName'))).addClass(scope.$parentNodesScope.$element.attr('class')).addClass(currentConfig.dragClass).addClass(config.get('theme') === 'light' ? 'drag-light' : '');
            dragElm.css('z-index', 9999);
            scope.$element.after(hiddenPlaceElm);
            dragElm.append(scope.$element.clone().html(scope.$element.children()[0].innerHTML));
            var fileBrowserElement = $document.find('raml-editor-file-browser');
            fileBrowserElement.append(dragElm);
            var left = eventObj.pageX - pos.offsetX - fileBrowserElement.offset().left;
            var top = eventObj.pageY - pos.offsetY - fileBrowserElement.offset().top;
            dragElm.css({
              'left': left + 'px',
              'top': top + 'px'
            });
            elements = { dragging: dragElm };
            scope.$element.addClass('drag-elm');
            // get the node that is being dragged collasp it
            var dragNode = angular.element(dragElm[0].lastChild).scope();
            dragNode.collapsed = true;
            angular.element($document).bind('touchend', dragEndEvent);
            angular.element($document).bind('touchcancel', dragEndEvent);
            angular.element($document).bind('touchmove', dragMoveEvent);
            angular.element($document).bind('mouseup', dragEndEvent);
            angular.element($document).bind('mousemove', dragMoveEvent);
            angular.element($document).bind('mouseleave', dragCancelEvent);
            documentHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
            documentWidth = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
            scope.$treeScope.isDragging = true;
          };
          var dragMove = function (e) {
            if (!dragStarted) {
              if (!dragDelaying) {
                dragStarted = true;
                scope.$apply(function () {
                  scope.$callbacks.dragStart(dragInfo.eventArgs(elements, pos));
                });
              }
              return;
            }
            var eventObj = $uiTreeHelper.eventObj(e);
            var leftElmPos, topElmPos, boundingRect;
            if (dragElm) {
              e.preventDefault();
              if ($window.getSelection) {
                $window.getSelection().removeAllRanges();
              } else if ($window.document.selection) {
                $window.document.selection.empty();
              }
              var fileBrowserElement = $document.find('raml-editor-file-browser');
              leftElmPos = eventObj.pageX - pos.offsetX - fileBrowserElement.offset().left;
              topElmPos = eventObj.pageY - pos.offsetY - fileBrowserElement.offset().top;
              boundingRect = {
                left: leftElmPos,
                right: leftElmPos + dragElm[0].scrollWidth + 5,
                top: topElmPos,
                bottom: topElmPos + dragElm[0].scrollHeight
              };
              // check horizontal boundaries
              if (boundingRect.left < 0) {
                leftElmPos = 0;
              } else if (boundingRect.right > documentWidth) {
                leftElmPos = documentWidth - dragElm[0].scrollWidth - 5;
              }
              // check vertical boundaries
              if (boundingRect.top < 0) {
                topElmPos = 0;
              } else if (boundingRect.bottom > documentHeight) {
                topElmPos = documentHeight - dragElm[0].scrollHeight;
              }
              dragElm.css({
                'left': leftElmPos + 'px',
                'top': topElmPos + 'px'
              });
              var topScroll = window.pageYOffset || $window.document.documentElement.scrollTop;
              var bottomScroll = topScroll + (window.innerHeight || $window.document.clientHeight || $window.document.clientHeight);
              // to scroll down if cursor y-position is greater than the bottom position the vertical scroll
              if (bottomScroll < eventObj.pageY && bottomScroll <= documentHeight) {
                window.scrollBy(0, 10);
              }
              // to scroll top if cursor y-position is less than the top position the vertical scroll
              if (topScroll > eventObj.pageY) {
                window.scrollBy(0, -10);
              }
              $uiTreeHelper.positionMoved(e, pos, firstMoving);
              if (firstMoving) {
                firstMoving = false;
                return;
              }
              // Select the drag target. Because IE does not support CSS 'pointer-events: none', it will always
              // pick the drag element itself as the target. To prevent this, we hide the drag element while
              // selecting the target.
              var displayElm;
              if (angular.isFunction(dragElm.hide)) {
                dragElm.hide();
              } else {
                displayElm = dragElm[0].style.display;
                dragElm[0].style.display = 'none';
              }
              var targetX = eventObj.pageX - $window.document.body.scrollLeft;
              var targetY = eventObj.pageY - (window.pageYOffset || $window.document.documentElement.scrollTop);
              // when using elementFromPoint() inside an iframe, you have to call
              // elementFromPoint() twice to make sure IE8 returns the correct value
              $window.document.elementFromPoint(targetX, targetY);
              var targetElm = angular.element($window.document.elementFromPoint(targetX, targetY));
              if (angular.isFunction(dragElm.show)) {
                dragElm.show();
              } else {
                dragElm[0].style.display = displayElm;
              }
              var targetNode = targetElm.scope();
              if (!pos.dirAx && targetNode !== scope.prevHoverNode) {
                var isEmpty = false;
                scope.prevHoverNode = targetNode;
                if (!targetNode) {
                  return;
                }
                if (targetNode.$type === 'uiTree' && targetNode.dragEnabled) {
                  isEmpty = targetNode.isEmpty();  // Check if it's empty tree
                }
                if (targetNode.$type === 'uiTreeHandle') {
                  targetNode = targetNode.$nodeScope;
                }
                if (targetNode.$type === 'uiTreeDummyNode') {
                  // Check if it is dropped at the tree root
                  dropAccpeted = targetNode.$parentNodesScope.accept(scope, -1);
                  if (dropAccpeted) {
                    dragInfo.moveTo(targetNode.$parentNodesScope, targetNode.$parentNodesScope.childNodes(), findInsertIndex(scope.$modelValue, targetNode.$parentNodesScope.$modelValue));
                  }
                  $('.dragover').removeClass('dragover');
                  targetElm.addClass('dragover');
                  if (expandTimer) {
                    $timeout.cancel(expandTimer);
                    expandTimer = null;
                  }
                  return;
                }
                if (targetNode.$type !== 'uiTreeNode' && !isEmpty) {
                  // Check if it is a uiTreeNode or it's an empty tree
                  return;
                }
                $timeout.cancel(expandTimer);
                $('.dragover').removeClass('dragover');
                if (targetNode.$childNodesScope) {
                  // It's a folder
                  angular.element(targetNode.$element.children()[0]).addClass('dragover');
                  // Expand the folder automatically if it was originally collapsed
                  if (targetNode.collapsed) {
                    expandTimer = $timeout(function () {
                      targetNode.collapsed = false;
                      scope.nodeToExpand = null;
                    }, expandDelay);
                  }
                  scope.nodeToExpand = targetNode;
                } else if (targetNode.$parentNodeScope) {
                  // It's a file, we modify its parent
                  targetElm.addClass('dragover');
                  angular.element(targetNode.$parentNodeScope.$element.children()[0]).addClass('dragover');
                  scope.nodeToExpand = targetNode.$parentNodeScope;
                } else {
                  // file at root
                  targetElm.addClass('dragover');
                }
                if (isEmpty) {
                  // it's an empty tree
                  if (targetNode.$nodesScope.accept(scope, 0)) {
                    dragInfo.moveTo(targetNode.$nodesScope, targetNode.$nodesScope.childNodes(), 0);
                  }
                } else if (targetNode.dragEnabled()) {
                  // drag enabled
                  targetElm = targetNode.$element;
                  // Get the element of ui-tree-node
                  dropAccpeted = targetNode.$parentNodesScope.accept(scope, targetNode.index());
                  if (dropAccpeted) {
                    if (targetNode.$childNodesScope) {
                      dragInfo.moveTo(targetNode.$childNodesScope, targetNode.childNodes(), findInsertIndex(scope.$modelValue, targetNode.$childNodesScope.$modelValue));
                    } else {
                      dragInfo.moveTo(targetNode.$parentNodesScope, targetNode.$parentNodesScope.childNodes(), findInsertIndex(scope.$modelValue, targetNode.$parentNodesScope.$modelValue));
                    }
                  }
                }
              }
              scope.$apply(function () {
                scope.$callbacks.dragMove(dragInfo.eventArgs(elements, pos));
              });
            }
          };
          var dragEnd = function (e) {
            e.preventDefault();
            if (dragElm) {
              scope.$treeScope.$apply(function () {
                scope.$callbacks.beforeDrop(dragInfo.eventArgs(elements, pos));
              });
              // roll back elements changed
              hiddenPlaceElm.replaceWith(scope.$element);
              dragElm.remove();
              dragElm = null;
              if (scope.$$apply) {
                dragInfo.apply();
                scope.$treeScope.$apply(function () {
                  scope.$callbacks.dropped(dragInfo.eventArgs(elements, pos));
                });
              } else {
                bindDrag();
              }
              scope.$treeScope.$apply(function () {
                var eventArgs = dragInfo.eventArgs(elements, pos);
                eventArgs.canceled = dragCanceled;
                scope.$callbacks.dragStop(eventArgs);
              });
              scope.$$apply = false;
              dragInfo = null;
            }
            angular.element($document).unbind('touchend', dragEndEvent);
            // Mobile
            angular.element($document).unbind('touchcancel', dragEndEvent);
            // Mobile
            angular.element($document).unbind('touchmove', dragMoveEvent);
            // Mobile
            angular.element($document).unbind('mouseup', dragEndEvent);
            angular.element($document).unbind('mousemove', dragMoveEvent);
            angular.element($window.document.body).unbind('mouseleave', dragCancelEvent);
            // reset variables
            $('.dragover').removeClass('dragover');
            scope.$element.removeClass('drag-elm');
            scope.$treeScope.isDragging = false;
            scope.prevHoverNode = null;
            dragCanceled = false;
          };
          // find the index to insert a element into a sorted array
          var findInsertIndex = function (source, dest) {
            var low = 0, high = dest.length - 1, mid;
            while (high >= low) {
              mid = Math.floor((low + high) / 2);
              if (ramlRepository.sortingFunction.call(null, dest[mid], source) > 0) {
                high = mid - 1;
              } else {
                low = mid + 1;
              }
            }
            return low;
          };
          var dragStartEvent = function (e) {
            if (scope.dragEnabled()) {
              dragStart(e);
            }
          };
          var dragMoveEvent = function (e) {
            dragMove(e);
          };
          var dragEndEvent = function (e) {
            scope.$$apply = dropAccpeted;
            dragEnd(e);
          };
          var dragCancelEvent = function (e) {
            scope.$$apply = false;
            dragCanceled = true;
            dragEnd(e);
          };
          var bindDrag = function () {
            $timeout(function () {
              element.unbind();
              element.bind('touchstart mousedown', function (e) {
                dragDelaying = true;
                dragStarted = false;
                dragTimer = $timeout(function () {
                  dragDelaying = false;
                  dragStartEvent(e);
                }, scope.dragDelay);
              });
              element.bind('touchend touchcancel mouseup', function () {
                $timeout.cancel(dragTimer);
              });
            });
          };
          bindDrag();
          angular.element($window.document.body).bind('keydown', function (e) {
            if (e.keyCode === 27) {
              dragCancelEvent(e);
            }
          });
        }
      };
    }
  ]).directive('uiTreeDummyNode', [
    'treeConfig',
    function (treeConfig) {
      return {
        require: [
          '^uiTreeNodes',
          '^uiTree'
        ],
        template: '<div class="file-item dummy" ng-class="{\'no-drop\': fileBrowser.cursorState === \'no\', copy: fileBrowser.cursorState === \'ok\'}"></div>',
        restrict: 'E',
        replace: true,
        controller: function ($scope, $element) {
          this.scope = $scope;
          $scope.$element = $element;
          $scope.$parentNodeScope = null;
          // uiTreeNode Scope of parent node;
          $scope.$childNodesScope = null;
          // uiTreeNodes Scope of child nodes.
          $scope.$parentNodesScope = null;
          // uiTreeNodes Scope of parent nodes.
          $scope.$treeScope = null;
          // uiTree scope
          $scope.$$apply = false;
          $scope.$type = 'uiTreeDummyNode';
          $scope.init = function (controllersArr) {
            var treeNodesCtrl = controllersArr[0];
            $scope.$treeScope = controllersArr[1] ? controllersArr[1].scope : null;
            // find the scope of it's parent node
            $scope.$parentNodeScope = treeNodesCtrl.scope.$nodeScope;
            $scope.$parentNodesScope = treeNodesCtrl.scope;
          };
        },
        link: function (scope, element, attr, controllersArr) {
          var config = {};
          angular.extend(config, treeConfig);
          if (config.nodeClass) {
            element.addClass(config.nodeClass);
          }
          scope.init(controllersArr);
        }
      };
    }
  ]);
}());
angular.module('ramlEditorApp').run([
  '$templateCache',
  function ($templateCache) {
    'use strict';
    $templateCache.put('views/confirm-modal.html', '<form name="form" novalidate>\n' + '  <div class="modal-header">\n' + '    <h3>{{title}}</h3>\n' + '  </div>\n' + '\n' + '  <div class="modal-body">\n' + '    <p>{{message}}</p>\n' + '  </div>\n' + '\n' + '  <div class="modal-footer">\n' + '    <button type="button" class="btn btn-default" ng-click="$dismiss()">{{dismissButtonLabel}}</button>\n' + '    <button type="button" class="btn btn-default" ng-if="canDiscard" ng-click="discard()">{{discardButtonLabel}}</button>\n' + '    <button type="button" class="btn" ng-class="closeButtonCssClass" ng-click="$close()" ng-auto-focus="true">{{closeButtonLabel}}</button>\n' + '  </div>\n' + '</form>\n');
    $templateCache.put('views/import-modal.html', '<form name="form" novalidate ng-submit="import(form)">\n' + '  <div class="modal-header">\n' + '    <h3>Import file (beta)</h3>\n' + '  </div>\n' + '\n' + '  <div class="modal-body" ng-class="{\'has-error\': submittedType === mode.type && form.$invalid}">\n' + '    <div style="text-align: center; font-size: 2em; margin-bottom: 1em;" ng-show="importing">\n' + '      <i class="fa fa-spin fa-spinner"></i>\n' + '    </div>\n' + '\n' + '    <div class="form-group" style="margin-bottom: 10px;">\n' + '      <div style="float: left; width: 130px;">\n' + '        <select class="form-control" ng-model="mode" ng-options="option.name for option in options"></select>\n' + '      </div>\n' + '\n' + '      <div style="margin-left: 145px;" ng-switch="mode.type">\n' + '        <input id="swagger" name="swagger" type="url" ng-model="mode.value" class="form-control" required ng-switch-when="url" placeholder="http://petstore.swagger.io/v2/swagger.json">\n' + '\n' + '        <input id="file" name="file" type="file" ng-model="mode.value" class="form-control" required ng-switch-when="file" onchange="angular.element(this).scope().handleFileSelect(this)">\n' + '      </div>\n' + '    </div>\n' + '\n' + '    <div ng-if="submittedType === \'url\'">\n' + '      <p class="help-block" ng-show="form.swagger.$error.required || form.swagger.$error.url">Please provide a valid URL.</p>\n' + '    </div>\n' + '\n' + '    <div ng-if="submittedType === \'file\'">\n' + '      <p class="help-block" ng-show="form.file.$error.required">Please select a file to import.</p>\n' + '    </div>\n' + '\n' + '    <div ng-if="mode.type === \'file\'">\n' + '      <p>If you want to upload multiple files, you can .zip them and import them in a single step.</p>\n' + '    </div>\n' + '\n' + '    <div ng-if="mode.spec === \'OAS\'">\n' + '      <p>Note: Currently supports OAS (Swagger) v2.0</p>\n' + '    </div>\n' + '  </div>\n' + '\n' + '  <div class="modal-footer" style="margin-top: 0;">\n' + '    <button type="button" class="btn btn-default" ng-click="$dismiss()">Close</button>\n' + '    <button type="submit" class="btn btn-primary">Import</button>\n' + '  </div>\n' + '</form>\n');
    $templateCache.put('views/import-service-conflict-modal.html', '<form name="form" novalidate>\n' + '  <div class="modal-header">\n' + '    <h3>Path already exists</h3>\n' + '  </div>\n' + '\n' + '  <div class="modal-body">\n' + '    The path (<strong>{{path}}</strong>) already exists.\n' + '  </div>\n' + '\n' + '  <div class="modal-footer">\n' + '    <button type="button" class="btn btn-default pull-left" ng-click="skip()">Skip</button>\n' + '    <button type="submit" class="btn btn-primary" ng-click="keep()">Keep Both</button>\n' + '    <button type="submit" class="btn btn-primary" ng-click="replace()">Replace</button>\n' + '  </div>\n' + '</form>\n');
    $templateCache.put('views/menu/export-menu.tmpl.html', '<li ng-if="!xOasExport" role="export-zip" ng-click="exportZipFiles()">\n' + '  <a><i class="fa fa-download"></i>&nbsp;Export files</a>\n' + '</li>\n' + '\n' + '<a ng-if="xOasExport">\n' + '  <i class="fa fa-plus"></i>&nbsp;Export\n' + '  <i class="submenu-icon fa fa-caret-right"></i>\n' + '</a>\n' + '\n' + '<ul ng-if="xOasExport" role="menu-dropdown" class="submenu-item menu-item-context" ng-show="showExportMenu">\n' + '  <li role="export-zip" ng-click="exportZipFiles()"><a>&nbsp;Project Zip</a></li>\n' + '  <li role="export-json" ng-click="exportJsonFiles()"><a>&nbsp;OAS 2.0 JSON</a></li>\n' + '  <li role="export-yaml" ng-click="exportYamlFiles()"><a>&nbsp;OAS 2.0 YAML</a></li>\n' + '</ul>\n');
    $templateCache.put('views/menu/help-menu.tmpl.html', '<span role="help-button" class="menu-item-toggle" ng-click="openHelpContextMenu($event)">\n' + '  <i class="fa fa-question-circle"></i>&nbsp;Help\n' + '  <i class="menu-icon fa fa-caret-down"></i>\n' + '</span>\n' + '<ul role="menu-dropdown" class="menu-item-context" ng-show="menuContextHelpOpen">\n' + '  <li role="context-menu-item"><a role="raml-specification" href="https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md" target="_blank">RAML Specification</a></li>\n' + '  <li rile="context-menu-item"><a role="raml-website" href="http://raml.org" target="_blank">raml.org Website</a></li>\n' + '  <li role="context-menu-item"><a role="report-raml-bug" href="https://github.com/mulesoft/api-designer/issues" target="_blank">Report a Bug</a></li>\n' + '  <li role="context-menu-item"><a role="raml-guide" href="http://raml.org/docs.html" target="_blank">Getting Started Guide</a></li>\n' + '  <li role="context-menu-item" ng-click="openHelpModal()"><a role="raml-about">About</a></li>\n' + '</ul>\n');
    $templateCache.put('views/menu/new-file-menu.tmpl.html', '<ul role="{{menuRole}}" class="submenu-item menu-item-context" ng-show="showFileMenu">\n' + '  <li role="context-menu-item" ng-mouseenter="openFragmentMenu()" ng-mouseleave="closeFragmentMenu()">\n' + '    <a>\n' + '        &nbsp;Raml 1.0\n' + '        <i class="submenu-icon fa fa-caret-right"></i>\n' + '    </a>\n' + '\n' + '    <ul role="{{menuRole}}" class="submenu-item menu-item-context" ng-show="{{ openFileMenuCondition }}">\n' + '      <li role="new-raml-{{fragment.name}}" ng-repeat="fragment in notSorted(fragments)" ng-click="newFragmentFile(fragment.label)">\n' + '        <a>&nbsp;{{ fragment.name }}</a>\n' + '      </li>\n' + '    </ul>\n' + '  </li>\n' + '\n' + '  <li role="new-raml-0.8" ng-click="newFile(\'0.8\')">\n' + '    <a>&nbsp;Raml 0.8 API Spec</a>\n' + '  </li>\n' + '</ul>\n');
    $templateCache.put('views/menu/project-menu.tmpl.html', '<span class="menu-item-toggle" role="project-button" ng-click="openProjectMenu($event)">\n' + '  <i class="fa fa-cogs"></i>&nbsp;Project\n' + '  <i class="menu-icon fa fa-caret-down"></i>\n' + '</span>\n' + '<ul role="menu-dropdown" class="menu-item-context" ng-show="showProjectMenu">\n' + '  <li role="new-file" ng-mouseenter="openFileMenu()" ng-mouseleave="closeFileMenu()">\n' + '    <a>\n' + '      <i class="fa fa-plus"></i>&nbsp;New File\n' + '      <i class="submenu-icon fa fa-caret-right"></i>\n' + '    </a>\n' + '    <raml-editor-new-file-menu show-file-menu="showFileMenu" show-fragment-menu="showFragmentMenu" open-file-menu-condition="showFragmentMenu" menu-role="menu-dropdown"></raml-editor-new-file-menu>\n' + '  </li>\n' + '\n' + '  <raml-editor-new-folder-button></raml-editor-new-folder-button>\n' + '\n' + '  <raml-editor-save-file-button></raml-editor-save-file-button>\n' + '\n' + '  <raml-editor-save-all-button></raml-editor-save-all-button>\n' + '\n' + '  <raml-editor-import-button></raml-editor-import-button>\n' + '\n' + '  <raml-editor-export-menu ng-if="!xOasExport"></raml-editor-export-menu>\n' + '\n' + '  <li role="context-menu-item" class="submenu" ng-mouseenter="openExportMenu()" ng-mouseleave="closeExportMenu()" ng-show="xOasExport && canExportFiles()">\n' + '    <raml-editor-export-menu></raml-editor-export-menu>\n' + '  </li>\n' + '</ul>\n');
    $templateCache.put('views/menu/view-menu.tmpl.html', '<span class="menu-item-toggle" ng-click="openViewMenu($event)">\n' + '  <i class="fa fa-edit"></i>&nbsp;View\n' + '  <i class="menu-icon fa fa-caret-down"></i>\n' + '</span>\n' + '<ul role="menu-dropdown" class="menu-item-context" ng-show="showViewMenu">\n' + '  <li role="toogle-background" ng-click="toogleBackgroundColor()">\n' + '      <a>&nbsp;Toggle Background Color</a>\n' + '  </li>\n' + '</ul>\n' + '\n');
    $templateCache.put('views/modal/help.html', '<div class="modal-header">\n' + '    <h3>About</h3>\n' + '</div>\n' + '\n' + '<div class="modal-body">\n' + '    <p>\n' + '        The API Designer for RAML is built by MuleSoft, and is a web-based editor designed to help you author RAML specifications for your APIs.\n' + '        <br />\n' + '        <br />\n' + '        RAML is a human-and-machine readable modeling language for REST APIs, backed by a workgroup of industry leaders.\n' + '    </p>\n' + '\n' + '    <p>\n' + '        To learn more about the RAML specification and other tools which support RAML, please visit <a href="http://www.raml.org" target="_blank">http://www.raml.org</a>.\n' + '        <br />\n' + '        <br />\n' + '        For specific questions, or to get help from the community, head to the community forum at <a href="http://forums.raml.org" target="_blank">http://forums.raml.org</a>.\n' + '    </p>\n' + '</div>\n');
    $templateCache.put('views/new-name-modal.html', '<form name="form" novalidate ng-submit="submit(form)">\n' + '  <div class="modal-header">\n' + '    <h3>{{input.title}}</h3>\n' + '  </div>\n' + '\n' + '  <div class="modal-body">\n' + '    <!-- name -->\n' + '    <div class="form-group" ng-class="{\'has-error\': form.$submitted && form.name.$invalid}">\n' + '      <p>\n' + '        {{input.message}}\n' + '      </p>\n' + '      <p ng-if="input.link">\n' + '        Learn more\n' + '        <a target="_blank" href="{{input.link}}">\n' + '          <i class="fa fa-external-link"></i>\n' + '        </a>\n' + '      </p>\n' + '      <!-- label -->\n' + '      <label for="name" class="control-label required-field-label">Name</label>\n' + '\n' + '      <!-- input -->\n' + '      <input id="name" name="name" type="text"\n' + '             ng-model="input.newName" class="form-control"\n' + '             ng-validate="isValid($value)"\n' + '             ng-maxlength="64" ng-auto-focus="true" value="{{input.suggestedName}}" required>\n' + '\n' + '      <!-- error -->\n' + '      <p class="help-block" ng-show="form.$submitted && form.name.$error.required">Please provide a name.</p>\n' + '      <p class="help-block" ng-show="form.$submitted && form.name.$error.maxlength">Name must be shorter than 64 characters.</p>\n' + '      <p class="help-block" ng-show="form.$submitted && form.name.$error.validate">{{validationErrorMessage}}</p>\n' + '    </div>\n' + '  </div>\n' + '\n' + '  <div class="modal-footer">\n' + '    <button type="button" class="btn btn-default" ng-click="$dismiss()">Cancel</button>\n' + '    <button type="submit" class="btn btn-primary">OK</button>\n' + '  </div>\n' + '</form>\n');
    $templateCache.put('views/raml-editor-context-menu.tmpl.html', '<ul role="context-menu" ng-show="opened">\n' + '  <li role="context-menu-item" ng-mouseenter="openFileMenu(action)" ng-mouseleave="closeFileMenu()" ng-repeat="action in actions" ng-click="action.execute()">\n' + '    {{ action.label }}\n' + '    <i class="submenu-icon fa fa-caret-right" ng-if="action.fragments !== undefined"></i>\n' + '    <raml-editor-new-file-menu ng-if="action.fragments !== undefined" show-file-menu="showFileMenu" show-fragment-menu="showFragmentMenu" open-file-menu-condition="showFragmentMenu" menu-role="context-menu"></raml-editor-new-file-menu>\n' + '  </li>\n' + '</ul>\n');
    $templateCache.put('views/raml-editor-file-browser.tmpl.html', '<raml-editor-context-menu></raml-editor-context-menu>\n' + '\n' + '<script type="text/ng-template" id="file-item.html">\n' + '  <div ui-tree-handle class="file-item" ng-right-click="fileBrowser.showContextMenu($event, node)" ng-click="fileBrowser.select(node)"\n' + '    ng-class="{currentfile: fileBrowser.currentTarget.path === node.path && !isDragging,\n' + '      dirty: node.dirty,\n' + '      geared: fileBrowser.contextMenuOpenedFor(node),\n' + '      directory: node.isDirectory,\n' + '      \'no-drop\': fileBrowser.cursorState === \'no\',\n' + '      copy: fileBrowser.cursorState === \'ok\'}"\n' + '    ng-drop="node.isDirectory && fileBrowser.dropFile($event, node)">\n' + '    <span class="file-name" ng-click="toggleFolderCollapse(node)">\n' + '      <i class="fa icon fa-caret-right fa-fw" ng-if="node.isDirectory" ng-class="{\'fa-rotate-90\': !collapsed}"></i>\n' + '      <i class="fa icon fa-fw" ng-class="{\'fa-folder-o\': node.isDirectory, \'fa-file-text-o\': !node.isDirectory}"></i>\n' + '      &nbsp;{{node.name}}\n' + '    </span>\n' + '    <i class="fa fa-cog" ng-click="fileBrowser.showContextMenu($event, node)" ng-class="{hidden: isDragging}" data-nodrag></i>\n' + '  </div>\n' + '\n' + '  <ul ui-tree-nodes ng-if="node.isDirectory" ng-class="{hidden: collapsed}" ng-model="node.children">\n' + '    <li ui-tree-node ng-repeat="node in node.children" ng-include="\'file-item.html\'" data-collapsed="node.collapsed" data-path="{{node.path}}">\n' + '    </li>\n' + '  </ul>\n' + '</script>\n' + '\n' + '<div ui-tree="fileTreeOptions" ng-model="homeDirectory" class="file-list" data-drag-delay="300" data-empty-place-holder-enabled="false" ng-drop="fileBrowser.dropFile($event, homeDirectory)" ng-right-click="fileBrowser.showContextMenu($event, homeDirectory)">\n' + '  <ul ui-tree-nodes ng-model="homeDirectory.children" id="tree-root">\n' + '    <ui-tree-dummy-node class="top"></ui-tree-dummy-node>\n' + '    <li ui-tree-node ng-repeat="node in homeDirectory.children" ng-include="\'file-item.html\'" data-collapsed="node.collapsed"\n' + '     data-path="{{node.path}}"\n' + '     ng-drag-enter="node.collapsed = false"\n' + '     ng-drag-leave="node.collapsed = true"></li>\n' + '    <ui-tree-dummy-node class="bottom" ng-click="fileBrowser.select(homeDirectory)"></ui-tree-dummy-node>\n' + '  </ul>\n' + '</div>\n');
    $templateCache.put('views/raml-editor-main.tmpl.html', '<div role="raml-editor" class="{{theme}}">\n' + '  <div role="notifications" ng-controller="notifications" class="hidden" ng-class="{hidden: !shouldDisplayNotifications, error: level === \'error\'}">\n' + '    {{message}}\n' + '    <i class="fa" ng-class="{\'fa-check\': level === \'info\', \'fa-warning\': level === \'error\'}" ng-click="hideNotifications()"></i>\n' + '  </div>\n' + '\n' + '  <header>\n' + '    <h1>\n' + '      <strong>API</strong> Designer\n' + '    </h1>\n' + '\n' + '    <a role="logo" target="_blank" href="http://mulesoft.com"></a>\n' + '  </header>\n' + '\n' + '  <ul class="menubar">\n' + '    <li class="menu-item menu-item-ll">\n' + '      <raml-editor-project-button></raml-editor-project-button>\n' + '    </li>\n' + '    <li class="menu-item menu-item-ll">\n' + '      <raml-editor-view-button></raml-editor-view-button>\n' + '    </li>\n' + '    <li class="menu-item menu-item-ll">\n' + '      <raml-editor-help-button></raml-editor-help-button>\n' + '    </li>\n' + '    <li class="spacer file-absolute-path">{{getSelectedFileAbsolutePath()}}</li>\n' + '    <li class="menu-item menu-item-fr menu-item-mocking-service" ng-show="getIsMockingServiceVisible()" ng-controller="mockingServiceController" ng-click="toggleMockingService()">\n' + '      <div class="title">Mocking Service</div>\n' + '      <div class="field-wrapper" ng-class="{loading: loading}">\n' + '        <i class="fa fa-spin fa-spinner" ng-if="loading"></i>\n' + '        <div class="field" ng-if="!loading">\n' + '          <input type="checkbox" value="None" id="mockingServiceEnabled" ng-checked="enabled" ng-click="$event.preventDefault()" />\n' + '          <label for="mockingServiceEnabled"></label>\n' + '        </div>\n' + '      </div>\n' + '    </li>\n' + '  </ul>\n' + '\n' + '  <div role="flexColumns">\n' + '    <raml-editor-file-browser role="browser"></raml-editor-file-browser>\n' + '\n' + '    <div id="browserAndEditor" ng-splitter="vertical" ng-splitter-collapse-target="prev"><div class="split split-left">&nbsp;</div></div>\n' + '\n' + '    <div role="editor" ng-class="{error: currentError}">\n' + '      <div id="code" role="code"></div>\n' + '\n' + '      <div role="shelf" ng-show="getIsShelfVisible()" ng-class="{expanded: !shelf.collapsed}">\n' + '        <div role="shelf-tab" ng-click="toggleShelf()">\n' + '          <i class="fa fa-inbox fa-lg"></i><i class="fa" ng-class="shelf.collapsed ? \'fa-caret-up\' : \'fa-caret-down\'"></i>\n' + '        </div>\n' + '\n' + '        <div role="shelf-container" ng-show="!shelf.collapsed" ng-include src="\'views/raml-editor-shelf.tmpl.html\'"></div>\n' + '      </div>\n' + '    </div>\n' + '\n' + '    <div id="consoleAndEditor" ng-show="getIsConsoleVisible()" ng-splitter="vertical" ng-splitter-collapse-target="next" ng-splitter-min-width="470"><div class="split split-right">&nbsp;</div></div>\n' + '\n' + '    <div ng-show="getIsConsoleVisible()" role="preview-wrapper" class="raml-console-embedded">\n' + '      <raml-console\n' + '        raml="raml"\n' + '        options="{\n' + '          singleView: true,\n' + '          disableThemeSwitcher: true,\n' + '          disableRamlClientGenerator: true,\n' + '          disableTitle: true\n' + '        }"\n' + '        style="padding: 0; margin-top: 0;"></raml-console>\n' + '    </div>\n' + '  </div>\n' + '</div>\n');
    $templateCache.put('views/raml-editor-shelf.tmpl.html', '<ul role="sections" ng-controller="ramlEditorShelf">\n' + '  <li role="section" ng-repeat="category in model.categories | orderBy:orderSections" class="{{category.name | dasherize}}">\n' + '    {{category.name}}&nbsp;({{category.items.length}})\n' + '    <ul role="items">\n' + '      <li ng-repeat="item in category.items" ng-click="itemClick(item)"><i class="fa fa-reply"></i><span>{{item.title}}</span></li>\n' + '    </ul>\n' + '  </li>\n' + '</ul>\n');
  }
]);
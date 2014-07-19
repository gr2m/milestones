/* global define */
'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], function () {
      root.initials = factory();
      return root.initials;
    });
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.initials = factory();
  }
})(this, function(){  // jshint ignore:line

  // defaults
  var defaultLength = 2;

  // there is no support for look-behinds in JS, and the \b selector
  // doesn't work with diacritics. So we maintain a blacklist of
  // "non letters", that we use later to build our regex.
  var nonLetters = ' -\\/:-@\\[-`\\{-\\~';
  // regex patterns
  var uppercaseLettersOnlyPattern = /^[A-Z]+$/;
  var initialsInNamePattern = /\(([^\)]+)\)/;
  var nameIsEmailPattern = /^[^\s]+@[^\s]+$/;
  var findDomainInEmailPattern = /@[^\s]+/;
  var findEmailPattern = /[\w\._-]+@[\w\.-]+[\w]/g;

  // match everything that is a "non letter" (see above)
  // followed by all but a "non letter".
  // Expl: "Jörg Jäger-Franke" => ["J", " J", "-F"]
  var findFirstLettersOfWordsPattern = new RegExp('(^|[' + nonLetters + '])[^' + nonLetters + ']', 'g');
  var findAllNonCharactersPattern = new RegExp('['+nonLetters+']', 'g');

  // PUBLIC API METHODS

  //
  // initials alows to be used with either a string or an array of strings
  //
  function initials(nameOrNames, options) {
    if (! nameOrNames) return '';
    if (typeof nameOrNames === 'string') return initialsForSingleName(nameOrNames, normalize(options));
    return initialsForMultipleNames(nameOrNames, normalize(options));
  }

  //
  // finds initials in a name and adds them right ot them
  //
  function addInitialsTo (nameOrNames, options) {
    if (! nameOrNames) return '';
    if (typeof nameOrNames === 'string') return addInitialsToSingleName(nameOrNames, normalize(options));
    return addInitialsToMultipleNames(nameOrNames, normalize(options));
  }

  //
  // extract name, initials, email
  //
  function parse (nameOrNames, options) {
    if (! nameOrNames) return {};
    if (typeof nameOrNames === 'string') return parseSingleName(nameOrNames, normalize(options));
    return parseMultipleNames(nameOrNames, normalize(options));
  }

  // HELPER METHODS

  //
  // Find initials in a single given name string
  //
  function initialsForSingleName(name, options) {
    var matches;
    var result;
    var findFirstLettersPattern;
    var initials;
    var length = options.length || 2;
    findFirstLettersPattern = new RegExp('\\w{'+length+'}');

    initials = findPreferredInitials(name, options);
    if (initials) return initials;

    name = cleanupName(name);
    if (! name) return '';

    // there is no support for look-behinds in JS, and the \b selector
    // doesn't work with diacritics. So we match everything that is a
    // "non character" followed by all but a "non character". To fix
    // that, we map the results to its last character.
    // Expl: "Jörg Jäger" => ["J", " J"] => ["J", "J"]
    matches = name.match(findFirstLettersOfWordsPattern).map(function (match) {
      return match[match.length - 1];
    });

    if (matches.length < 2) {
      if (name.length > length) {
        return name.match(findFirstLettersPattern).join('');
      } else {
        return name;
      }
    } else {
      result = matches.join('');
    }

    if (result.length >= length) {
      return result;
    }

    // This is where it gets complicated.
    // Let's say we're in initials('John Doe', 3), so up to here
    // we have `result === 'JD'`, but what we want is `result === `JDo`.

    // First, we calculate all remaining options that we have
    var possibleInitials = getPossibleInitialsForName(name);
    var option;

    // then we return the first option that has the required length
    while (option = possibleInitials.shift()) {  // jshint ignore:line
      if (option.length >= length) return option;
    }

    // if that didn't work, we return the last possible option
    return option;
  }

  //
  //
  //
  function initialsForMultipleNames (names, options) {
    var optionsForNames = [];
    var optionsCountForNames;
    var map = {};
    var duplicatesMap = {};
    var initialsForNamesMap = {};
    var initials;
    var possibleInitials;
    var length = options.length || 2;

    // get all possible initials for all names for given length
    names.forEach(function(name) {
      // normalize
      if (! name) name = '';

      // known name? Gets same initials, stop here
      if (initialsForNamesMap[name]) return;

      // too short to extract initials from? Use name as initials.
      if (name.length < length) {
        initialsForNamesMap[name] = [name];
        return;
      }

      // preferred initials like (JD)? Use these
      initials = findPreferredInitials(name, options);
      if (initials) {
        map[initials] = 1;
        initialsForNamesMap[name] = [initials];
        return;
      }

      // return all possible initials for given length
      possibleInitials = getPossibleInitialsForName(name).filter( function(initials) {
        if (initials.length !== length) return false;
        if (map[initials]) duplicatesMap[initials] = 1;
        map[initials] = 1;
        return true;
      });

      initialsForNamesMap[name] = possibleInitials;
    });

    // remove duplicates
    for (var name in initialsForNamesMap) {
      possibleInitials = initialsForNamesMap[name];
      optionsForNames.push(possibleInitials);

      for (var i = 0; i < possibleInitials.length; i++) {
        if (duplicatesMap[possibleInitials[i]]) {
          possibleInitials.splice(i, 1);
        }
      }
    }

    // make sure we still have options for every name
    optionsCountForNames = optionsForNames.map( function(options) { return options.length; });

    // if names were empty, optionsCountForNames is empty. In that case stop here
    if (optionsCountForNames.length === 0) return names;

    if (Math.min.apply(null, optionsCountForNames) === 0) {
      options.length++;
      return initialsForMultipleNames(names, options);
    }

    // if we do, return the first option for each
    return names.map( function(name) { return initialsForNamesMap[name][0]; });
  }

  //
  //
  //
  function addInitialsToSingleName (name, options) {
    var parts = parseSingleName(name, options);
    return format(parts);
  }

  //
  //
  //
  function addInitialsToMultipleNames (names, options) {
    return parseMultipleNames(names, options).map( format );
  }

  //
  //
  //
  function parseSingleName (name, options) {
    var initials;
    var email;
    var matches;
    var parts = {};

    if (! name) return {};

    // are initials part of the name?
    initials = findPreferredInitials(name, options);
    if (initials) {
      // if yes, remove it from name
      name = name.replace(uppercaseLettersOnlyPattern, '');
      name = name.replace(initialsInNamePattern, '');
    }

    // use preferred initials if passed
    if (options.initials) initials = options.initials;

    // if no initials found yet, extract initials from name
    if (!initials) initials = initialsForSingleName(name, options);

    // is there an email in the name?
    matches = name.match(findEmailPattern);
    if (matches != null) email = matches.pop();
    if (email) {
      // if yes, remove it from name
      name = name.replace(email, '');
    }

    // clean up the remainings
    name = name.replace(findAllNonCharactersPattern, ' ').trim();

    // do only return what's present
    if (name) parts.name = name;
    if (initials) parts.initials = initials;
    if (email) parts.email = email;

    return parts;
  }

  //
  //
  //
  function parseMultipleNames (names, options) {
    var initialsArray = initialsForMultipleNames(names, options);

    return names.map(function(name, i) {
      options.existing[name] = initialsArray[i];
      return parseSingleName(name, options);
    });
  }

  //
  //
  //
  function format (parts) {

    // neither name nor email: return initials
    if (! parts.name && ! parts.email) return parts.initials;

    // no email: return name with initials
    if (! parts.email) return parts.name + ' (' + parts.initials + ')';

    // no name: return email with initials
    if (! parts.name) return parts.email + ' (' + parts.initials + ')';

    // return name with initials & name
    return parts.name + ' (' + parts.initials + ') <' + parts.email + '>';
  }

  //
  //
  //
  function cleanupName (name) {
    // in case the name is an email address, remove the @xx.yy part
    // otherwise remove an eventual email address from name
    if (nameIsEmailPattern.test(name)) {
      name = name.replace(findDomainInEmailPattern, '');
    } else {
      name = name.replace(findEmailPattern, '');
    }

    // replace all non characters with ' ' & trim
    name = name.replace(findAllNonCharactersPattern, ' ').trim();

    return name;
  }


  //
  //
  //
  function findPreferredInitials (name, options) {
    var matches;

    // if prefered initials passed for current name
    if (options.existing[name]) return options.existing[name];

    // if the name contains only upcase letters, let's take it as the initials as well
    if (uppercaseLettersOnlyPattern.test(name)) {
      return name;
    }

    // are the initials part of the given name, e.g. »Eddie Murphie (em)«?
    matches = name.match(initialsInNamePattern);

    // if yes, return them
    if (matches != null) {
      return matches.pop();
    }
  }

  //
  // e.g. for John Doe:
  // - JDo
  // - JDoe
  // - JoDoe
  // - JohDoe
  // - JohnDoe
  //
  var cache = {};
  function getPossibleInitialsForName (name) {
    var parts;
    var partsPossibilities;
    var options = [];
    var currentParts;

    name = cleanupName(name);

    if (cache[name]) {
      return cache[name].slice(0); // return copy
    }

    // split names into parts
    // 'John Doe' => ['Doe', 'John']
    parts = name.split(' ');
    currentParts = parts;

    // map parts to all its possible initials
    // 'John' => ['J', 'Jo', 'Joh', 'John']
    partsPossibilities = parts.map(getPossibleInitialsForWord);

    options = combineAll(partsPossibilities);

    // sort options, shortest first
    options = options.sort(function(a, b) {
      return a.length - b.length || options.indexOf(a) - options.indexOf(b);
    });

    // cache for future
    cache[name] = options;

    // return options;
    return options.slice(0);
  }

  //
  //
  //
  function combineAll(array) {
    var current = array.shift();
    var temp;
    var results;
    if(array.length > 0) {
      results = [];
      temp = combineAll(array);
      current.forEach(function(value1) {
        temp.forEach(function(value2) {
          results.push(value1 + value2);
        });
      });
      return results;
    }
    else {
      return current;
    }
  }

  //
  //
  //
  function getPossibleInitialsForWord (word) {
    var options = [];
    while (word.length) {
      options.unshift(word);
      word = word.substr(0, word.length - 1);
    }
    return options;
  }

  //
  // make sure that options is always an object, and that
  // * options.lenght is a number and >= defaultLength
  // * existing is set and an object
  //
  function normalize (options) {
    if (! options) options = {length: defaultLength};
    if (typeof options === 'number') options = {length: options};

    options.length = Math.max(options.length || 0, defaultLength);
    options.existing = options.existing || {};

    return options;
  }

  // extend public API
  initials.addTo = addInitialsTo;
  initials.parse = parse;
  initials.find = initials;

  return initials;
});

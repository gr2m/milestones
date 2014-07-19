/* global define, module, require */
(function (root, factory) {
  'use strict';

  if (typeof define === 'function' && define.amd) {
    define(['jquery'], function ($) {
      root.githubApi = factory($);
      return root.githubApi;
    });
  } else if (typeof exports === 'object') {
    module.exports = factory(require('jquery'));
  } else {
    root.githubApi = factory(root.jQuery);
  }
})(this, function ($) {
  'use strict';


  var api = {};

  api.org = function (name) {


    return {
      members: {
        findAll: findOrgMembers.bind(null, name)
      }
    };
  };

  function get (path) {
    return $.get('https://api.github.com' + path);
  }

  function findOrgMembers (orgName) {
    return get('/orgs/'+orgName+'/members');
  }

  return api;
});

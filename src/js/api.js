/* global define */
(function (root, factory) {
  'use strict';

  if (typeof define === 'function' && define.amd) {
    define(['jquery'], function ($) {
      root.milestonesApi = factory($);
      return root.milestonesApi;
    });
  } else if (typeof exports === 'object') {
    module.exports = factory(require('jquery'));
  } else {
    root.milestonesApi = factory(root.jQuery);
  }
})(this, function ($) {
  'use strict';

  var api = {};
  var baseUrl;

  api.setup = function(settings) {
    var googleScriptId = settings.googleScriptId;
    baseUrl = 'https://script.google.com/macros/s/'+googleScriptId+'/exec?callback=?';
  };

  api.findAllTasks = function(id) {
    return $.getJSON(baseUrl + '&action=getTasks').then(pipeResponse);
  };

  function pipeResponse(response) {
    var error;
    var defer = $.Deferred();
    var args = Array.prototype.slice.call(arguments);

    if (response.error) {
      error = new Error(response.error.message);
      $.extend(error, response.error);
      return defer.reject(error).promise();
    }

    defer.resolve.apply(defer, args);
    return defer.promise();
  }

  return api;
});

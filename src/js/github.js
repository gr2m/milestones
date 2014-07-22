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
    var orgApi = {};

    orgApi.members = {
      findAll: findOrgMembers.bind(null, name)
    };
    orgApi.repo = getRepoApi.bind(null, name);

    return orgApi;
  };

  api.user = function (name) {
    var user = {};

    user.repo = getRepoApi.bind(null, name);
    return user;
  };

  function getRepoApi(username, reponame) {
    var repoApi = {};

    repoApi.milestones = {
      findAll : findRepoMilestones.bind(null, username, reponame)
    };
    repoApi.issues = {
      findAll : findRepoIssues.bind(null, username, reponame)
    };
    repoApi.collaborators = {
      findAll : findRepoCollaborators.bind(null, username, reponame)
    };
    repoApi.issue = getIssueApi.bind(null, username, reponame);

    return repoApi;
  }

  function getIssueApi(username, reponame, issueNr) {
    var issueApi = {};

    issueApi.comments = {
      findAll: findIssueComments.bind(null, username, reponame, issueNr)
    };

    return issueApi;
  }

  function get (path) {
    return $.get('https://api.github.com' + path);
  }

  function findOrgMembers (orgName) {
    return get('/orgs/'+orgName+'/members');
  }
  function findRepoMilestones (username, reponame) {
    return get('/repos/'+username+'/'+reponame+'/milestones');
  }
  // we use the search API instead of the issues API, as the letter
  // only returns 30 and needs subsequent requests, while the search
  // API returns up to 1000 results.
  function findRepoIssues (username, reponame) {
    return get('/search/issues?q=repo:'+username+'/'+reponame).then(function(response) {
      return response.items;
    });
  }
  function findRepoCollaborators (username, reponame) {
    return get('/repos/'+username+'/'+reponame+'/collaborators');
  }

  function findIssueComments(username, reponame, issueNr) {
    return get('/repos/'+username+'/'+reponame+'/issues/' + issueNr + '/comments');
  }

  return api;
});

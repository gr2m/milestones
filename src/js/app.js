/* global jQuery, initials, _, githubApi */

(function ($, initials, _, githubApi) {
  'use strict';

  var rowTemplate = '';
  rowTemplate += '<tr class="<%= isNewMilestone ? "newMilestone" : "" %>">\n';
  rowTemplate += '    <% if (isNewMilestone) { %>\n';
  rowTemplate += '    <th class="milestone" rowspan="<%= numMilestoneIssues %>">\n';
  rowTemplate += '        <div class="pull-right">\n';
  rowTemplate += '          <a href="<%= milestoneAssignee.html_url %>">\n';
  rowTemplate += '              <img src="<%= milestoneAssignee.avatar_url %>s=24" alt="<%= milestoneAssignee.login %>">\n';
  rowTemplate += '          </a>\n';
  rowTemplate += '        </div>\n';
  rowTemplate += '        <strong><%= milestoneTitle %></strong>\n';
  rowTemplate += '        <small><%= markdown.toHTML(milestoneDescription) %></small>\n';
  rowTemplate += '    </th>\n';
  rowTemplate += '    <% } %>\n';
  rowTemplate += '    <td class="task" data-nr="<%= number %>">\n';
  rowTemplate += '        <div class="pull-right">\n';
  rowTemplate += '          <a href="<%= assignee.html_url %>">\n';
  rowTemplate += '              <img src="<%= assignee.avatar_url %>s=24" alt="<%= assignee.login %>">\n';
  rowTemplate += '          </a>\n';
  rowTemplate += '          <div title="<%= state %>" class="progress <%= effort > "5" ? "unratable" : "" %>" style="width: <%= effort * 2 %>0px">\n';
  rowTemplate += '            <% if (state !== "open") { %>\n';
  rowTemplate += '            <div class="progress-bar <%= state === "active" ? "progress-bar-striped active" : "" %>"  role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style="width: 100%"></div>\n';
  rowTemplate += '            <% } %>\n';
  rowTemplate += '          </div>\n';
  rowTemplate += '        </div>\n';
  rowTemplate += '        <strong><a href="<%= html_url %>">\n';
  rowTemplate += '            <%= title %>\n';
  rowTemplate += '        </a></strong>\n';
  rowTemplate += '        <small><%= markdown.toHTML(body) %></small>\n';
  rowTemplate += '    </td>\n';
  rowTemplate += '</tr>';

  var progressTemplate = '';
  progressTemplate += '<div class="progress-container" style="width: <%= total %>%; left: <%= preceding %>%;">';
  progressTemplate += '  <div class="progress">';
  progressTemplate += '    <div class="progress-bar" style="width: <%= closedPercent %>%"></div>';
  progressTemplate += '    <div class="progress-bar progress-bar-striped active" style="width: <%= activePercent %>%"></div>';
  progressTemplate += '  </div>';
  progressTemplate += '</div>';

  var stateMap = {
    'open': 0,
    'active': 1,
    'closed': 2
  };

  // issues might be local data which scheme might be outdated
  // so in case of an error, we clear the local cache
  window.onerror = function() {
    try {
      localStorage.clear();
    } catch(e) {}
  };

  $.when(
    cache('owners', githubApi.user('gr2m').repo('milestones').collaborators.findAll),
    cache('issues', githubApi.user('gr2m').repo('milestones').issues.findAll)
  )
  .progress(handleResponses)
  .done(handleResponses)
  .fail(handleError);

  $(document.body).on('click', 'td.task', toggleDescriptionInTaskCell);

  function cache (name, method) {
    var data;
    var defer = $.Deferred();
    try {
      data = JSON.parse(localStorage.getItem(name));
    } catch(e) {}

    if (data && method) {
      if (method) {
        defer.notify(data);
      } else {
        defer.resolve(data);
      }
    } else {
      if (! method) defer.reject();
    }

    method().done(function(data) {
      try {
        localStorage.setItem(name, JSON.stringify(data));
      } catch(e) {}
    }).done(function(data) {
      defer.resolve(data);
    });

    return defer.promise();
  }

  function handleResponses (owners, issues) {
    var milestones = [];



    owners = owners.reduce(function(map, user) {
      map[user.login] = user;
      return map;
    }, {});

    // milestones are passed as property to every issue. Instead
    // of sending an extra request to /repos/user/repo/milestones,
    // we build it out of the returned issues;
    milestones = issues.reduce(function(currentMilestones, issue) {
      var milestone = issue.milestone;
      var currentMilestoneIds;
      var currentMilestoneIndex;

      // ignore issues without milestones
      if (! issue.milestone) return;

      currentMilestoneIds = currentMilestones.map(function(milestone) {return milestone.id; });
      currentMilestoneIndex = currentMilestoneIds.indexOf(milestone.id);
      delete issue.milestone;

      if (currentMilestoneIndex === -1) {
        milestone.issues = [issue];
        currentMilestones.push(milestone);
      } else {
        milestone = currentMilestones[currentMilestoneIndex];
        milestone.issues.push(issue);
      }

      return currentMilestones;
    }, []);

    // we set issue effort & state based on issue labels
    issues = issues.map(function(issue) {
      issue.state = getIssueState(issue);
      issue.effort = getIssueEffort(issue);
      return issue;
    });

    // at the end, we add total effort, state, owner, description
    // and sort the issues in milestones
    milestones = milestones.map(function(milestone) {
      var descriptionParts;
      milestone.effort = milestone.issues.reduce(function(effort, issue) {
        effort.total += issue.effort;
        effort[issue.state] += issue.effort;
        return effort;
      }, { total: 0, closed: 0, active: 0, open: 0});
      if (milestone.open_issues > 0) {
        // either open (not started on any issue)
        // or active (at least 1 issue closed or active)
        milestone.state = milestone.issues.reduce(function(state, issue) {
          if (state === 'closed' || issue.state === 'closed') return 'active';
          if (state === 'active' || issue.state === 'active') return 'active';
          return state;
        }, 'open');
      } else {
        milestone.state = 'closed';
      }

      // milestone.description has a special format with the milestone owner
      // in the first line:
      //
      //     owner: gr2m
      //
      //     ---
      //
      //     actual description here ...
      descriptionParts = milestone.description.split(/\s+-{3,}\s+/);
      milestone.assignee = owners[descriptionParts[0].substr(7)];
      milestone.description = descriptionParts[1];

      milestone.issues.sort(sortByStateAndUpdateAt);
      return milestone;
    });

    milestones.sort(sortByTitle);

    renderChart(milestones);
    renderTasks(milestones);
  }


  function renderChart(milestones) {
    var currentTotal = 0;
    var allTotal;
    var html;
    milestones = milestones.map(function(milestone) {
      milestone.total = milestone.effort.total;
      milestone.closedPercent = parseInt(milestone.effort.closed / milestone.total * 100, 10);
      milestone.activePercent = parseInt(milestone.effort.active / milestone.total * 100, 10);
      return milestone;
    });
    allTotal = milestones.reduce(function(allTotal, milestone) {
      return allTotal + milestone.total;
    }, 0);
    html = milestones.map(function(milestone) {
      milestone.total = milestone.total / allTotal * 100;
      currentTotal += milestone.total;

      return _.template(progressTemplate, _.extend({}, milestone, {
        preceding: currentTotal - milestone.total
      }));
    }).join('\n');
    $('.chart').html(html);
  }
  function renderTasks(milestones) {
    var htmlLines = [];
    milestones.forEach(function(milestone) {
      var milestoneHtmlLines = milestone.issues.map(function(issue, i, allIssues) {
        return _.template(rowTemplate, _.extend(issue, {
          isNewMilestone: i === 0,
          numMilestoneIssues: allIssues.length,
          milestoneTitle: milestone.title.replace(/^\d+\s+/, ''),
          milestoneDescription: milestone.description,
          milestoneAssignee: milestone.assignee
        }));
      });
      htmlLines = htmlLines.concat(milestoneHtmlLines);
    });
    $('tbody').html(htmlLines.join('\n'));
  }

  function handleError (error) {
    // window.alert('an error occured: ' + error);
    window.console.log(error);
  }

  function getIssueState (issue) {
    var state;
    var isActive;
    state = issue.state;
    isActive = issue.labels.filter(function(label) {
      return label.name === 'active';
    }).length === 1;
    if (isActive) {
      state = 'active';
    }
    return state;
  }

  function getIssueEffort (issue) {
    var effort;
    effort = issue.labels.reduce(function(effort, label) {
      var currentEffort = parseInt(label.name, 10);

      if (/^5+/.test(label.name)) {
        currentEffort = 7;
      }
      if (typeof currentEffort !== 'number') return effort;

      if (currentEffort > effort) return currentEffort;
      return effort;
    }, 0);
    return effort;
  }

  function sortByStateAndUpdateAt (a, b) {
    if (stateMap[a.state] < stateMap[b.state]) return 1;
    if (stateMap[a.state] > stateMap[b.state]) return -1;
    if (a.update_at < b.update_at) return 1;
    if (a.update_at > b.update_at) return -1;

    return 0;
  }
  function sortByTitle (a, b) {
    if (a.title > b.title) return 1;
    if (a.title < b.title) return -1;
    return 0;
  }

  function toggleDescriptionInTaskCell (event) {
    var $td = $(event.currentTarget);
    $td.toggleClass('showDescription');
  }
})(jQuery, initials, _, githubApi);

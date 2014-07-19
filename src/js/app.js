/* global jQuery, initials, _, milestonesApi, githubApi */

(function ($, initials, _, milestonesApi) {
  'use strict';

  var rowTemplate = '';
  rowTemplate += '<tr class="<%= milestone ? "newMilestone" : "" %>">\n';
  rowTemplate += '    <th class="milestone">\n';
  rowTemplate += '        <%= milestone %>\n';
  rowTemplate += '    </th>\n';
  rowTemplate += '    <td class="task">\n';
  rowTemplate += '        <% if (link) { %>';
  rowTemplate += '        <a href="<%= link %>">\n';
  rowTemplate += '            <%= title %>\n';
  rowTemplate += '        </a>\n';
  rowTemplate += '        <% } else { %>\n';
  rowTemplate += '        <%= title %>\n';
  rowTemplate += '        <small class="badge badge-info">missing issue</small>\n';
  rowTemplate += '        <% } %>\n';
  rowTemplate += '    </td>\n';
  rowTemplate += '    <td class="owner">\n';
  rowTemplate += '        <a href="<%= ownerUrl %>">\n';
  rowTemplate += '            <img src="<%= ownerAvatarUrl %>" alt="<%= ownerName %>">\n';
  rowTemplate += '        </a>\n';
  rowTemplate += '    </td>\n';
  rowTemplate += '    <td class="estimate">\n';
  rowTemplate += '        <%= estimate %>\n';
  rowTemplate += '    </td>\n';
  rowTemplate += '    <td class="status">\n';
  rowTemplate += '        <%= status %>\n';
  rowTemplate += '    </td>\n';
  rowTemplate += '</tr>';

  var progressTemplate = '';
  progressTemplate += '<div class="progress" style="width: <%= total %>%; left: <%= preceding %>%;">';
  progressTemplate += '  <div class="progress-bar" style="width: <%= donePercent %>%">';
  progressTemplate += '    <span class="sr-only">done</span>';
  progressTemplate += '  </div>';
  progressTemplate += '  <div class="progress-bar progress-bar-striped active" style="width: <%= inProgressPercent %>%">';
  progressTemplate += '    <span class="sr-only">20% Complete (warning)</span>';
  progressTemplate += '  </div>';
  progressTemplate += '</div>';

  milestonesApi.setup({
    googleScriptId: 'AKfycbzkbQC8WAEIRDI6KKD0GNJWXVGuvRaBKTv3guT_n-pRCgav1Hev'
  });

  $.when(
    cache('tasks', milestonesApi.findAllTasks),
    cache('owners', githubApi.org('hoodiehq').members.findAll)
  )
  .progress(handleResponses)
  .done(handleResponses)
  .fail(handleError);

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

  function handleResponses (tasks, owners) {
    var currentMilestone;
    var milestones;

    owners = owners.reduce(function(map, user) {
      map[user.login] = user;
      return map;
    }, {});

    currentMilestone = {};
    milestones = tasks.reduce(function(milestones, task) {
      if (currentMilestone.name !== task.milestone) {
        currentMilestone = {
          name: task.milestone,
          effort: {
            done: 0,
            inprogress: 0,
            backlog: 0
          }
        };
        milestones.push(currentMilestone);
      }
      var status = task.status.toLowerCase().replace(/[^\w]/g, '');
      var effort = parseInt(task.estimate, 10);
      currentMilestone.effort[status] += effort;
      return milestones;
    }, []);



    currentMilestone = '';
    tasks = tasks.map(function(task) {
      var owner = owners[task.owner];
      if (currentMilestone === task.milestone) {
        task.milestone = '';
      } else {
        currentMilestone = task.milestone;
      }
      task.link = task.issue && task.issue.replace(/([^\/]+)\/([^#]+)#()/, 'https://github.com/$1/$2/issues/$3');
      task.dependsOn = (task.dependsOn || '').replace(/\n/g, '<br>');

      task.ownerUrl = owner && owner.url;
      task.ownerAvatarUrl = owner && owner.avatar_url + 's=24';
      task.ownerName = owner && owner.login;
      return task;
    });

    renderChart(milestones);
    renderTasks(tasks);
  }


  function renderChart(milestones) {
    var currentTotal = 0;
    var allTotal;
    var html;
    milestones = milestones.map(function(milestone) {
      milestone.total = milestone.effort.done + milestone.effort.inprogress + milestone.effort.backlog;
      milestone.donePercent = parseInt(milestone.effort.done / milestone.total * 100, 10);
      milestone.inProgressPercent = parseInt(milestone.effort.inprogress / milestone.total * 100, 10);
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
  function renderTasks(tasks) {
    var html = tasks.map(_.template.bind(null, rowTemplate)).join('\n');
    $('tbody').html(html);
  }

  function handleError (error) {
    // window.alert('an error occured: ' + error);
    window.console.log(error);
  }
})(jQuery, initials, _, milestonesApi);

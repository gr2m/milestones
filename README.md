Milestones
==========

> A GitHub Api backed Milestone thingy

Local Setup
-----------

```
git clone git@github.com:gr2m/milestones.git
cd milestones
npm install
bower install
grunt serve
```

How it works
------------

This is a static HTML5 app that loads issues from a repo right
from the [GitHub API](https://developer.github.com/).

The repo is currently hardcoded in `src/js/app.js`, but can easily
be changed by changing `repoUrl = 'https://github.com/gr2m/milestones'`
as you like.

For performance reasons, the response to the GitHub API is cached
locally. That way the app can be shown right after page load. Once
the request is finished, the local cache gets updated and the app
will be rerendered.

The app has a few assumptions on milestones, issues & labels of the repo.

1. All Milestones set their owner in the first line of their description.
   The actual description is then separated by `---`. Here is an example

   ```
   owner: gr2m

   ---

   Actual Description here
   ```
2. All Milestones will be sorted alphabetically. You can prefix the milestone
   titles with numbers and a space, e.g. `01 My First Milestone`. The `01 ` part
   will automatically be removed
3. To mark an issue as active, add the `active` label.
4. To add efforts to issues, create labels that must start with a number,
   like `1 easy` or `3 hard`. Add only one effort-label per issue.


TODOs
-----

- allow to dynamically pass another github repo url
- make it work offline

Fine Print
----------

Milestones have been authored by [Gregor Martynus](https://github.com/gr2m),
proud member of [Team Hoodie](http://hood.ie/). Support our work: [gittip us](https://www.gittip.com/hoodiehq/).

License: MIT

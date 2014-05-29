var state = {
  debopts: ['debian', 'raspbian'],
  deb: m.prop("debian"),
  distopts: ['wheezy', 'jessie'],
  dist: m.prop("wheezy"),
  branchopts: ['', '-testing', '-firefly'],
  branch: m.prop(""),
  branchdesc: function(branch) {
    if (branch == '') return 'Stable';
    return state.titlecase(branch.substr(1));
  },
  titlecase: function(str) {
    return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
  }
};
state.controller = function() {};
state.view = function(s) {
  var selectorrow = function(choices, attr, descfunc) {
    return m("div", {class:"container-fluid"}, choices.map(function(name, index) {
      var desc = state.titlecase(name);
      if (descfunc) desc = descfunc(name);
      return m("div", {class: "col-xs-3 col-sm-2"}, [
        m("button", {
          class: attr()==name ? 'btn btn-primary btn-block' : 'btn btn-block',
          onclick: attr.bind(state, name)
        }, desc)
      ]);
    }));
  };
  return m("div", [
    m("p", "Choose your OS:"),
    selectorrow(state.debopts, state.deb),
    m("p", "Choose which version of Ceph:"),
    selectorrow(state.branchopts, state.branch, state.branchdesc),
    m("div", [
      m("pre", "cat <<EOF > /etc/apt/sources.list.d/cepharm.list\n" +
"deb http://ceph.hufman.me/" + state.deb() + state.branch() + " " + state.dist() + " main\n" +
"deb-src http://ceph.hufman.me/" + state.deb() + state.branch() + " " + state.dist() + " main\n" +
"EOF\n" +
"apt-get update")
    ])
  ]);
};

buildstatus = function() {
  var view = function(data) {
    function is_being_built(type, distro, version, arch) {
      var building = data['building'];
      if (building != null) {
        return building['type'] == type &&
               building['distro'] == distro &&
               building['version'] == version &&
               building['arch'] == arch;
      }
      return false;
    }

    var table = [];
    // make the header
    table.push(m('thead', [
      m('tr', [
        m('th', 'Branch'),
        m('th', 'Debian armel'),
        m('th', 'Debian armhf'),
        m('th', 'Raspbian')
      ])
    ]));
    var rows = [];

    var branches = ['debian', 'debian-testing', 'debian-firefly'];
    var columns = [{'type':'debian', 'dist': 'wheezy', 'arch':'armel'},
                   {'type':'debian', 'dist': 'wheezy', 'arch':'armhf'},
                   {'type':'raspbian', 'dist': 'wheezy', 'arch':'armhf'}
                  ];
    for (var b=0; b < branches.length; b++) {
      var branch_name = branches[b];
      var branch_data = data['branches'][branch_name];
      var branch_version = branch_data['version'];
      var row = [];
      row.push(m('th', [
        m('span', branch_name),
        m('span', ' ('+branch_version+')')
      ]));
      for (var c=0; c < columns.length; c++) {
        var format = columns[c];
        var version = null;
        var version_log = null;
        if (branch_data['posted'][format['type']] &&
            branch_data['posted'][format['type']][format['dist']] &&
            branch_data['posted'][format['type']][format['dist']][format['arch']]) {
          version = branch_data['posted'][format['type']][format['dist']][format['arch']];
        }
        if (data['build_logs'] &&
            data['build_logs'][format['type']] &&
            data['build_logs'][format['type']][format['dist']] &&
            data['build_logs'][format['type']][format['dist']][branch_version]) {
          version_log = data['build_logs'][format['type']][format['dist']][branch_version];
        }

        var text = '';
        var klass = '';
        var link = null;
        if (version == branch_version) {
          // repo has current version
          text = version;
          klass = 'success';
          if (version_log[format['arch']]) {
            link = version_log[format['arch']];
          }
        } else {
          // has none or an old version in the repo
          if (is_being_built(format['type'], format['dist'], branch_version, format['arch'])) {
            text = 'Building: '+branch_version;
            klass = 'warning';
            link = 'logs/current.build';
          } else if (version_log && version_log.hasOwnProperty(format['arch'])) {
            // successfully built new package
            text = 'Built: '+branch_version;
            klass = 'warning';
            if (version_log[format['arch']]) {
              link = version_log[format['arch']];
            }
          } else {
            // not built or building
            if (version != null) {
              // still have old package
              text = 'Outdated: '+version;
              klass = 'warning';
            } else {
              // never built
              text = 'Not built';
              klass = 'danger';
            }
          }
        }
        var statuschildren = [];
        if (link) {
          statuschildren = [m('a', {'href': link}, text)];
        } else {
          statuschildren = [m('span', text)];
        }
        row.push(m('td', {'class': klass}, statuschildren));
      }
      rows.push(m('tr', row));
    }
    table.push(m('tbody', rows));
    return m('div', [
      m('h3', 'Build Status'),
      m('table', {'class': 'table'}, table)
    ]);
  };

  function load_build_status() {
    function reqComplete() {
      window.setTimeout(load_build_status, 60000);
      if (request.status == 200 || request.status == 304) {
        var data = JSON.parse(request.responseText);
        m.render(document.getElementById('buildstatus'), view(data));
      } else {
        m.render(document.getElementById('buildstatus'), m('div', 'Build Status Unavailable'));
      }
    }
    var request = new XMLHttpRequest();
    request.addEventListener("load", reqComplete, false);
    request.open("GET", "status.json");
    request.send();
  }

  return {
    load: load_build_status
  };
}();

buildlog = function() {
  var view = function(data) {
    return m('div', [
      m('h3', 'Build log'),
      m('pre', {'class': 'build'}, data)
    ]);
  };
  function load_build_log() {
    function reqComplete() {
      window.setTimeout(load_build_log, 2000);
      if (request.status == 200 || request.status == 304) {
        m.render(document.getElementById('buildlog'), view(request.responseText));
      } else {
        m.render(document.getElementById('buildlog'), view('Idle'));
      }
    }
    var request = new XMLHttpRequest();
    request.addEventListener("load", reqComplete, false);
    request.open("GET", "logs/tail.build");
    request.send();
  }
  return {
    load: load_build_log
  };
}();

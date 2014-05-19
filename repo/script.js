var state = {
  debopts: ['debian', 'raspbian'],
  deb: m.prop("debian"),
  distopts: ['wheezy', 'jessie'],
  dist: m.prop("wheezy"),
  branchopts: ['', '-testing'],
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


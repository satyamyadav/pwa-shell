/**
 * bootstrap an app shell with skeletonEngine
 */

skeletonEngine.bootstrap('appShell', {
  elements: [
    'ul',
    'li',
    'section',
    'tr',
    'td',
    'table',
    'tbody',
    'thead',
    'body',
    'script',
    'style',
    'img',
    'form',
    'input'
  ]
});

/**
 * Setup Router
 */

const appShell = skeletonEngine.shell('appShell');

appShell.provider('router', function() {

  // this is the service factory.
  this.$get = function(shell) {

    // View Container
    let container;
    let currentView;
    let anchorTags;
    let hooks = {
      beforeMount: () => {},
      afterMount: () => {}
    }

    const $window = shell.$window;
    const $document = shell.$document;

    function _cleanContainer() {
      if (currentView && currentView.parentElement) {
        currentView.parentElement.removeChild(currentView);
      }

      container.innerHTML = '';
    }

    function mountRouteElement(elem, routeParams) {
      _cleanContainer();

      currentView = elem({container, routeParams}).componentDidMount();

      container.appendChild(currentView);
      hooks.afterMount();
    }

    /**
      * Returns the location params from url
      * @returns {object}
      */
    function getLocationParams() {
      let out = {};

      // Parse the location object
      location.search.substr(1).split('&').forEach(parts => {
        let values = parts.split('=');
        out[values[0]] = values[1];
      });

      return out;
    }

    const loadRoute = () => {

      let currentRoute = $window.location.hash;
      let path = currentRoute.split('#').pop();
      path = path === ''
        ? '/'
        : path;
      shell.state.route(path).then((c) => {
        let route = c;
        let navLink = $document.querySelector(`#shell-nav a[href="${path}"]`);
        let currentActiveLink = $document.querySelector(`#shell-nav a.active`);
        if (currentActiveLink)
          currentActiveLink.classList.remove('active');
        if (navLink)
          navLink.classList.add('active');
        hooks.beforeMount(route, currentRoute);
        mountRouteElement(route, getLocationParams());
      }).catch((e) => {
        console.error(e);
        // mountRouteElement(shell.notfound('404', '404'), getLocationParams())
      });
    };

    $window.handleOnClick = function handleOnClick(e) {

      let path = e.target.getAttribute('href');

      e.stopImmediatePropagation();
      e.preventDefault();

      // Push the state
      $window.handlePushState(['#', path].join(''));

      return false;
    };

    $window.handlePushState = (p) => {
      // Push the state
      $window.history.pushState(null, null, p);
      loadRoute();
    }
    $window.onpopstate = function(event) {
      $window.handlePushState();
    };

    const initialize = (routesDefinition, containerElement, hooksDefinition) => {
      container = containerElement;

      // Assign the onclick action
      anchorTags = [].slice.call($document.querySelectorAll('#shell-nav .shell-nav-link'));
      anchorTags.forEach(node => node.onclick = $window.handleOnClick);

      loadRoute();
    };

    return {initialize};

  };
}).factory('supportRouter', function(container) {
  let router = container.router;
  const supportRouter = (app) => {
    let init = ({routes, viewContainer, hooks}) => {
      return router.initialize(routes, viewContainer, hooks);
    }
    init(app.utils);
  }
  return supportRouter;
});

/**
 * Board Component
 */

appShell.factory('boardView', function(container) {
  const mix = container.mix;
  const GenericView = container.GenericView;
  const View = container.View;
  const $window = container.$window;
  const $document = container.$document;

  let app = container.appShell.app;

  class BoardView extends mix(View).with (GenericView) {
    constructor(viewClassName, urlName, routeParams, dom, app) {
      super(viewClassName, urlName, routeParams, dom, app);
      this.panels = [];
      this.$window = $window;
      this.$document = $document;
    }

    loadData() {
      return navigator.getBattery().then(battery => {
        battery.addEventListener('chargingchange', this.batteryUpdate.bind(this));
        battery.addEventListener('levelchange', this.batteryUpdate.bind(this));

        this.render(battery);
      });

    }

    batteryUpdate() {
      console.log('update battery');
      this.loadData();
    }

    render(data) {

      let level = parseInt(data.level * 100);

      let status;

      switch (true) {
        case data.charging:
          status = 'good charging';
          break;
        case level > 80:
          status = 'good';
          break;
        case level < 15:
          status = 'critical';
          break;
        default:
          status = 'normal';
      }

      let tmpl = `<div class="battery ${status}">
      <div class="indicator"><div class="other"></div></div>
      <div class="level" style="width:${level}%"></div>
      <div class="lable"><h2>${level}%<h2></div></div>`

      if (!!this.template.parentElement) {
        let newTemplate = this.createTemplate(tmpl);
        this.template.parentElement.replaceChild(newTemplate, this.template);
        this.template = newTemplate;
      }
    }

    createTemplate(data) {
      return this.dom.div({
        className: this.viewClassName
      }, `${data}`);
    }

    createFirstTemplate() {
      return this.dom.div({
        className: this.viewClassName
      }, `welcome`);
    }

  }
  return BoardView;

});

/**
 * message Component
 */

appShell.factory('msgView', function(container) {
  const mix = container.mix;
  const GenericView = container.GenericView;
  const View = container.View;
  const $window = container.$window;
  const $document = container.$document;

  let app = container.appShell.app;

  class MsgView extends mix(View).with (GenericView) {
    constructor(viewClassName, urlName, routeParams, dom, app, message) {
      super(viewClassName, urlName, routeParams, dom, app);
      this.panels = [];
      this.$window = $window;
      this.$document = $document;
      this.message = message;
    }

    createFirstTemplate() {
      return this.dom.div({
        className: this.viewClassName
      }, `<div class="msg card">${this.message}</div>`);
    }

  }
  return MsgView;

});

/**
 * a provider for generating view from component
 */
appShell.provider('board', function() {
  this.$get = function(container) {
    let boardView = container.boardView;
    let app = container.appShell.app;
    let router = container.state;
    let board = (viewClassName, urlName, app) => {
      return(props) => {
        let view = new boardView(viewClassName, urlName, props, app.element, app);
        return view;
      }
    };
    return board;
  }
});

appShell.provider('msg', function() {
  this.$get = function(container) {
    let msgView = container.msgView;
    let app = container.appShell.app;
    let router = container.state;
    let msg = (viewClassName, urlName, app) => {
      return(props) => {
        let tmpl = `<h1> Hello !</h1> <h3> World </h3>`;
        let view = new msgView(viewClassName, urlName, props, app.element, app, tmpl);
        return view;
      }
    };
    return msg;
  }
});

/**
 * Define routes
 */
appShell.app.vent.on('engineLoaded', function(name, app) {
  let boardView = appShell.app.core.container.board;
  let homeView = appShell.app.core.container.msg;
  appShell.app.appRouter.addRoute({
    component: boardView('board-view', 'board', appShell.app),
    pattern: ['/board']
  }).addRoute({
    component: homeView('home', '/', appShell.app),
    pattern: ['/']
  });
});

/**
 * Mount routes
 */
appShell.app.vent.on('engineLoaded', function(name, app) {
  appShell.app.core.container.supportRouter(app);
});

/**
 * Run app to initialize shell
 */
appShell.run((app) => {
  console.log(app);
});

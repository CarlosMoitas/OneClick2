window.sdkUI = {
  nextAccountMigrated: () => {
    window.console.debug('sdkUI.nextAccountMigrated');
  },
  setSubSegment: (name) => {
    window.console.debug('sdkUI.setSubsegment', { name });
  },
  showErrorScreen: (title, message, code, action) => {
    window.console.debug('sdkUI.showErrorScreen', {
      action,
      code,
      message,
      title,
    });
    window.console.alert(`${title}: "${message}" ${code} [${action}]`);
  },
};

// android
window.jsinterface = window.jsinterface || {};
window.jsinterface.goesToHomeInstitucional = () => {
  window.console.debug('jsinterface.goesToHomeInstitucional');
  window.console.alert('Redirecionado para home institucional (embarcada).');
};
window.jsinterface.checkHTML = (html, url) => {
  window.console.debug('jsinterface.checkHTML', { html, url });
};
window.jsinterface.setHeaderTitle = (title) => {
  window.console.debug('jsinterface.setHeaderTitle', { title });
  document.title = title;
};

// ios
window.webkit = window.webkit || {};
window.webkit.messageHandlers = window.webkit.messageHandlers || {};
window.webkit.messageHandlers.goesToInstitutionalHome = {
  postMessage: () => {
    window.console.debug(
      'webkit.messageHandlers.goesToHomeInstitucional.postMessage',
    );
    window.console.alert('Redirecionado para home institucional (embarcada).');
  },
};
window.webkit.messageHandlers.setHeaderTitle = {
  postMessage: (title) => {
    window.console.debug('webkit.messageHandlers.setHeaderTitle.postMessage', {
      title,
    });
    document.title = title;
  },
};

['hashchange', 'popstate'].forEach((eventName) =>
  window.addEventListener(eventName, (event) =>
    window.console.debug(eventName, event),
  ),
);

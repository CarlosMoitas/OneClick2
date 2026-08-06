window.sdkStorage = {
  saveUserSettings: (project, key, data) => {
    window.console.debug('sdkStorage.saveUserSettings', { project, key, data });
    window.localStorage.setItem(`_SERVE.${project}.${key}`, data);
    setTimeout(() => {
      window.onSuccessSaveUserSettingsCallback(project, key);
    }, 100);
  },
  getUserSettings: (project, key) => {
    window.console.debug('sdkStorage.getUserSettings', { project, key });
    setTimeout(() => {
      const value = window.localStorage.getItem(`_SERVE.${project}.${key}`);
      window.onSuccessGetUserSettingsCallback(project, key, value);
    }, 100);
  },
};
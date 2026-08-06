import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { isDevMode } from '@angular/core';

bootstrapApplication(App, appConfig)
  .then(() => {
    // Desabilita os logs do console em build de Production
    if (!isDevMode()) {
      console.log = function () { }
      console.warn = function () { }
      console.trace = function () { }
      console.info = function () { }
      console.assert = function () { }
      console.debug = function () { }
      console.error = function () { }
    }
  })
  .catch((err: unknown) => console.error(err));

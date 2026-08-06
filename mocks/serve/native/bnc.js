window.webkit = window.webkit || {};
window.webkit.messageHandlers = window.webkit.messageHandlers || {};

window.bncwebview_capabilities = {
  jsbridges: [
    { component: "BNCLocation", version: "1.0.0" },
    { component: "BNCPlatformInfo", version: "1.0.0" },
  ],
};

const bncBridgeHandler = {
  postMessage: (request) => {
    console.log("#MOCK: BNC " + request);
    const requestObj = JSON.parse(request);

    switch (requestObj.component) {
      case "BNCLocation":
        bncLocation(requestObj);
        break;
      case "BNCPlatformInfo":
        bncPlatformInfo(requestObj);
        break;
      default:
        console.warn("#MOCK: Unknown component: " + requestObj.component);
        break;
    }
  },
};

window.bncjsbridge = bncBridgeHandler; // Android
window.webkit.messageHandlers.bncjsbridge = bncBridgeHandler; // iOS

function bncPlatformInfo(requestObj) {
  switch (requestObj.method) {
    case "version":
      // versão do build do app
      window.bncPlatformInfoJSBridgeCallbacks.versionSuccess("version_mock");
      // window.bncPlatformInfoJSBridgeCallbacks.unknownMethodError("build4 - mock");
      break;
    case "versionNumber":
      // versão do app bradesco
      window.bncPlatformInfoJSBridgeCallbacks.versionNumberSuccess("4.1.2 - mock");
      break;
    case "platformVersion":
      setTimeout(() => {
        // nome e versão do SO
        window.bncPlatformInfoJSBridgeCallbacks.platformVersionSuccess({
          version: "16.4 - mock",
          name: "iOS - mock",
        });
      }, 50);
      break;
    case "summary":
      setTimeout(() => {
        window.bncPlatformInfoJSBridgeCallbacks.summarySuccess({
          app: {
            version: "1.0.0 - mock",
            versionNumber: "10",
          },
          device: {
            os: {
              name: "ios - mock",
              version: "15.4",
            },
            deviceModelCode: "iPhone12,1",
          },
          deviceUniqueId: "31e0f4fd4753od076ff0ea166ec1008a",
        });
      }, 50);
      break;
    case "deviceUniqueId":
      window.bncPlatformInfoJSBridgeCallbacks.deviceUniqueIdSuccess("deviceid_x");
      break;
    default:
      console.warn("#MOCK: Unknown method: " + requestObj.method);
      break;
  }
}

function bncLocation(requestObj) {
  if (requestObj.method == "getLocation") {
    const randomLatitude = parseFloat((Math.random() * 180 - 90).toFixed(6)); // Random latitude between -90 and 90
    const randomLongitude = parseFloat((Math.random() * 360 - 180).toFixed(6)); // Random longitude between -180 and 180
    console.log(`coordenadas: Latitude ${randomLatitude}, Longitude ${randomLongitude}`);
    window.bncLocationJSBridgeCallbacks.onSuccess({
      latitude: randomLatitude,
      longitude: randomLongitude,
    });
    console.log('"getLocation" success!');
  } else {
    console.warn("#MOCK: Unknown method: " + requestObj.method);
  }
}

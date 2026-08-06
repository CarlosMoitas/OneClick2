window.sdkGPS = {
  // usado por @bradesco/bcpf-lib-device-interceptor-logging
  getLatLng: () => {
    console.log("#Mock: sdkGPS.getLatLng");
    const randomLatitude = parseFloat((Math.random() * 180 - 90).toFixed(6)); // Random latitude between -90 and 90
    const randomLongitude = parseFloat((Math.random() * 360 - 180).toFixed(6)); // Random longitude between -180 and 180
    console.log(
      `#Mock: coordenadas: Latitude ${randomLatitude}, Longitude ${randomLongitude}`
    );
    setTimeout(() => window.onSuccessGetLatLngCallback(randomLatitude,randomLongitude), 30);
  },
};

window.webkit = window.webkit || {};
window.webkit.messageHandlers = window.webkit.messageHandlers || {};

window.webkit.messageHandlers.bncjsbridge = {
  postMessage: (request) => {
    console.log("#Mock: lib-native " + request);
    const requestObj = JSON.parse(request);

    switch (requestObj.component) {
      case "BNCLocation":
        bncLocation(requestObj);
        break;
      default:
        console.warn("#Mock: Unknown component: " + requestObj.component);
        break;
    }
  },
};

function bncLocation(requestObj) {
  if (requestObj.method == "getLocation") {
    const randomLatitude = parseFloat((Math.random() * 180 - 90).toFixed(6)); // Random latitude between -90 and 90
    const randomLongitude = parseFloat((Math.random() * 360 - 180).toFixed(6)); // Random longitude between -180 and 180
    console.log(
      `#Mock: coordenadas: Latitude ${randomLatitude}, Longitude ${randomLongitude}`
    );
    window.bncLocationJSBridgeCallbacks.onSuccess({
      latitude: randomLatitude,
      longitude: randomLongitude
    });
  } else {
    console.warn('#MOCK: Unknown method: ' + requestObj.method);
  }
}

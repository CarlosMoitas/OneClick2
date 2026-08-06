window.dataLayer = {
  push: (data) => {
    if (['Event_Data', 'Screen_Data'].includes(data?.event)) {
      window.console.info('dataLayer.push', data);
    }
  },
};

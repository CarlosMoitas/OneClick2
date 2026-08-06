window.sdkThreatProfiler = {
  doProfile: () => {
    window.console.debug('sdkThreatProfiler.doProfile');
    const behavior = 'success';
    switch (behavior) {
      case 'success':
        setTimeout(
          () => window.onSuccessDoProfileCallback('[threatId-idProfileNativo]'),
          100,
        );
        break;
      case 'error':
        setTimeout(
          () =>
            window.onErrorDoProfileCallback(
              'sdkThreatProfiler.doProfile error',
            ),
          100,
        );
        break;
      case 'call-exception':
        throw new Error('sdkThreatProfiler.doProfile not called');
      default:
        throw new Error('Unknown sdkThreatProfiler.doProfile behavior');
    }
  },
};

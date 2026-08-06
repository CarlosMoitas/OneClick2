window.sdkSecurityKey = {
  initCryptoSecurityKeyAd: (publicKey, sessionId) => {
    window.console.debug('sdkSecurityKey.initCryptoSecurityKeyAd', {
      publicKey,
      sessionId,
    });
    const behavior = 'success';
    switch (behavior) {
      case 'success':
        setTimeout(
          () => window.onSuccessInitCryptoSecurityKeyAdCallback(),
          100,
        );
        break;
      case 'error':
        setTimeout(
          () =>
            window.onErrorInitCryptoSecurityKeyAdCallback(
              'sdkSecurityKey.initCryptoSecurityKeyAd error',
            ),
          100,
        );
        break;
      case 'call-exception':
        throw new Error('sdkSecurityKey.initCryptoSecurityKeyAd not called');
      default:
        throw new Error(
          'Unknown sdkSecurityKey.initCryptoSecurityKeyAd behavior',
        );
    }
  },
  isInstalledSecurityKey: (ref) => {
    window.console.debug('sdkSecurityKey.isInstalledSecurityKey', { ref });
    const behavior = 'nao-instalado';
    switch (behavior) {
      case 'nao-instalado':
        setTimeout(() => window.isInstalledSecurityKeyCallback('0'), 100);
        break;
      case 'instalado':
        setTimeout(() => window.isInstalledSecurityKeyCallback('1'), 100);
        break;
      case 'error':
        setTimeout(() => window.isInstalledSecurityKeyCallback('-1'), 100);
        break;
      case 'call-exception':
        throw new Error('sdkSecurityKey.isInstalledSecurityKey not called');
      default:
        throw new Error(
          'Unknown sdkSecurityKey.isInstalledSecurityKey behavior',
        );
    }
  },
  requestOtp6Ad: (ref, nonce, template, transparente = true) => {
    window.console.debug('sdkSecurityKey.requestOtp6Ad', {
      nonce,
      ref,
      template,
      transparente,
    });
    const behavior = 'success';
    switch (behavior) {
      case 'success':
        setTimeout(
          () =>
            window.onSuccessRequestOtpAdCallback(
              'OTP6//twckjVp2puxKVl1Xa0BX7g==',
            ),
          100,
        );
        break;
      case 'error':
        setTimeout(
          () =>
            window.onErrorRequestOtpAdCallback(
              'sdkSecurityKey.requestOtp6Ad error',
            ),
          100,
        );
        break;
      case 'call-exception':
        throw new Error('sdkSecurityKey.requestOtp6Ad not called');
      default:
        throw new Error('Unknown sdkSecurityKey.requestOtp6Ad behavior');
    }
  },
  requestOtp8Ad: (ref, nonce, payload, template, transparente = true) => {
    window.console.debug('sdkSecurityKey.requestOtp8Ad', {
      payload,
      nonce,
      ref,
      template,
      transparente,
    });
    const behavior = 'success';
    switch (behavior) {
      case 'success':
        setTimeout(
          () =>
            window.onSuccessRequestOtpAdCallback(
              'OTP8//twckjVp2puxKVl1Xa0BX7g==',
            ),
          100,
        );
        break;
      case 'error':
        setTimeout(
          () =>
            window.onErrorRequestOtpAdCallback(
              'sdkSecurityKey.requestOtp8Ad error',
            ),
          100,
        );
        break;
      case 'call-exception':
        throw new Error('sdkSecurityKey.requestOtp8Ad not called');
      default:
        throw new Error('Unknown sdkSecurityKey.requestOtp8Ad behavior');
    }
  },
};

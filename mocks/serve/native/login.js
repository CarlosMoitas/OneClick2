window.sdkLogin = {
  initCryptoLogin: (publicKey, sessionId) => {
    window.console.debug('sdkLogin.initCryptoLogin', { sessionId, publicKey });
    const behavior = 'success';
    switch (behavior) {
      case 'success':
        setTimeout(() => window.onSuccessInitCryptoLoginCallback(), 100);
        break;
      case 'error':
        setTimeout(
          () =>
            window.onErrorInitCryptoLoginCallback(
              'sdkLogin.initCryptoLogin error',
            ),
          100,
        );
        break;
      case 'call-exception':
        throw new Error('sdkLogin.initCryptoLogin not called');
      default:
        throw new Error('Unknown sdkLogin.initCryptoLogin behavior');
    }
  },
  loginWithBiometric: (nonce, template) => {
    window.console.debug('sdkLogin.loginWithBiometric', { nonce, template });
    const behavior = 'manual';
    switch (behavior) {
      case 'biometria':
        setTimeout(
          () =>
            window.onSuccessLoginWithBiometricCallback(
              '[senha4 biométrica criptografada]',
            ),
          100,
        );
        break;
      case 'manual':
        setTimeout(
          () =>
            window.onErrorLoginWithBiometricCallback(
              'sdkLogin.loginWithBiometric error',
            ),
          100,
        );
        break;
      case 'call-exception':
        throw new Error('sdkLogin.loginWithBiometric not called');
      default:
        throw new Error('Unknown sdkLogin.loginWithBiometric behavior');
    }
  },
  // a entrada na verdade é a senha, só que o fortify reclama
  // este arquivo é somente de desenvolvimento
  loginWithoutBiometric: (entrada, nonce, template) => {
    window.console.debug('sdkLogin.loginWithoutBiometric', {
      entrada,
      nonce,
      template,
    });
    const behavior = 'success';
    switch (behavior) {
      case 'success':
        setTimeout(
          () =>
            window.onSuccessLoginWithoutBiometricCallback(
              `["${entrada}" criptografado]`,
            ),
          100,
        );
        break;
      case 'error':
        setTimeout(
          () =>
            window.onErrorLoginWithoutBiometricCallback(
              'sdkLogin.loginWithoutBiometric error',
            ),
          100,
        );
        break;
      case 'call-exception':
        throw new Error('sdkLogin.loginWithoutBiometric not called');
      default:
        throw new Error('Unknown sdkLogin.loginWithoutBiometric behavior');
    }
  },
  // a entrada na verdade é a senha, só que o fortify reclama
  // este arquivo é somente de desenvolvimento
  cryptoData: (entrada, nonce, template) => {
    window.console.debug('sdkLogin.cryptoData', { entrada, nonce, template });
    const behavior = 'success';
    switch (behavior) {
      case 'success':
        setTimeout(
          () =>
            window.onSuccessCryptoDataCallback(`["${entrada}" criptografado]`),
          100,
        );
        break;
      case 'error':
        setTimeout(
          () => window.onErrorCryptoDataCallback('sdkLogin.cryptoData error'),
          100,
        );
        break;
      case 'call-exception':
        throw new Error('sdkLogin.cryptoData not called');
      default:
        throw new Error('Unknown sdkLogin.cryptoData behavior');
    }
  },
};

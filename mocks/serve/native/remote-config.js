window.sdkRemoteConfig = {
  getRemoteConfig: (chave) => {
    window.console.debug('sdkRemoteConfig.getRemoteConfig', { chave });
    let value;
    switch (chave) {
      case 'ft_isHideAgencyAccountEnabled':
        value = true;
        break;
      case 'rc_hideAgencyAccount':
        value = {
          agencyCharactersToShow: 2,
          accountCharactersToShow: 3,
        };
        break;
      default:
        setTimeout(
          () =>
            window.onErrorGetRemoteConfigCallback(
              `chave ${chave} desconhecida`,
            ),
          100,
        );
        return;
    }
    setTimeout(
      () => window.onSuccessGetRemoteConfigCallback(JSON.stringify(value)),
      100,
    );
  },
};

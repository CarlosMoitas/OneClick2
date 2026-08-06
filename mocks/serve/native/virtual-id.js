window.sdkVirtualId = {
  // usado por @bradesco/bcpf-lib-device-interceptor-logging
  getHardwareInfo: () => {
    window.console.log('#Mock: sdkVirtualId.getHardwareInfo');
    setTimeout(
      () =>
        window.onSuccessGetHardwareInfoCallback({
          version: 1,
          platform: 'android',
          device: {
            board: 'goldfish_x86_64',
            brand: 'google',
            device: 'emu64x-mock',
            display: ['TE1A.220922.010', 'Tela integrada'],
            hardware: 'ranchu',
            host: 'abfarm-release-2004-0186',
            id: 'TE1A.220922.010',
            manufacturer: 'Google',
            model: 'sdk_gphone64_x86_64',
            product: 'sdk_gphone64_x86_64',
            fingerprint:
              'google/sdk_gphone64_x86_64/emu64x:13/TE1A.220922.010/9219351:user/release-keys',
            tags: 'release-keys',
            bootloader: 'unknown',
            type: 'user',
            version: {
              codename: 'REL',
              incremental: '9219351',
              release: '13',
              sdk: 33,
              baseos: '',
              securitypatch: '2022-11-05',
              previewSDK: 0,
            },
            debuggerConnected: false,
            radioVersion: '1.0.0.0',
            screen: { displayId: 0, width: 1080, height: 2280 },
            abis: ['x86_64'],
            numberOfProcessors: 4,
            androidid: 'tMnuWFLue5SdqKJxzp58/hJC/x0/6kP+eys/ls+8L8E=',
            os_version: '5.15.41-android13-8-00055-g4f5025129fe8-ab8949913',
            totalDiskSpace: '6750',
            totalMemory: '1966',
            locale: 'português',
            timeZone: 'GMT',
          },
          process: {
            packageName: 'com.bradesco',
            versionCode: 100010500,
            versionName: '4.46.0.007.003.15224.0',
            installDate: 'Tue Mar 21 12:44:06 GMT 2023',
            updateDate: 'Mon Oct 09 11:04:07 GMT 2023',
            installerName: 'com.google.android.packageinstaller',
            certificate: 'ODKNX4lgdDD6FzX4xQY6iaXh9ydRwIZR2Md8JrO8bkU=',
          },
          telephony: {
            available: true,
            simOperator: '310260',
            simOperatorName: 'T-Mobile',
            simIsoCountryCode: 'us',
            mcc: 310,
            mnc: 260,
            networkOperatorName: 'T-Mobile',
            networkCountryIso: 'us',
            isRoamingNetwork: false,
            networkType: 'LTE',
            phoneType: 'GSM',
          },
          wifi: { available: false },
          webView: {
            ua: 'Mozilla/5.0 (Linux; Android 13; sdk_gphone64_x86_64 Build/TE1A.220922.010; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.71 Mobile Safari/537.36',
          },
          camera: { available: false },
          root: false,
          dev_enabled: 0,
        }),
      30,
    );
  },
  getVirtualId: (sessao) => {
    window.console.debug('sdkVirtualId.getVirtualId', { sessao });
    setTimeout(
      () => window.onSuccessGetVirtualIdCallback(`["${sessao}" IM]`),
      100,
    );
  },
};

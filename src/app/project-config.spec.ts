import pkg from '../../package.json';
import angular from '../../angular.json';

describe('Project Configuration', () => {
  it('valida script de build', () => {
    const build = pkg.scripts.build;
    expect(build, 'Build script must be defined').toBeDefined();
    expect(build, 'Build script must contain --base-href .').toContain('--base-href .');
    expect(build, 'Build script must contain --configuration production').toContain('--configuration production');
  });
});

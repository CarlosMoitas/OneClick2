/**
 * Polyfills para suporte a iOS 15.5 com máximo de recursos TypeScript/Angular modernos.
 * iOS 15 não suporta vários métodos ES2022+ que Angular 21 espera.
 *
 * Este arquivo garante compatibilidade mantendo toda a funcionalidade moderna.
 * Cada import cobre um gap específico identificado em testes iOS 15.5.
 */

// Core-js polyfills para métodos ES2022+ faltantes em iOS 15.5
import 'core-js/actual/array/at';
import 'core-js/actual/array/find-last';
import 'core-js/actual/array/find-last-index';
import 'core-js/actual/array/to-reversed';
import 'core-js/actual/array/to-sorted';
import 'core-js/actual/object/has-own';
import 'core-js/actual/promise/any';
import 'core-js/actual/promise/with-resolvers';
import 'core-js/actual/string/replace-all';
import 'core-js/actual/string/at';
import 'core-js/actual/structured-clone';
import 'core-js/actual/object/group-by';
import 'core-js/actual/array/group-by';

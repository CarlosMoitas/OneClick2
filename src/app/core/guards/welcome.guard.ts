import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Guard para controlar acesso à página de boas-vindas
 * Permite acesso apenas no primeiro acesso do usuário
 * Utiliza localStorage com chave 'skipWelcome' para controle
 */
export const welcomeGuard: CanActivateFn = () => {
  const router = inject(Router);

  try {
    /**
     * @todo:
     * Aqui estamos usando o localStorage, mas pode ser interessante o uso do app nativo para armazenar essa flag.
     * Caso opte pelo nativo, procure saber qual o jsbridge usado no seu projeto.
     *
     * De forma geral, temos o formato webSDK usado no app do mobile pf e BNC (Bradesco Native Components) para o mobile PJ.
     * Outros canais podem ter outros formatos.
     *
     * Procure sempre priorizar o uso do BNC, pois esse será o padrão aplicado em todos os app nativos do banco.
     *
     *  */
    const skipWelcome = localStorage.getItem('skipWelcome');

    // Se já visitou, redireciona para home
    // @todo: Modifique a rota de destino se necessário
    if (skipWelcome) {
      router.navigate(['/home']);
      return false;
    }

    // Se é primeira visita, permite acesso à página de boas-vindas
    return true;
  } catch (error) {
    // Em caso de erro (ex: modo privado), permite acesso
    return true;
  }
};

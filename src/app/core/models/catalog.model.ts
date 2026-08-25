export interface CatalogEnvironmentOption {
  label: string;
  value: string;
}

export interface CatalogCard {
  id: string;
  title: string;
  project: string;
  catalogId: string;
  environments?: CatalogEnvironmentOption[];
  /**
   * Quando true, a Home exibe um campo de texto "Agência" no card,
   * permitindo que o usuário informe a agência a ser usada no payload
   * de submissão (em vez de um valor fixo no builder).
   */
  requiresAgencyInput?: boolean;
  /**
   * Caminho (relativo a `public/`) da imagem que ilustra a jornada/"mile
   * stone" deste card, exibida em um modal ao clicar no botão "Ver
   * jornada". Opcional — só é exibido o botão quando este campo existir.
   */
  journeyImage?: string;
}

export interface Catalog {
  id: string;
  label: string;
}

export interface CardEnvironmentDto {
  label: string;
  value: string;
}

export interface CardResponseDto {
  id: string;
  title: string;
  project: string;
  catalogId: string;
  environments?: CardEnvironmentDto[];
  requiresAgencyInput?: boolean;
  /**
   * Caminho (relativo a `public/`) da imagem que ilustra a jornada/"mile
   * stone" deste card, exibida em um modal ao clicar no botão "Ver
   * jornada". Opcional — só é exibido o botão quando este campo existir.
   */
  journeyImage?: string;
}

export interface ArrangementSection {
  name: string
  label: string
  startBar: number
  endBar: number
  description: string
}

export type { EnergySection, EnergyLevel, PreviewWindow } from "./arrangementGenerator"
export {
  generateArrangement,
  getEnergyLabel,
  getEnergyColor,
  getTotalBars,
  SUBGENRE_STRUCTURES,
  selectRepresentativeWindows,
  pickHighEnergy,
  pickContrast,
  clampWindowToContent,
  arrangementCacheKey,
  isRenderCacheValid,
  shouldRenderFullArrangement,
} from "./arrangementGenerator"

export interface ArrangementSection {
  name: string
  label: string
  startBar: number
  endBar: number
  description: string
}

export type { EnergySection, EnergyLevel } from "./arrangementGenerator"
export {
  generateArrangement,
  getEnergyLabel,
  getEnergyColor,
  getTotalBars,
  SUBGENRE_STRUCTURES,
} from "./arrangementGenerator"

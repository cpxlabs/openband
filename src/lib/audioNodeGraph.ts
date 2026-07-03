export type AudioNodeFactory = (ctx: AudioContext) => AudioNode

export interface PluginSlot {
  id: string
  name: string
  enabled: boolean
  factory: AudioNodeFactory
  node: AudioNode | null
}

export class AudioNodeGraph {
  private ctx: AudioContext
  private slots: PluginSlot[] = []
  private inputNode: AudioNode
  private outputNode: AudioNode | AudioDestinationNode
  private _isConnected: boolean = false

  get isConnected(): boolean {
    return this._isConnected
  }

  constructor(ctx: AudioContext, inputNode: AudioNode, outputNode: AudioNode | AudioDestinationNode) {
    this.ctx = ctx
    this.inputNode = inputNode
    this.outputNode = outputNode
  }

  addPlugin(id: string, name: string, factory: AudioNodeFactory): void {
    const slot: PluginSlot = { id, name, enabled: true, factory, node: null }
    this.slots.push(slot)
    this.rebuildChain()
  }

  removePlugin(id: string): void {
    const idx = this.slots.findIndex(s => s.id === id)
    if (idx === -1) return

    const slot = this.slots[idx]
    if (slot.node) {
      try { slot.node.disconnect() } catch {}
    }
    this.slots.splice(idx, 1)
    this.rebuildChain()
  }

  togglePlugin(id: string, enabled: boolean): void {
    const slot = this.slots.find(s => s.id === id)
    if (!slot) return
    slot.enabled = enabled
    this.rebuildChain()
  }

  movePlugin(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.slots.length) return
    if (toIndex < 0 || toIndex >= this.slots.length) return
    const [moved] = this.slots.splice(fromIndex, 1)
    this.slots.splice(toIndex, 0, moved)
    this.rebuildChain()
  }

  getSlots(): PluginSlot[] {
    return [...this.slots]
  }

  dispose(): void {
    for (const slot of this.slots) {
      if (slot.node) {
        try { slot.node.disconnect() } catch {}
        slot.node = null
      }
    }
    try { this.inputNode.disconnect() } catch {}
    this._isConnected = false
  }

  private rebuildChain(): void {
    for (const slot of this.slots) {
      if (slot.node) {
        try { slot.node.disconnect() } catch {}
        slot.node = null
      }
    }

    const activeSlots = this.slots.filter(s => s.enabled)
    if (activeSlots.length === 0) {
      try { this.inputNode.disconnect() } catch {}
      this.inputNode.connect(this.outputNode)
      this._isConnected = true
      return
    }

    for (const slot of activeSlots) {
      slot.node = slot.factory(this.ctx)
    }

    try { this.inputNode.disconnect() } catch {}
    this.inputNode.connect(activeSlots[0].node!)

    for (let i = 0; i < activeSlots.length - 1; i++) {
      activeSlots[i].node!.connect(activeSlots[i + 1].node!)
    }

    activeSlots[activeSlots.length - 1].node!.connect(this.outputNode)
    this._isConnected = true
  }
}

export function createAudioNodeGraph(
  ctx: AudioContext,
  inputNode: AudioNode,
  outputNode: AudioNode | AudioDestinationNode,
): AudioNodeGraph {
  return new AudioNodeGraph(ctx, inputNode, outputNode)
}

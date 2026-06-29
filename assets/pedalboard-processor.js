class PedalboardProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.drive = 1;
    this.level = 1;

    this.port.onmessage = (event) => {
      const { type, value } = event.data;
      if (type === "drive") this.drive = value;
      if (type === "level") this.level = value;
    };
  }

  process(inputs, outputs, _parameters) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const input = inputs[0];
    for (let channel = 0; channel < output.length; channel++) {
      const outChan = output[channel];
      const inChan = input && input.length > channel ? input[channel] : outChan;

      for (let i = 0; i < outChan.length; i++) {
        let sample = inChan[i];

        sample = Math.tanh(sample * this.drive);

        sample *= this.level;

        outChan[i] = Math.max(-1, Math.min(1, sample));
      }
    }

    return true;
  }
}

registerProcessor("pedalboard-processor", PedalboardProcessor);

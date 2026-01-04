import { Controls } from './types';

export const cpuControls: Controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false,
};

export const resetCpuControls = () => {
    cpuControls.forward = false;
    cpuControls.backward = false;
    cpuControls.left = false;
    cpuControls.right = false;
    cpuControls.brake = false;
};

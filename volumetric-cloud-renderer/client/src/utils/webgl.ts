export function checkWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return gl !== null;
  } catch (e) {
    return false;
  }
}

export function checkWebGLCompute(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2-compute');
    return gl !== null;
  } catch (e) {
    return false;
  }
}

export function getMaxTextureSize(): number {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      return gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }
  } catch (e) {
    console.warn('Could not get max texture size');
  }
  return 2048;
}

export function getMax3DTextureSize(): number {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (gl) {
      return gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);
    }
  } catch (e) {
    console.warn('Could not get max 3D texture size');
  }
  return 256;
}

export function estimateVRAM(): number {
  let estimatedVRAM = 1024;

  const maxTextureSize = getMaxTextureSize();
  if (maxTextureSize >= 16384) estimatedVRAM = 8192;
  else if (maxTextureSize >= 8192) estimatedVRAM = 4096;
  else if (maxTextureSize >= 4096) estimatedVRAM = 2048;
  else if (maxTextureSize >= 2048) estimatedVRAM = 1024;
  else estimatedVRAM = 512;

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (renderer.includes('NVIDIA') || renderer.includes('AMD') || renderer.includes('Radeon')) {
        estimatedVRAM = Math.max(estimatedVRAM, 4096);
      }
    }
  }

  return estimatedVRAM;
}

export interface WebGLInfo {
  webgl2: boolean;
  webglCompute: boolean;
  maxTextureSize: number;
  max3DTextureSize: number;
  estimatedVRAM: number;
  renderer: string;
  vendor: string;
}

export function getWebGLInfo(): WebGLInfo {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

  let renderer = 'Unknown';
  let vendor = 'Unknown';

  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    }
  }

  return {
    webgl2: checkWebGL2(),
    webglCompute: checkWebGLCompute(),
    maxTextureSize: getMaxTextureSize(),
    max3DTextureSize: getMax3DTextureSize(),
    estimatedVRAM: estimateVRAM(),
    renderer,
    vendor
  };
}

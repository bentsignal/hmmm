export const imageDeviceSizes = [640, 960, 1280, 1920, 2560] as const;

export const imageSizes = [48, 96, 160, 256, 384, 480] as const;

export const imageWidths = [...imageSizes, ...imageDeviceSizes] as const;

export type ImgWidth = (typeof imageWidths)[number];
export const largestImageWidth = (imageWidths[imageWidths.length - 1] ??
  imageWidths[0]) satisfies ImgWidth;

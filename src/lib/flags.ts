declare const __DEV__: boolean;

export const VISITOR_MODE = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

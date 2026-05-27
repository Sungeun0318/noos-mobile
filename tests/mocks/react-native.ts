export const Platform = {
  select<T>(options: { ios?: T; android?: T; default?: T }) {
    return options.default ?? options.ios ?? options.android;
  },
};

export const StyleSheet = {
  hairlineWidth: 1,
  create<T extends object>(styles: T): T {
    return styles;
  },
};

export const Easing = {
  bezier() {
    return 'bezier';
  },
};

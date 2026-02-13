// WordLog 版本配置
export const VERSION = {
  major: 1,
  minor: 11,
  patch: 0,
  build: '20260213',
  name: '查词/生图/导出与保存逻辑优化',

  // 完整版本号
  get fullVersion() {
    return `v${this.major}.${this.minor}.${this.patch}`;
  },

  // 版本描述
  get description() {
    return `${this.fullVersion} (${this.name})`;
  }
};

export default VERSION;

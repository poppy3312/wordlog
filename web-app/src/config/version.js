// WordLog 版本配置
export const VERSION = {
  major: 1,
  minor: 11,
  patch: 1,
  build: '20260213',
  name: '生图口令优化',

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

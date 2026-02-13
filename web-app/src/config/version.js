// WordLog 版本配置
export const VERSION = {
  major: 1,
  minor: 12,
  patch: 1,
  build: '20260213',
  name: '闪卡自然拼读与体验',

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

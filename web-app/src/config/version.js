// WordLog 版本配置
export const VERSION = {
  major: 1,
  minor: 12,
  patch: 3,
  build: '20260225',
  name: '配图加载容错',

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

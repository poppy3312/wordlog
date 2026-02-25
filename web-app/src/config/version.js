// WordLog 版本配置
export const VERSION = {
  major: 1,
  minor: 12,
  patch: 4,
  build: '20260225',
  name: '图片永久保存',

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

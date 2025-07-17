declare module '@alipay/mcp-server-alipay' {
  interface AlipaySdkConfig {
    appId: string;
    privateKey: string;
    alipayPublicKey: string;
    gateway?: string;
    signType?: string;
    // Add other config properties if known
  }

  interface AlipayExecOptions {
    notifyUrl?: string;
    bizContent: Record<string, any>;
    // Add other exec options if known
  }

  interface AlipayExecResult {
    code: string;
    msg: string;
    subCode?: string;
    subMsg?: string;
    qrCode?: string; // For precreate
    // Add other result properties if known
  }

  class AlipaySdk {
    constructor(config: AlipaySdkConfig);
    exec(method: string, options: AlipayExecOptions): Promise<AlipayExecResult>;
    checkRsaSign(params: Record<string, string>, sign: string, charset: string, signType: string): boolean;
    // Add other methods if known
  }

  export { AlipaySdk };
}
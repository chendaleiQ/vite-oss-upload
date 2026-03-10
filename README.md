# vite-oss-upload

将项目中打包后生产文件上传到对象存储（Aliyun OSS / Tencent COS / Tianyi Cloud / Huawei OBS）

# 功能特性

效果预览：

<img width="800" alt="image" src="https://github.com/chendaleiQ/vite-oss-upload/assets/145096764/dedc6423-c4f3-4518-ba02-43ed2582f672">

# 安装

```bash
npm i -D vite-oss-upload@latest
or
yarn add -D vite-oss-upload@latest
or
pnpm i -D vite-oss-upload@latest

```

# 基本使用

在 vite.config.js 中注册本插件

```javascript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import viteOssUpload from "vite-oss-upload";

const options = {
  provider: "aliyun", // 默认 aliyun，可选 tencent/huawei/tianyiyun（别名: cos/obs/ctyun/tianyi）
  dist: "/", // bucket根目录
  region: "<Your Region>",
  accessKeyId: "<Your Access Key ID>",
  accessKeySecret: "<Your Access Key Secret>",
  bucket: "<Your Bucket>",
  overwrite: true, // 覆盖已存在文件
};

export default defineConfig({
  plugins: [vue(), viteOssUpload(options)],
});
```

打包发布生产代码

```
npm run build
```

插件将会在打包完成后，上传 vite 配置 outDir 路径下的所有资源文件。

# 腾讯云 COS / 华为云 OBS 示例

```javascript
import { defineConfig } from "vite";
import viteOssUpload from "vite-oss-upload";

export default defineConfig({
  plugins: [
    viteOssUpload({
      provider: "tencent", // 或 "huawei"
      dist: "/",
      region: "<Your Region>",
      accessKeyId: "<Your Access Key ID>",
      accessKeySecret: "<Your Access Key Secret>",
      bucket: "<Your Bucket>",
      // endpoint 可选，不传时会按 provider + region 生成默认 endpoint
      // endpoint: "https://cos.ap-guangzhou.myqcloud.com"
    }),
  ],
});
```

> `provider` 支持别名：`cos` 等价 `tencent`，`obs` 等价 `huawei`，`ctyun`/`tianyi` 等价 `tianyiyun`。
>
> 使用 `provider: "tianyiyun"` 时，必须显式传入 `endpoint`。

# 配置项

| options         | description                                                                                    | type    | default       |
| --------------- | ---------------------------------------------------------------------------------------------- | ------- | ------------- |
| provider        | 云厂商类型：`aliyun` / `tencent` / `huawei` / `tianyiyun`（别名：`cos`/`obs`/`ctyun`/`tianyi`） | string  | `aliyun`      |
| dist            | 需要上传到 oss 上的文件目录                                                                    | string  |               |
| region          | 对象存储地域                                                                                   | string  |               |
| accessKeyId     | 对象存储访问 ID                                                                                | string  |               |
| accessKeySecret | 对象存储访问密钥                                                                               | string  |               |
| bucket          | bucket 名称                                                                                    | string  |               |
| overwrite       | 如果文件已存在，是否覆盖                                                                       | boolean | false         |
| ignore          | 文件忽略规则。如果你使用空字符串 `''`，将不会忽略任何文件                                      | string \| string[] | `[]`（即不忽略任何文件） |
| headers         | 上传请求头设置（非 Aliyun provider 会转换常见标准头）                                           | object  | {}            |
| test            | 仅测试路径，不会有文件上传                                                                     | boolean | false         |
| enabled         | 是否启用本插件                                                                                 | boolean | true          |
| endpoint        | 存储服务 endpoint（`tianyiyun` 必填，其他 provider 可选）                                       | string  |               |
| forcePathStyle  | 非 Aliyun provider 是否强制 path-style                                                          | boolean | `true`        |
| ...             | 其他初始化参数（`aliyun` 会透传给 ali-oss）                                                     | any     |               |

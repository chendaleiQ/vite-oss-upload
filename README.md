# vite-oss-upload

将项目中打包后生产文件上传到 Ali OSS

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
  dist: "/", // bucket根目录
  region: "<Your Region>",
  accessKeyId: "<Your Access Key ID>",
  accessKeySecret: "<Your Access Key Secret>",
  bucket: "<Your Bucket>",
  overwrite: true, // 覆盖已存在文件
};

const prod = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [vue(), vitePluginAliOss(options)],
});
```

打包发布生产代码

```
npm run build
```

插件将会在打包完成后，上传 vite 配置 outDir 路径下的所有资源文件。

# 配置项

| options         | description                                                                                    | type    | default       |
| --------------- | ---------------------------------------------------------------------------------------------- | ------- | ------------- |
| dist            | 需要上传到 oss 上的文件目录                                                                    | string  |               |
| region          | 阿里云 oss 地域                                                                                | string  |               |
| accessKeyId     | 阿里云 oss 访问 ID                                                                             | string  |               |
| accessKeySecret | 阿里云 oss 访问密钥                                                                            | string  |               |
| bucket          | 阿里云 oss 存储空间名称                                                                        | string  |               |
| overwrite       | 如果文件已存在，是否覆盖                                                                       | boolean | false         |
| ignore          | 文件忽略规则。如果你使用空字符串 `''`，将不会忽略任何文件                                      | boolean | `'**/*.html'` |
| headers         | 请求头设置，详细信息请见 https://www.alibabacloud.com/help/zh/doc-detail/31978.html            | object  | {}            |
| test            | 仅测试路径，不会有文件上传                                                                     | boolean | false         |
| enabled         | 是否启用本插件                                                                                 | boolean | true          |
| ...             | 其他初始化 oss 的参数，详细信息请见 https://www.alibabacloud.com/help/zh/doc-detail/64097.html | any     |               |

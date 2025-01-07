### PPAgent的聊天消息总结插件

#### 安装

##### 1、自动安装
在控制台页面点击```插件```选项，在NPM列表中找到该插件，点击```安装```按钮。

安装完成点击页面右上角```重启```按钮重启服务后，刷新控制台页面，即可在技能或者任务中使用相关功能。

##### 2、手动安装

- ```pnpm add @ppagent/plugin-summary```
- 在 ```app.ts``` 中 ```import summaryPlugin from "@ppagent/plugin-summary";```
- 在 ```app.ts``` 中 ```chat.use(summaryPlugin);```

> 代码中的详细使用可以参考 [app.ts](https://github.com/ppagent/summary/blob/main/src/app.ts)

### 使用
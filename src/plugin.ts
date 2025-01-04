import { getLogger, IPPAgentPlugin } from "ppagent";

const logger = getLogger("sample-plugin");
const plugin: IPPAgentPlugin =async (app, options) => {
    if (options?.demo) {
        logger.info(options.demo);
    }
    return {
        name: "@ppagent/plugin-sample",
        desc: "一个示例插件",
        needOnline: false,
        schema: {
            type: "object",
            properties: {
                demo: {
                    type: "string",
                    title: "示例属性",
                    "x-decorator": "FormItem",
                    "x-component": "Input",
                    "x-component-props": {
                        placeholder: "随便输入点什么，插件启动的时候会在控制台输出",
                    },
                    "x-decorator-props": {
                        tooltip: "这是一个示例用的属性",
                    },
                },
            },
        },
        init: async () => {
            logger.info("sample plugin init");
            return {};
        },
        dispose: async () => undefined,
    };
};

// 务必使用default，否则不支持通过在线配置的方式加载
export default plugin;

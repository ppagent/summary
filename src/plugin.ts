import { getLogger, IPPAgentPlugin } from "ppagent";
import { ISummarySkillOptions, SummarySkill } from "./summary.skill.js";

const logger = getLogger("summary-plugin");
const plugin: IPPAgentPlugin = async (app, options) => {
    if (options?.demo) {
        logger.info(options.demo);
    }
    return {
        name: "@ppagent/plugin-summary",
        desc: "聊天总结",
        needOnline: false,
        schema: {
            type: "object",
            properties: {},
        },
        init: async () => {
            logger.info("summary plugin init");
            return {
                skills: [{ creator: (options) => new SummarySkill(app, options as ISummarySkillOptions), params: SummarySkill.params }],
            };
        },
        dispose: async () => undefined,
    };
};

// 务必使用default，否则不支持通过在线配置的方式加载
export default plugin;

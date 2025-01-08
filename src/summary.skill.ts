import { directRunBot, filterContentRule, getLogger, IAgentChatEventData, ILogger, IMessageContentRule, ISkill, ISkillOptions, ISkillParams, PPAgent, SkillSchemaBaseProperties, SourceChatMessageType } from "ppagent";
import { getSummaryPrompts } from "./summary.js";

export interface ISummarySkillOptions extends ISkillOptions {
    triggerRule?: IMessageContentRule;
    /**
     * 默认查询的历史消息条数
     */
    defaultCount?: number;
    /**
     * 默认查询过去多久的，单位是秒，如果设置为0或者小于0，则表示不限制时间。
     */
    defaultTimeSpanInSeconds?: number;
    /**
     * 是否使用单独的模型。是的时候将使用指定的后端模型，但是不支持继续追问，否的时候使用agent中配置的后端模型，支持继续追问。
     * 默认false。
     */
    useSpecifiedBot?: boolean;
    /**
     * 指定的模型名称。
     */
    botInstanceName?: string;
    /**
     * 自定义的prompt
     */
    prompt?: string;
    /**
     * 遇到错误的时候发送的内容
     */
    errorFallback?: string;
}

export class SummarySkill implements ISkill {
    public static params: ISkillParams = {
        name: "summary-skill",
        desc: "聊天总结",
        optionsSchema: {
            type: "formily",
            formily: {
                type: "object",
                properties: {
                    ...SkillSchemaBaseProperties,
                    triggerRule: {
                        type: "object",
                        title: "触发条件",
                        "x-decorator": "FormItem",
                        properties: {
                            type: {
                                type: "string",
                                enum: [
                                    { label: "以指定内容开头", value: "startsWith" },
                                    { label: "包含指定内容", value: "contains" },
                                    { label: "在列出的内容内", value: "in" },
                                    { label: "匹配正则表达式", value: "regex" },
                                ],
                                "x-decorator": "FormItem",
                                "x-component": "Select",
                                default: "startsWith",
                            },
                            content: {
                                type: "string",
                                title: "指定内容",
                                "x-decorator": "FormItem",
                                "x-component": "Input.TextArea",
                                "x-component-props": {
                                    rows: 2,
                                    placeholder: "总结",
                                },
                                default: "总结",
                                required: true,
                            },
                        },
                        required: true,
                    },
                    defaultCount: {
                        type: "number",
                        title: "限制总结条数",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "如果用户没有指定总结的记录条数，则默认使用该数量",
                        },
                        "x-component": "NumberPicker",
                        "x-component-props": {
                            min: 5,
                            max: 500,
                        },
                        default: 100,
                        required: true,
                    },
                    defaultTimeSpanInSeconds: {
                        type: "number",
                        title: "限制总结时长（过去X秒）",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "如果配置，则在条数的基础上加上时间控制。0或者小于0表示不限制时间。",
                        },
                        "x-component": "AutoComplete",
                        enum: [
                            { label: "不限制", value: 0 },
                            { label: "1小时", value: 3600 },
                            { label: "6小时", value: 6 * 3600 },
                            { label: "12小时", value: 12 * 3600 },
                            { label: "1天", value: 86400 },
                            { label: "3天", value: 3 * 86400 },
                            { label: "一周", value: 7 * 86400 },
                            { label: "两周", value: 14 * 86400 },
                            { label: "一个月", value: 30 * 86400 },
                        ],
                        default: 0,
                        required: false,
                    },
                    useSpecifiedBot: {
                        name: "useSpecifiedBot",
                        type: "boolean",
                        title: "使用单独的模型进行总结",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "如果使用单独的模型进行总结，则不支持后续对这次总结的追问（不存储上下文）。如果使用agent中配置的后端模型，则支持后续追问。",
                        },
                        "x-component": "Switch",
                        default: false,
                    },
                    botInstanceName: {
                        type: "string",
                        title: "用于总结的模型实例",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "需要先开启使用单独的模型进行总结才能生效。",
                        },
                        "x-component": "BotSelector",
                        "x-reactions": {
                            dependencies: ["useSpecifiedBot"],
                            fulfill: {
                                state: {
                                    display: "{{$deps[0]?'visible':'none'}}",
                                },
                            },
                        },
                    },
                    prompt: {
                        type: "string",
                        title: "用于总结的提示词",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "如果不提供，则使用内置的提示词。",
                        },
                        "x-component": "Input.TextArea",
                        "x-component-props": {
                            rows: 6,
                            placeholder: "如果使用内置提示词，可留空。以双下划线开头，将被作为补充要求附加到现有提示词中。如 __请以markdown格式输出。",
                        },
                    },
                    errorFallback: {
                        type: "string",
                        title: "总结失败后给用户的提示",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "如果不提供，则使用内置的提示词。",
                        },
                        "x-component": "Input",
                        "x-component-props": {
                            placeholder: "如果不提供，则返回报错信息！",
                        },
                    },
                },
            },
        },
    };

    constructor(
        private _app: PPAgent,
        private _options: ISummarySkillOptions,
    ) {
        this._logger = getLogger(this._options.instanceName);
        this._options.defaultCount = this._options.defaultCount ?? 100;
        this._options.defaultTimeSpanInSeconds = this._options.defaultTimeSpanInSeconds ?? 0;
        if (!this._options.triggerRule?.content || !this._options.triggerRule.type) {
            throw new Error("请配置聊天总结的触发规则！");
        }
        if (this._options.useSpecifiedBot && !this._options.botInstanceName) {
            throw new Error("请配置用于总结的模型实例，或者改为使用Agent的模型！");
        }
    }

    private _logger: ILogger;

    public get options(): ISkillOptions {
        return this._options;
    }

    public get params(): ISkillParams {
        return SummarySkill.params;
    }

    public async init(): Promise<void> {
        return;
    }

    public async applyOnSource?(data: IAgentChatEventData): Promise<void> {
        if (data.message.type !== SourceChatMessageType.TEXT) {
            return;
        }
        const text = data.message.content as string;
        if (!text?.length) {
            this._logger.warn("对话内容为空");
            return;
        }
        const match = filterContentRule(text, this._options.triggerRule);
        if (!match) {
            return;
        }
        this._logger.info("匹配到总结对话规则，开始总结...");
        let count = this._options.defaultCount;
        const textArr = text.split(/\s+/g);
        if (textArr.length > 1) {
            const userNeedCount = parseInt(textArr[1]);
            if (!isNaN(count)) {
                count = userNeedCount;
                this._logger.trace("用户指定了总结条数：" + userNeedCount);
            }
        }
        const promptsRes = await getSummaryPrompts(data.message.fromId, count, this._options.defaultTimeSpanInSeconds, this._options.prompt);
        if (!promptsRes.prompts?.length) {
            data.reply(this._options.errorFallback ?? promptsRes.error ?? "总结失败！", SourceChatMessageType.TEXT);
            return;
        }
        if (!this._options.useSpecifiedBot) {
            data.message.content = promptsRes.prompts;
            this._logger.trace("使用Agent的模型进行总结");
            return;
        }
        this._logger.trace("使用自定义模型" + this._options.botInstanceName + "进行总结");
        data.message = undefined; // 结束本次回复
        try {
            const res = await directRunBot(this._app.botManager.getInstance(this._options.botInstanceName), SourceChatMessageType.TEXT, promptsRes.prompts);
            if (res.text?.length) {
                data.reply(res.text, SourceChatMessageType.TEXT);
            } else {
                data.reply(this._options.errorFallback ?? "总结失败！", SourceChatMessageType.TEXT);
            }
        } catch (error: any) {
            this._logger.error(error.message);
            data.reply(this._options.errorFallback ?? error.message, SourceChatMessageType.TEXT);
        }
    }
}

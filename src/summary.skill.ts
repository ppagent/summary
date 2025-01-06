import { IAgentChatEventData, IMessageContentRule, ISkill, ISkillOptions, ISkillParams, SkillSchemaBaseProperties, SourceChatContent, SourceChatMessageType } from "ppagent";

export interface ISummarySkillOptions extends ISkillOptions {
    triggerWords?: IMessageContentRule;
    summaryType: "count" | "timespan";
    /**
     * 默认查询的历史消息条数
     */
    defaultCount?: number;
    /**
     * 默认查询过去多久的，单位是秒
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
}

export class SummarySkill implements ISkill {
    public static params: ISkillParams = {
        name: "summary-skill",
        desc: "聊天记录总结",
        optionsSchema: {
            type: "formily",
            formily: {
                type: "object",
                properties: {
                    ...SkillSchemaBaseProperties,
                    triggerWords: {
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
                                "x-component-props": { rows: 2 },
                                required: true,
                            },
                        },
                        required: true,
                    },
                    summaryType: {
                        type: "string",
                        title: "内容选择方式",
                        "x-decorator": "FormItem",
                        "x-component": "Select",
                        enum: [
                            { label: "按数量", value: "count" },
                            { label: "按时间", value: "timespan" },
                        ],
                    },
                    defaultCount: {
                        type: "number",
                        title: "按数量-默认总结条数",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "按聊天记录数总结的时候，如果用户没有指定总结的记录条数，则默认使用该数量",
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
                        title: "按时间-默认总结时长（过去X秒）",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "按聊天记录数总结的时候，如果用户没有指定总结的记录条数，则默认使用该数量",
                        },
                        "x-component": "AutoComplete",
                        enum: [
                            { label: "1小时", value: 3600 },
                            { label: "6小时", value: 6 * 3600 },
                            { label: "12小时", value: 12 * 3600 },
                            { label: "1天", value: 86400 },
                            { label: "3天", value: 3 * 86400 },
                            { label: "一周", value: 7 * 86400 },
                            { label: "两周", value: 14 * 86400 },
                            { label: "一个月", value: 30 * 86400 },
                        ],
                        default: 86400,
                        required: true,
                    },
                },
            },
        },
    };

    public get options(): ISkillOptions {
        throw new Error("Method not implemented.");
    }

    public get params(): ISkillParams {
        throw new Error("Method not implemented.");
    }

    public async init(): Promise<void> {
        return;
    }

    public async applyOnSource?(data: IAgentChatEventData): Promise<void> {}
}

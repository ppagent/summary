import { createFakeMessage, directRunBot, getLogger, ILogger, ISkillOptions, ISource, ITaskRunner, ITaskRunnerOptions, ITaskRunnerParams, ITaskRunResult, ITaskTriggerData, PPAgent, SourceChatMessageType, TaskRunnerSchemaBaseProperties } from "ppagent";
import { getSummaryPrompts } from "./summary.js";

export interface ISummaryTaskRunnerOptions extends ISkillOptions {
    /**
     * 默认查询的历史消息条数
     */
    defaultCount?: number;
    /**
     * 默认查询过去多久的，单位是秒，如果设置为0或者小于0，则表示不限制时间。
     */
    defaultTimeSpanInSeconds?: number;
    /**
     * 指定的模型名称。
     */
    botInstanceName?: string;
    /**
     * 自定义的prompt
     */
    prompt?: string;
    /**
     * 总结的消息来源渠道，单一。
     */
    fromSource?: string;
    /**
     * 总结对象的ID，多个使用|分隔。
     */
    fromIds: string;
    /**
     * 是否打开单独推送功能
     */
    enbaleSendTo: boolean;
    /**
     * 发送的渠道
     */
    sendToSource?: string;
    /**
     * 发送的对象。如果设置，则不会再发送到fromIds中。
     */
    sendTo?: string;
}

export class SummaryTaskRunner implements ITaskRunner {
    public static params: ITaskRunnerParams = {
        name: "summary-task-runner",
        desc: "聊天总结",
        triggerConstraints: undefined,
        optionsSchema: {
            type: "formily",
            formily: {
                type: "object",
                properties: {
                    ...TaskRunnerSchemaBaseProperties,
                    fromSource: {
                        type: "string",
                        title: "总结的消息来源",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "如果后续选择了发送到指定的渠道，则这里可以不选择消息来源渠道，这样可以支持设置总结来自不同渠道的聊天记录，统一发送给同样的对象。",
                        },
                        "x-component": "SourceSelector",
                        "x-component-props": {
                            single: true,
                        },
                    },
                    fromIds: {
                        type: "string",
                        title: "总结的群/用户ID，多个使用|分隔",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "如果不知道群ID，可以先在控制台打开日志输出，然后发送一条信息到群里，就能看到 group id 相关的字样。\n 一个任务的总结是串行执行，如果要并行执行，可以创建多个任务。",
                        },
                        "x-component": "Input",
                        "x-component-props": {
                            placeholder: "请输入聊天ID，多个使用|分隔，也支持单聊消息总结。",
                        },
                        required: true,
                    },
                    defaultCount: {
                        type: "number",
                        title: "总结条数",
                        "x-decorator": "FormItem",
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
                    botInstanceName: {
                        type: "string",
                        title: "用于总结的模型实例",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "需要先开启使用单独的模型进行总结才能生效。",
                        },
                        "x-component": "BotSelector",
                        required: true,
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
                    enbaleSendTo: {
                        type: "boolean",
                        title: "单独推送给指定用户",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "开启后，消息将不会发送给被总结的群或者用户，而是发送给下方指定的用户或群。",
                        },
                        default: false,
                        "x-component": "Switch",
                    },
                    sendToSource: {
                        type: "string",
                        title: "选择一个推送渠道",
                        "x-decorator": "FormItem",
                        "x-component": "SourceSelector",
                        "x-component-props": {
                            single: true,
                        },
                        "x-reactions": {
                            dependencies: ["enbaleSendTo"],
                            fulfill: {
                                state: {
                                    display: "{{$deps[0]?'visible':'none'}}",
                                },
                            },
                        },
                    },
                    sendTo: {
                        type: "string",
                        title: "指定用户，多个使用|分隔",
                        "x-decorator": "FormItem",
                        "x-decorator-props": {
                            tooltip: "只能是同一个渠道中的用户，用户ID可以发送一条消息给对应用户后从控制台查看。",
                        },
                        "x-component": "Input",
                        "x-component-props": {
                            placeholder: "请输入接收人/群的聊天ID，多个使用|分隔。",
                        },
                        "x-reactions": {
                            dependencies: ["enbaleSendTo"],
                            fulfill: {
                                state: {
                                    display: "{{$deps[0]?'visible':'none'}}",
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    constructor(
        private _app: PPAgent,
        private _options: ISummaryTaskRunnerOptions,
    ) {
        this._logger = getLogger(this._options.instanceName);
    }

    private _logger: ILogger;

    public get options(): ITaskRunnerOptions {
        return this._options;
    }

    public get params(): ITaskRunnerParams {
        return SummaryTaskRunner.params;
    }

    public async run(data?: ITaskTriggerData): Promise<ITaskRunResult> {
        // 支持动态参数
        let options: ISummaryTaskRunnerOptions = data?.data?.runnerOptions;
        if (options) {
            options = {
                ...this._options,
                ...options,
            };
        } else {
            options = this._options;
        }
        const botInstance = this._app.botManager.getInstance(options.botInstanceName);
        if (!botInstance) {
            this._logger.error("未能找到ID为" + options.botInstanceName + "的后端模型！");
            return;
        }
        let sendSourceInstance: ISource;
        let fromSourceInstance: ISource;
        if (options.enbaleSendTo) {
            sendSourceInstance = this._app.sourceManager.getInstance(options.sendToSource);
            if (!sendSourceInstance) {
                this._logger.error("未能找到ID为" + options.sendToSource + "渠道！");
                return;
            }
            if (!options.sendTo?.length) {
                this._logger.error("配置了单独发送给指定用户，但是没有设置要发送到的用户！");
                return;
            }
        } else {
            if (!options.fromSource?.length) {
                this._logger.error("配置为推送给消息所在的群或对象，但是没有指定消息渠道！");
                return;
            }
            fromSourceInstance = this._app.sourceManager.getInstance(options.fromSource);
            if (!fromSourceInstance) {
                this._logger.error("配置为推送给消息所在的群或对象，但是指定的消息渠道不存在！");
                return;
            }
        }
        const fromIdArr = options.fromIds.split("|");
        for (const fromId of fromIdArr) {
            try {
                const promptsRes = await getSummaryPrompts(fromId, options.defaultCount ?? 100, options.defaultTimeSpanInSeconds ?? 86400, this._options.prompt);
                const res = await directRunBot(this._app.botManager.getInstance(this._options.botInstanceName), SourceChatMessageType.TEXT, promptsRes.prompts);
                if (res.text?.length) {
                    const message = createFakeMessage(SourceChatMessageType.TEXT, res.text);
                    if (options.enbaleSendTo) {
                        const ids = options.sendTo.split("|");
                        for (const id of ids) {
                            message.toInfo = [{ userId: id, userName: id }];
                            this._logger.trace("聊天总结正在发送给：" + id);
                            await sendSourceInstance.sendMessage(message);
                        }
                        this._logger.info("聊天总结发送完成");
                    } else {
                        message.toInfo = [{ userId: fromId, userName: fromId }];
                        await fromSourceInstance.sendMessage(message);
                    }
                } else {
                    this._logger.error("总结失败！");
                }
            } catch (error: any) {
                this._logger.error(error.message);
            }
        }
    }
}

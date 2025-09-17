import * as vscode from 'vscode';

export class VariableManager {
    private static variables: Record<string, string> = {};

    public static async promptForVariables(
        requiredVariables: Record<string, string>,
        globalVariables: Record<string, string> = {}
    ): Promise<Record<string, string>> {
        const variableNames = Object.keys(requiredVariables);

        if (variableNames.length === 0) {
            return globalVariables;
        }

        const result: Record<string, string> = {
            ...globalVariables,  // 全局变量优先级最低
            ...this.variables    // 缓存的变量覆盖全局变量
        };

        // 只提示那些全局变量中没有定义的变量
        const missingVariables = variableNames.filter(varName =>
            !globalVariables.hasOwnProperty(varName) || !globalVariables[varName]
        );

        if (missingVariables.length === 0) {
            console.log('All variables provided by global or cache, no input needed');
            return result;
        }

        console.log(`Need to prompt for variables: ${missingVariables.join(', ')}`);

        for (const varName of missingVariables) {
            const currentValue = result[varName] || '';
            const isFromGlobal = globalVariables.hasOwnProperty(varName);

            const newValue = await vscode.window.showInputBox({
                prompt: `Enter value for variable: ${varName}${isFromGlobal ? ' (override global)' : ''}`,
                value: currentValue,
                placeHolder: `Value for {{${varName}}}`
            });

            if (newValue === undefined) {
                // 用户取消了输入
                throw new Error('Variable input cancelled');
            }

            result[varName] = newValue;
        }

        // 保存变量值供下次使用
        this.variables = { ...this.variables, ...result };

        return result;
    }

    public static getStoredVariables(): Record<string, string> {
        return { ...this.variables };
    }

    public static setVariable(name: string, value: string): void {
        this.variables[name] = value;
    }

    public static clearVariables(): void {
        this.variables = {};
    }
}
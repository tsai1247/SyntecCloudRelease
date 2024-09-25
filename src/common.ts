import * as vscode from "vscode";
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);
const extensionName = 'synteccloudRelease';
const { Workspace, Global, WorkspaceFolder } = vscode.ConfigurationTarget;

enum messageTypes {
  Info = 'Info',
  Warning = 'Warning',
  Error = 'Error',
}

async function showMessage(message: string, type: messageTypes = messageTypes.Info): Promise<void> {
  if (type === messageTypes.Error) {
    await vscode.window.showErrorMessage(message);
  }
  else if (type === messageTypes.Warning) {
    await vscode.window.showWarningMessage(message);
  }
  else if (type === messageTypes.Info) {
    await vscode.window.showInformationMessage(message);
  }
}

function getConfig<T>(configName: string): T | undefined {
  const result = vscode.workspace.getConfiguration(extensionName).get<T>(configName);
  return result;
}

async function setConfig(configName: string, value: any, configTarget: vscode.ConfigurationTarget = Workspace): Promise<void> {
    const config = vscode.workspace.getConfiguration(extensionName);
    await config.update(configName, value, configTarget);
}

async function getUserInput(configDisplayName: string, defaultValue: string = ''): Promise<string | null> {
  vscode.window.showInputBox()
  const value = await vscode.window.showInputBox({
    placeHolder: `請輸入${configDisplayName}`,
    prompt: `請輸入${configDisplayName}`,
    value: defaultValue,
  });
  if (value) {
    return value;
  }
  return null;
}

async function getUserInputBoolean(configDisplayName: string): Promise<boolean | null> {
  const value = await vscode.window.showQuickPick([
    { label: '是' },
    { label: '否' },
  ], {
    placeHolder: configDisplayName,
  });
  if (value?.label === '是') {
    return true;
  }
  else if (value?.label === '否') {
    return false;
  }
  return null;
}

async function executeCommand(command: string, cwd: string): Promise<boolean> {
  try {
      const { stdout } = await execPromise(command, { cwd });
      console.log(stdout);
      return true;
  } catch (error) {
    return false;
  }
}

export {
  showMessage,
  getConfig,
  setConfig,
  getUserInput,
  getUserInputBoolean,
  executeCommand,
  messageTypes,
};
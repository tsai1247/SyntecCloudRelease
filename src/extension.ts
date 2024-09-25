import * as vscode from "vscode";
import { release, push, configSetting, openGitlab } from "./release";

/**
 * 啟用插件
 * @param {vscode.ExtensionContext} context - 啟用插件背景數據
 */
export function activate(context: vscode.ExtensionContext) {
  // 插入按鈕: Release Setting
  const releaseSettingButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  // 按鈕標題
  releaseSettingButton.text = "$(gear) Release Setting";
  // 按鈕觸發指令
  releaseSettingButton.command = "vscode-synteccloud-release.release-button-click";
  // tooltip
  releaseSettingButton.tooltip = "Release Setting";
  // 按鈕加入工具列
  context.subscriptions.push(releaseSettingButton);


  // 註冊指令
  const releaseSettingOptionsCommand = vscode.commands.registerCommand(
    "vscode-synteccloud-release.release", release
  );

  const pushCommand = vscode.commands.registerCommand(
    "vscode-synteccloud-release.push", push
  );

  const configSettingCommand = vscode.commands.registerCommand(
    "vscode-synteccloud-release.config-setting", configSetting
  );

  const openGitlabCommand = vscode.commands.registerCommand(
    "vscode-synteccloud-release.open", openGitlab
  );

  // 當按下按鈕時，執行的指令
  const releaseButtonClickCommand = vscode.commands.registerCommand(
    "vscode-synteccloud-release.release-button-click",
    async () => {
      const selected = await vscode.window.showQuickPick([
        'Release',
        'Push',
        'RLS相關設定',
        '開啟Gitlab'
      ]);
      if (selected === 'RLS相關設定') {
        vscode.commands.executeCommand('vscode-synteccloud-release.config-setting');
      }
      else if (selected === 'Release') {
        vscode.commands.executeCommand('vscode-synteccloud-release.release');
      }
      else if (selected === 'Push') {
        vscode.commands.executeCommand('vscode-synteccloud-release.push');
      }
      else if (selected === '開啟Gitlab') {
        vscode.commands.executeCommand('vscode-synteccloud-release.open-gitlab');
      }
    }
  );

  // 訂閱指令
  context.subscriptions.push(releaseButtonClickCommand);
  context.subscriptions.push(releaseSettingOptionsCommand);
  context.subscriptions.push(configSettingCommand);
  context.subscriptions.push(pushCommand);
  context.subscriptions.push(openGitlabCommand);

  // 顯示按鈕
  releaseSettingButton.show();
}

/**
 * 停用插件
 */
export function deactivate() {}

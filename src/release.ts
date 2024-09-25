import * as vscode from "vscode";
import { getConfig, setConfig, getUserInput, getUserInputBoolean, showMessage, executeCommand, messageTypes } from './common';

function getReleaseCommit(isSpecial: boolean, author: string, sortwareVersion: string, productVersion: string): string {
  // 顯示目前設定範本 'Release {name}_1.2.3(產品版號2.10.1A{isSpecial?"特別版": ""}) By{author}'
  return `Release v${sortwareVersion}(產品版號${productVersion}${isSpecial ? "特別版" : ""}) By${author}`;
}

function getDisplayVersion(softwareVersion: string, productVersion: string, isSpecial: boolean, clientDisplayName: string | null = null): string {
  // 顯示目前設定範本 'v2.10.1A'
  // 如果是特別版，顯示 'v{clientName}1.2.3{productVersion}'
  if (isSpecial) {
    return `${clientDisplayName}${softwareVersion}(${productVersion})`;
  }
  return `${productVersion}`;
}

function getBranchName(version: string, isSpecial: boolean, repoName: string | undefined, clientName: string | undefined): string {
  // 顯示目前設定範本 '{clientName}_{softwareVersion前兩碼 + .x}'
  if (isSpecial) {
    return `${clientName}_${version.split('.').slice(0, 2).join('.')}.x`;
  }
  else {
    return `${repoName}_${version.split('.').slice(0, 2).join('.')}.x`;
  }
}

async function configSetting() {
  // 取得預設值
  const defaultAuthor = getConfig<string>('author');
  const defaultRepoName = getConfig<string>('repoName');
  const defeaultClientDisplayName = getConfig<string>('clientDisplayName');
  const defaultClientName = getConfig<string>('clientName');

  // 設定人員名稱
  const author = await getUserInput('人員名稱', defaultAuthor);
  if(author) {
    await setConfig('author', author, vscode.ConfigurationTarget.Global);
    showMessage('人員名稱設定成功');
  }
  else {
    showMessage('動作取消', messageTypes.Error);
    return;
  }

  // 設定是否為特別版
  const isSpecial = await getUserInputBoolean('是否為特別版');
  if(isSpecial !== null) {
    if (isSpecial) {
      // 設定專案客戶名稱(對外顯示中文)
      const clientDisplayName = await getUserInput('專案客戶名稱(對外顯示中文)', defeaultClientDisplayName);
      // 設定專案客戶名稱(分支用英文)
      const clientName = await getUserInput('專案客戶名稱(分支用英文)', defaultClientName);
      if(clientDisplayName) {
        await setConfig('clientDisplayName', clientDisplayName);
      }
      if(clientName) {
        await setConfig('clientName', clientName);
      }
      showMessage(`專案設定為${clientDisplayName}特別版(${clientName})`);
    }
    else {
      // 設定方隊名稱
      const repoName = await getUserInput('方隊名稱', defaultRepoName);
      if(repoName) {
        await setConfig('repoName', repoName);
        showMessage('方隊名稱設定成功');
      }
      else {
        showMessage('動作取消', messageTypes.Error);
        return;
      }
      showMessage(`專案設定為 ${repoName} 標準版`);
    }
    await setConfig('isSpecial', isSpecial);
  }
  else {
    showMessage('動作取消', messageTypes.Error);
  }
}

async function release() {
  // 取得設定
  const author = getConfig<string>('author');
  const isSpecial = getConfig<boolean>('isSpecial');
  const repoName = getConfig<string>('repoName');
  const clientName = getConfig<string>('clientName');
  const clientDisplayName = getConfig<string>('clientDisplayName');
  // 檢查以上設定是否存在
  if (!author || isSpecial === undefined) {
    showMessage('請先設定人員名稱、是否為特別版', messageTypes.Error);
    return;
  }

  // 若是特別版，檢查是否有設定專案客戶名稱
  if (isSpecial && (!clientName || !clientDisplayName)) {
    showMessage('請先設定專案客戶名稱', messageTypes.Error);
    return;
  }

  if (!isSpecial && !repoName) {
    showMessage('請先設定方隊名稱', messageTypes.Error);
    return;
  }

  // 輸入 軟體版本號
  const defaultSoftwareVersion = getConfig<string>('softwareVersion');
  const softwareVersion = await getUserInput('軟體版本號', defaultSoftwareVersion);
  await setConfig('softwareVersion', softwareVersion, vscode.ConfigurationTarget.Global);
  if (!softwareVersion || softwareVersion === '') {
    showMessage('動作取消', messageTypes.Error);
    return;
  };

  // 輸入 產品版本號
  const defaultProductVersion = getConfig<string>('productVersion');
  const productVersion = await getUserInput('產品版本號', defaultProductVersion);
  await setConfig('productVersion', productVersion, vscode.ConfigurationTarget.Global);
  if (!productVersion || productVersion === '') {
    showMessage('動作取消', messageTypes.Error);
    return;
  }

  // 再次跟使用者確認，使用輸入release commit 的方式，預設為 getReleaseCommit()
  const defaultReleaseCommit = getReleaseCommit(isSpecial, author, softwareVersion, productVersion);
  const releaseCommit = await getUserInput('commit message', defaultReleaseCommit);
  if (!releaseCommit || releaseCommit === '') {
    showMessage('動作取消', messageTypes.Error);
    return;
  }

  // 再次跟使用者確認，使用輸入productionVersion 的方式，預設為getDisplayVersion()
  const defaultDisplayVersion = getDisplayVersion(softwareVersion, productVersion, isSpecial, clientDisplayName);
  const displayVersion = await getUserInput('前端底部版本號', defaultDisplayVersion);
  if (!displayVersion || displayVersion === '') {
    showMessage('動作取消', messageTypes.Error);
    return;
  }

  // 再次跟使用者確認，使用輸入branchName 的方式，預設為getBranchName()
  const defaultBranchName = getBranchName(softwareVersion, isSpecial, repoName, clientName);
  const branchName = await getUserInput('分支名稱', defaultBranchName);
  if (!branchName || branchName === '') {
    showMessage('動作取消', messageTypes.Error);
    return;
  }
      
  // 開始Release
  vscode.window.showInformationMessage('開始Release');
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    showMessage('No workspace folder open', messageTypes.Error);
    return;
  }
  const cwd = workspaceFolder.uri.fsPath;

  // Step 0: git reset HEAD --hard
  await executeCommand('git pull', cwd);

  // Step 1: 修改 package.json，將 version 欄位改為 softwareVersion
  const npmVersionSuccess = await executeCommand(`npm version ${softwareVersion}`, cwd);

  if (npmVersionSuccess) {
    // Step 1-2: git tag -d v{softwareVersion}
    await executeCommand(`git tag -d v${softwareVersion}`, cwd);
  }

  // Step 2: 修改 public/globalVariable.js，將 version 欄位改為 {isSpecial?name:""}productVersion
  // 取得globalVariable.js路徑
  const workFolder = vscode.workspace.workspaceFolders?.[0]?.uri.path;
  const globalVariablePath: vscode.Uri = vscode.Uri.file(`${workFolder}/publish/globalVariable.js`);
  
  // 寫入 globalVariable.js
  const newRemoteSettingFile = new TextEncoder().encode(`window.productVersion = '${displayVersion}';`);
  
  // 先檢查是否有這個檔案
  try {
    const stat = await vscode.workspace.fs.stat(globalVariablePath);
    if (stat.type === vscode.FileType.File) {
      await vscode.workspace.fs.writeFile(globalVariablePath, newRemoteSettingFile);
    }
  } catch (error) {}



  // Step 4: git add .
  await executeCommand('git add .', cwd);

  if (npmVersionSuccess) {
    // Step 5: git commit -m `Release ${name}_${softwareVersion}(產品版號${productVersion}${isSpecial?"特別版": ""}) By${author}`
    await executeCommand(`git commit --amend -m "build: ${releaseCommit}" --allow-empty`, cwd);
  }
  else {
    // Step 5: git commit -m `Release ${name}_${softwareVersion}(產品版號${productVersion}${isSpecial?"特別版": ""}) By${author}`
    await executeCommand(`git commit -m "build: ${releaseCommit}" --allow-empty`, cwd);
  }

  // Step 6: git tag {softwareVersion} -m `Release ${name}_${softwareVersion}(產品版號${productVersion}${isSpecial?"特別版": ""})`
  const success = await executeCommand(`git tag ${softwareVersion} -m "${releaseCommit}"`, cwd);
  if (!success) {
    // 詢問是否覆蓋tag
    const selected = await vscode.window.showWarningMessage('Tag已存在，是否覆蓋？', '是', '否');
    if (selected === '是') {
      showMessage('覆蓋Tag...');
      executeCommand(`git tag -f ${softwareVersion} -m "${releaseCommit}"`, cwd);
    }
  }
  
  // Step 7: git branch {name}_{softwareVersion前兩碼 + .x}
  await executeCommand(`git branch ${branchName}`, cwd);
  await setConfig('branchName', branchName, vscode.ConfigurationTarget.Global);
  
  showMessage(`成功Release ${softwareVersion}`);
  showMessage(`分支：${branchName}, tag: ${softwareVersion}`);
}

async function push() {
  // 取得分支名稱
  const defaultBranchName = getConfig<string>('branchName');
  const branchName = await getUserInput('分支名稱', defaultBranchName);
  if (!branchName || branchName === '') {
    showMessage('動作取消', messageTypes.Error);
    return;
  }

  // 取得tag名稱
  const defaultSoftwareVersion = getConfig<string>('softwareVersion');
  const softwareVersion = await getUserInput('tag名稱', defaultSoftwareVersion);
  if (!softwareVersion || softwareVersion === '') {
    showMessage('動作取消', messageTypes.Error);
    return;
  }

  // 開始Push
  showMessage('開始Push');

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    showMessage('No workspace folder open', messageTypes.Error);
    return;
  }
  const cwd = workspaceFolder.uri.fsPath;

  await executeCommand(`git push`, cwd);
  await executeCommand(`git push origin ${branchName}:${branchName}`, cwd);

  const success = await executeCommand(`git push origin ${softwareVersion}`, cwd);
  if (!success) {
    // 詢問是否覆蓋tag
    const selected = await vscode.window.showWarningMessage('Tag已存在，是否覆蓋？', '是', '否');
    if (selected === '是') {
      showMessage('覆蓋Tag...');
      await executeCommand(`git push -f origin ${softwareVersion}`, cwd);
    }
  }


  showMessage(`成功Push: 分支 ${branchName}, tag ${softwareVersion}`);
}

async function openGitlab() {
  // start $(git config --get remote.origin.url | ForEach-Object { $_ -replace '\.git$' })
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    showMessage('No workspace folder open', messageTypes.Error);
    return;
  }
  const cwd = workspaceFolder.uri.fsPath;
  await executeCommand('start $(git config --get remote.origin.url | ForEach-Object { $_ -replace \'.git$\' })', cwd);
}

export {
  configSetting,
  release,
  push,
  openGitlab,
};
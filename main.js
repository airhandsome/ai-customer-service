const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
const config = require('./config.json');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 创建新的聊天会话
async function createChat(chatName) {
  try {
    const response = await axios.post(
      `${config.api.baseUrl}${config.api.createChatPath}`,
      {
        name: chatName,
        dataset_ids: [],
      },
      {
        headers: {
          'Authorization': `Bearer ${config.api.key}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('创建聊天会话失败:', error);
    throw error;
  }
}

// 获取AI回复
async function getAIResponse(chatId, messages) {
  try {
    const response = await axios.post(
      `${config.api.baseUrl}${config.api.chatCompletionsPath.replace('{chat_id}', chatId)}`,
      {
        model: 'model',
        messages: messages,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${config.api.key}`,
          'Content-Type': 'application/json'
        }
      }
    );    
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('获取AI回复失败:', error);
    throw error;
  }
}

// 处理渲染进程发来的消息
ipcMain.handle('create-chat', async (event, { chatName }) => {
  return await createChat(chatName);
});

ipcMain.handle('get-ai-response', async (event, { chatId, messages }) => {
  return await getAIResponse(chatId, messages);
});

// 处理窗口控制
ipcMain.on('window-min', () => {
    console.log("minimize");
  mainWindow.minimize();
});

ipcMain.on('window-close', () => {
    console.log("close");
  mainWindow.close();
});

// 处理窗口控制
ipcMain.on('window-min', () => {
  mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  mainWindow.close();
});
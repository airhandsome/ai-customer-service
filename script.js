// 移除不需要的ipcRenderer导入，因为我们使用window.electron
let currentCustomerId = '1';
let currentChatId = null;
let customerData = {
  '1': { messageHistory: [], aiSuggestions: [] },
  '2': { messageHistory: [], aiSuggestions: [] },
  '3': { messageHistory: [], aiSuggestions: [] },
  '4': { messageHistory: [], aiSuggestions: [] }
};

// 切换客户
async function switchCustomer(customerId) {
  // 更新当前客户ID
  currentCustomerId = customerId;
  
  // 更新UI显示
  document.querySelectorAll('.customer-item').forEach(item => {
    item.classList.remove('active');
  });
  const selectedCustomer = document.querySelector(`.customer-item[onclick*="switchCustomer('${customerId}')"]`);
  if (selectedCustomer) {
    selectedCustomer.classList.add('active');
  }
  
  // 检查并初始化chat_id
  try {
    const storedChatId = localStorage.getItem(`chat_id_${currentCustomerId}`);
    
    if (storedChatId) {
      currentChatId = storedChatId;
      console.log(`使用已存在的chat_id: ${currentChatId}`);
    } else {
      const result = await window.electron.invoke('create-chat', {
        chatName: `用户${currentCustomerId}的聊天`
      });
      if (result.code != 0){
        // 重新申请chatId
        result = await window.electron.invoke('create-chat', {
          chatName: `用户${currentCustomerId}的聊天` + Math.floor(Math.random() * 1000)
        });
      }

      currentChatId = result.data.id;
      localStorage.setItem(`chat_id_${currentCustomerId}`, currentChatId);
      console.log(`创建新的chat_id: ${currentChatId}`);
    }
  } catch (error) {
    console.error('初始化聊天失败:', error);
  }
  
  // 清空并重新加载消息历史
  const messagesDiv = document.getElementById('messages');
  const aiSuggestionsDiv = document.getElementById('aiSuggestions');
  messagesDiv.innerHTML = '';
  aiSuggestionsDiv.innerHTML = '';
  
  // 加载当前客户的消息历史
  const customerMessages = customerData[customerId].messageHistory;
  customerMessages.forEach(msg => {
    displayMessage(msg.role, msg.content);
  });
  
  // 加载当前客户的AI建议
  const customerSuggestions = customerData[customerId].aiSuggestions;
  customerSuggestions.forEach(suggestion => {
    displayAISuggestion(suggestion);
  });
}

// 初始化
window.onload = function() {
  // 初始化时自动切换到第一个客户
  switchCustomer('1');
  // 绑定模拟消息按钮点击事件
  document.getElementById('mockMessageBtn')?.addEventListener('click', sendMockMessage);
};

// 发送消息
function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if (!message) return;

  // 显示客服消息
  displayMessage('assistant', message);
  input.value = '';

  // 更新消息历史
  customerData[currentCustomerId].messageHistory.push({ role: 'assistant', content: message });
}

// 处理客户消息
async function handleCustomerMessage(message) {
  // 显示客户消息
  displayMessage('user', message);

  // 更新消息历史
  customerData[currentCustomerId].messageHistory.push({ role: 'user', content: message });

  // 显示加载动画
  const suggestionsDiv = document.getElementById('aiSuggestions');
  const loadingSpinner = document.createElement('div');
  loadingSpinner.className = 'loading-spinner';
  loadingSpinner.style.display = 'block';
  suggestionsDiv.appendChild(loadingSpinner);

  // 获取AI建议回复
  try {
    const messages = customerData[currentCustomerId].messageHistory;
    const response = await window.electron.invoke('get-ai-response', {
      chatId: currentChatId,
      messages: [{ role: 'user', content: message }]
    });
   
    // 移除加载动画
    loadingSpinner.remove();

    // 添加AI建议
    const aiSuggestion = response.choices[0].message.content;
    displayAISuggestion(aiSuggestion);
    customerData[currentCustomerId].aiSuggestions.push(aiSuggestion);
  } catch (error) {
    console.error('获取AI建议回复失败:', error);
    // 发生错误时也要移除加载动画
    loadingSpinner.remove();
  }
}

// 显示消息
function displayMessage(role, content) {
  const messagesDiv = document.getElementById('messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  messageDiv.textContent = content;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 显示AI建议
// 显示AI建议
function displayAISuggestion(content) {
  const suggestionsDiv = document.getElementById('aiSuggestions');
  const suggestionDiv = document.createElement('div');
  suggestionDiv.className = 'ai-suggestion';

  // 提取<think>标签中的内容
  const thinkMatch = content.match(/<think>(.*?)<\/think>/s);
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;
  const mainContent = content.replace(/<think>.*?<\/think>/s, '').trim();

  // 如果存在思考内容，显示在深度思考区域
  if (thinkContent) {
    const thinkDiv = document.getElementById('thinkContent');
    const thinkBodyDiv = document.getElementById('thinkBody');
    thinkDiv.style.display = 'block';
    thinkBodyDiv.textContent = thinkContent;
  }

  // 显示主要内容
  suggestionDiv.textContent = mainContent;

  const useButton = document.createElement('button');
  useButton.className = 'use-suggestion';
  useButton.textContent = '使用此回复';
  useButton.onclick = () => {
    document.getElementById('messageInput').value = mainContent;
  };

  suggestionDiv.appendChild(useButton);
  suggestionsDiv.appendChild(suggestionDiv);
  suggestionsDiv.scrollTop = suggestionsDiv.scrollHeight;
}

// 切换深度思考区域的显示状态
function toggleThink() {
  const thinkBody = document.getElementById('thinkBody');
  const toggleIcon = document.querySelector('.toggle-icon');
  if (thinkBody.style.display === 'none') {
    thinkBody.style.display = 'block';
    toggleIcon.textContent = '▼';
  } else {
    thinkBody.style.display = 'none';
    toggleIcon.textContent = '▶';
  }
}

// 初始化
window.onload = function() {
  // 绑定模拟消息按钮点击事件
  document.getElementById('mockMessageBtn')?.addEventListener('click', sendMockMessage);
};

// 绑定回车键发送消息
document.getElementById('messageInput')?.addEventListener('keypress', function(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

// 模拟客户消息
const mockMessages = [
  "肾虚怎么治疗",
  "发烧感冒怎么办",
  "咳嗽怎么治疗",
  "失眠怎么办",
  "糖尿病怎么治疗",
  "高血压怎么治疗",
  "感冒怎么治疗",
  "感冒咳嗽怎么治疗",
];

function sendMockMessage() {
  const randomIndex = Math.floor(Math.random() * mockMessages.length);
  const mockMessage = mockMessages[randomIndex];
  handleCustomerMessage(mockMessage);
}
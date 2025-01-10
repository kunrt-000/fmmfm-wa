document.addEventListener('DOMContentLoaded', function () {
  // 获取需要的元素
  const contactFile = document.getElementById('contactFile');
  const newContactInput = document.getElementById('newContact');
  const addContactBtn = document.getElementById('addContactBtn');
  const contactList = document.getElementById('contactList');
  const modal = document.getElementById('templateModal');
  const closeBtn = document.querySelector('.close');
  const editBtns = document.querySelectorAll('.edit-btn');
  const saveTemplateBtn = document.getElementById('saveTemplateBtn');
  const templateImageInput = document.getElementById('templateImage');
  const templateCaptionInput = document.getElementById('templateCaption');
  const instanceModal = document.getElementById('instanceModal');
  const instanceModalBtn = document.getElementById('instanceModalBtn');
  const instanceCloseBtn = instanceModal.querySelector('.close');
  const instancesContainer = document.getElementById('instances');
  const addInstanceBtn = document.getElementById('addInstanceBtn');
  let currentTemplate = null;
  const sendBtn = document.createElement('button');
  sendBtn.textContent = '发送消息';
  document.querySelector('.container').appendChild(sendBtn);
  const exportBtn = document.createElement('button');
  exportBtn.textContent = '导出联系人';
  document.querySelector('.contact-management').appendChild(exportBtn);

  // 存储联系人数据
  let contacts = [];

  // 存储模板数据
  let templates = {
    "1": { image: null, caption: null },
    "2": { image: null, caption: null },
    "3": { image: null, caption: null },
    "4": { image: null, caption: null },
  };
  // 存储实例数据
  let instances = [];

  //  session status
  let sessions = [];

  async function fetchSessionStatus() {
    try {
      const response = await fetch('/sessions')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json()
      sessions = data
      renderSessions()
    } catch (error) {
      console.error("获取session状态失败", error);
      alert('获取session状态失败')
    }
  }

  function renderSessions() {
    if (!sessionsList) return;
    sessionsList.innerHTML = sessions.map(session => `
             <div class="scan-code-item">
                 <div>
                    <h3 class="font-semibold text-gray-800">${session.id}</h3>
                      <p class="text-sm text-gray-600">Status: ${session.status}</p>
                      ${session.error ? `<p class="text-sm text-red-600">${session.error}</p>` : ''}
                 </div>
             </div>
             `).join('');
    lucide.createIcons();
  }
  // 上传文件处理
  contactFile.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const contents = e.target.result;
        const lines = contents.split('\n');
        lines.forEach(function (line) {
          const cleanedLine = line.trim(); //移除行首尾的空格
          if (cleanedLine) {
            contacts.push(cleanedLine); //仅推送非空行
          }
        });
        updateContactList();
      };
      reader.readAsText(file);
    }
  });

  // 添加联系人处理
  addContactBtn.addEventListener('click', function () {
    const newContact = newContactInput.value.trim();
    if (newContact) {
      contacts.push(newContact);
      newContactInput.value = '';
      updateContactList();
    }
  });

  // 初始化联系人列表
  function updateContactList() {
    contactList.innerHTML = '';
    contacts.forEach(function (contact, index) {
      const li = document.createElement('li');

      const input = document.createElement('input');
      input.type = 'text';
      input.value = contact;
      input.disabled = true; //初始禁用
      li.appendChild(input);

      const editBtn = document.createElement('button');
      editBtn.textContent = "编辑";
      editBtn.addEventListener('click', function () {
        input.disabled = false;
        input.focus(); // 聚焦到输入框，方便编辑
        editBtn.style.display = 'none';// 隐藏编辑按钮
        saveBtn.style.display = 'inline-block'; //显示保存按钮

      });
      li.appendChild(editBtn);

      const saveBtn = document.createElement('button');
      saveBtn.textContent = '保存';
      saveBtn.style.display = 'none'; //初始隐藏
      saveBtn.addEventListener('click', function () {
        contacts[index] = input.value;
        input.disabled = true;
        saveBtn.style.display = 'none';
        editBtn.style.display = 'inline-block';
      });
      li.appendChild(saveBtn);


      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '删除';
      deleteBtn.classList.add('delete-btn'); // 添加删除按钮的class
      deleteBtn.addEventListener('click', function () {
        contacts.splice(index, 1);
        updateContactList();
      });
      li.appendChild(deleteBtn);
      const statusSpan = document.createElement('span');
      statusSpan.classList.add('status');
      statusSpan.textContent = '等待发送';
      li.appendChild(statusSpan);

      contactList.appendChild(li);
    });
  }
  //点击编辑按钮弹出模态框
  editBtns.forEach(function (button) {
    button.addEventListener('click', function () {
      currentTemplate = button.getAttribute('data-template');
      const preview = document.querySelector(`.template-preview[data-template-id="${currentTemplate}"]`);
      const imageSrc = preview.querySelector('img').getAttribute('src');
      const captionText = preview.querySelector('.caption-area p').innerText;

      templateCaptionInput.value = captionText;
      //将图片的base64编码保存
      templateImageInput.dataset.imageSrc = imageSrc;
      modal.style.display = "block";
    });
  });

  // 关闭弹出框
  closeBtn.addEventListener('click', function () {
    modal.style.display = 'none';
    templateImageInput.value = '';//清空上传图片输入框
  });
  window.addEventListener('click', function (event) {
    if (event.target == modal) {
      modal.style.display = 'none';
      templateImageInput.value = '';//清空上传图片输入框
    }
  });

  // 保存模板内容
  saveTemplateBtn.addEventListener('click', function () {
    const newCaption = templateCaptionInput.value;
    // 处理图片上传并更新预览
    const file = templateImageInput.files[0];
    const templatePreview = document.querySelector(`.template-preview[data-template-id="${currentTemplate}"]`);
    const imageArea = templatePreview.querySelector('.image-area');
    const captionArea = templatePreview.querySelector('.caption-area p');

    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        imageArea.innerHTML = `<img src="${e.target.result}" alt="模板图片" class="template-image"/>`;
        captionArea.innerText = newCaption;

        templates[currentTemplate] = { image: e.target.result, caption: newCaption } //保存数据
      };
      reader.readAsDataURL(file);
    } else {
      captionArea.innerText = newCaption;
      templates[currentTemplate] = { image: templateImageInput.dataset.imageSrc, caption: newCaption };
    }
    modal.style.display = 'none';
    templateImageInput.value = '';//清空上传图片输入框
  });


  //初始化模板预览
  function initTemplatePreview() {
    const previews = document.querySelectorAll('.template-preview');
    previews.forEach(function (preview, index) {
      const templateId = preview.getAttribute('data-template-id')
      const savedImage = templates[templateId].image;
      const savedCaption = templates[templateId].caption;

      if (savedImage) {
        preview.querySelector('.image-area').innerHTML = `<img src="${savedImage}" alt="模板图片" class="template-image"/>`;
      }
      if (savedCaption) {
        preview.querySelector('.caption-area p').innerText = savedCaption;
      }
    });
  }
  initTemplatePreview();

  //  管理实例
  instanceModalBtn.addEventListener('click', function () {
    instanceModal.style.display = 'block';
    updateInstanceList();
  });
  instanceCloseBtn.addEventListener('click', function () {
    instanceModal.style.display = 'none';
  });
  window.addEventListener('click', function (event) {
    if (event.target == instanceModal) {
      instanceModal.style.display = 'none';
    }
  });

  //添加实例
  addInstanceBtn.addEventListener('click', async function () {
    const instanceId = `temp_${Date.now()}`;
    const instanceToken = `temp_token_${Date.now()}`;
    const newInstance = { instanceId: instanceId, token: instanceToken, status: null, qrCode: null };
    instances.push(newInstance);
    updateInstanceList();
    const itemIndex = instances.length - 1
    const item = document.getElementById(`instance-${itemIndex}`)
    const statusArea = item.querySelector('.status-area');
    try {
      const response = await fetch(`/instance/qr/${instanceId}?token=${instanceToken}`, {
        method: 'GET',
      });
      const data = await response.json()
      if (data.qrCode) {
        const qrCode = data.qrCode;
        newInstance.qrCode = qrCode;
        let qrImg = item.querySelector('img');
        if (!qrImg) {
          qrImg = document.createElement("img");
          qrImg.style.width = "100px"
          qrImg.style.height = "100px";
          item.appendChild(qrImg)
        }
        qrImg.src = qrCode;
        alert("请使用手机扫描二维码进行认证")
        checkStatus(newInstance, statusArea, itemIndex);
      } else {
        statusArea.textContent = '获取二维码失败'
        alert("获取二维码失败:" + data.message);
      }
    } catch (error) {
      statusArea.textContent = '获取二维码失败'
      alert("发生错误:", error);
    }
  });

  //更新实例列表
  function updateInstanceList() {
    instancesContainer.innerHTML = '';
    instances.forEach(function (instance, index) {
      const item = document.createElement('div');
      item.classList.add('instance-item');
      const instanceIdInput = document.createElement('input');
      instanceIdInput.type = 'text';
      instanceIdInput.value = instance.instanceId;
      instanceIdInput.disabled = true;
      item.appendChild(instanceIdInput);

      const instanceTokenInput = document.createElement('input');
      instanceTokenInput.type = 'text';
      instanceTokenInput.value = instance.token;
      instanceTokenInput.disabled = true;
      item.appendChild(instanceTokenInput);

      const statusArea = document.createElement('div');
      statusArea.classList.add('status-area');
      statusArea.textContent = instance.status || "未认证";

      item.appendChild(statusArea);

      const qrBtn = document.createElement('button');
      qrBtn.textContent = "扫描二维码";
      qrBtn.addEventListener('click', async function () {
        const instanceId = instanceIdInput.value;
        const token = instanceTokenInput.value;
        try {
          const response = await fetch(`/instance/qr/${instanceId}?token=${token}`, {
            method: 'GET',
          })
          const data = await response.json()
          if (data.qrCode) {
            const qrCode = data.qrCode;
            instance.qrCode = qrCode;
            let qrImg = item.querySelector('img');
            if (!qrImg) {
              qrImg = document.createElement("img");
              qrImg.style.width = "100px"
              qrImg.style.height = "100px";
              item.appendChild(qrImg)
            }
            qrImg.src = qrCode;
            alert("请使用手机扫描二维码进行认证")
            checkStatus(instance, statusArea, index);
          } else {
            statusArea.textContent = '获取二维码失败'
            alert("获取二维码失败:" + data.message);
          }
        } catch (error) {
          statusArea.textContent = '获取二维码失败'
          alert("发生错误:", error);
        }
      });
      item.appendChild(qrBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', function () {
        instances.splice(index, 1);
        updateInstanceList();
      });
      item.appendChild(deleteBtn)
      item.id = `instance-${index}`;
      instancesContainer.appendChild(item);
    });
  }
  function checkStatus(instance, statusArea, index) {
    // 每隔一段时间检查实例状态
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/instance/me/${instance.instanceId}?token=${instance.token}`, {
          method: 'GET',
        })
        const data = await response.json()
        if (data.status === "authenticated") {
          clearInterval(intervalId);
          instances[index].status = '已认证';
          statusArea.textContent = '已认证';
          alert("实例认证成功");
        }
        else if (data.message) {
          clearInterval(intervalId);
          instances[index].status = '未认证';
          statusArea.textContent = `认证失败 ${data.message}`;
        }
        else {
          instances[index].status = '未认证';
          statusArea.textContent = '未认证';
        }
      } catch (error) {
        clearInterval(intervalId);
        statusArea.textContent = '未认证';
        alert("发生错误: " + error)
      }
    }, 5000);
  }
  async function readContacts() {
    try {
      if (instances.filter(item => item.status === '已认证').length == 0) {
        alert("请先添加实例并完成认证!");
        return;
      }
      const response = await fetch('/read-contacts', {
        method: 'POST'
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json()
      contacts = data
      updateContactList();
    } catch (error) {
      console.error("读取联系人失败", error);
      alert('读取联系人失败:' + error.message)
    }
  }
  // 发送消息
  sendBtn.addEventListener('click', function () {
    if (contacts.length === 0) {
      alert("请添加联系人！");
      return;
    }
    let selectedTemplate = null
    for (let templateId in templates) {
      if (templates[templateId].caption) {
        selectedTemplate = templates[templateId];
        break;
      }
    }
    if (!selectedTemplate) {
      alert("请编辑消息模板！")
      return;
    }
    if (instances.length === 0) {
      alert("请添加实例！")
      return;
    }
    let validInstance = false;
    for (let instance of instances) {
      if (instance.status === "已认证") {
        validInstance = true;
        break;
      }
    }
    if (!validInstance) {
      alert("请认证实例！")
      return;
    }

    const data = {
      contacts: contacts,
      template: selectedTemplate,
      instances: instances,
    };
    fetch('/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert("消息发送任务已提交！详细信息请查看控制台");
          console.log("详细发送结果:", data.results);
          data.results.forEach(function (item, index) {
            const contactItem = contactList.children[index];
            if (contactItem) {
              const statusSpan = contactItem.querySelector('.status');
              if (item.result.success) {
                statusSpan.textContent = '发送成功';
              } else {
                statusSpan.textContent = '发送失败';
              }
            }
          });
        } else {
          alert(`消息发送失败: ${data.message}`);
          console.error(data);
        }
      })
      .catch(error => {
        alert("发生错误:", error);
      });
  });
  // 导出联系人列表
  exportBtn.addEventListener('click', function () {
    if (contacts.length === 0) {
      alert("联系人列表为空！");
      return;
    }
    const csvContent = contacts.join("\n");
    const blob = new Blob([csvContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  fetchSessionStatus()
});
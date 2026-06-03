const API_BASE = 'http://localhost:5000/api';
const TOKEN_KEY = 'waste2wealth_jwt';

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

document.addEventListener('DOMContentLoaded', () => {
  setActiveNavLink();
  initWasteForm();
  initJobButtons();
  initProductButtons();
  initAuthForms();
  initAiChat();
});

function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
  document.querySelectorAll('nav a').forEach(link => {
    const href = link.getAttribute('href')?.split('/').pop().toLowerCase();
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

function initWasteForm() {
  const form = document.querySelector('#wastform');
  if (!form) return;

  const nameInput = form.querySelector('#name');
  const locationInput = form.querySelector('#location');
  const wasteTypeInput = form.querySelector('#waste-type');
  const quantityInput = form.querySelector('#quantity');
  const desiredInput = form.querySelector('#desired-product');

  const listContainer = document.createElement('div');
  listContainer.className = 'waste-list';
  form.insertAdjacentElement('afterend', listContainer);

  let wasteRequests = loadWasteRequests();
  renderWasteRequests(wasteRequests, listContainer);

  form.addEventListener('submit', event => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const location = locationInput.value.trim();
    const type = wasteTypeInput.value;
    const quantity = quantityInput.value.trim();
    const desiredProduct = desiredInput.value.trim();

    if (!name || !location || !type || !quantity) {
      alert('Please complete all required fields.');
      return;
    }

    const newRequest = {
      name,
      location,
      type,
      quantity,
      desiredProduct,
      submittedAt: new Date().toISOString()
    };

    wasteRequests.push(newRequest);
    saveWasteRequests(wasteRequests);
    renderWasteRequests(wasteRequests, listContainer);
    alert('Waste request submitted successfully.');
    form.reset();
  });
}

function loadWasteRequests() {
  try {
    return JSON.parse(localStorage.getItem('wasteRequests') || '[]');
  } catch (error) {
    return [];
  }
}

function saveWasteRequests(wasteRequests) {
  localStorage.setItem('wasteRequests', JSON.stringify(wasteRequests));
}

function renderWasteRequests(wasteRequests, container) {
  container.innerHTML = '';

  if (!wasteRequests.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'No waste requests yet. Submit your request using the form above.';
    container.appendChild(emptyMessage);
    return;
  }

  const title = document.createElement('h3');
  title.textContent = 'Saved Waste Requests';
  container.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'request-list';

  wasteRequests.forEach((request, index) => {
    const item = document.createElement('li');
    item.innerHTML = `
      <span><strong>${request.name}</strong> — ${request.type} | ${request.quantity} | ${request.location}${request.desiredProduct ? ` → ${request.desiredProduct}` : ''}</span>
    `;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      wasteRequests.splice(index, 1);
      saveWasteRequests(wasteRequests);
      renderWasteRequests(wasteRequests, container);
    });

    item.appendChild(deleteButton);
    list.appendChild(item);
  });

  container.appendChild(list);
}

function initJobButtons() {
  document.querySelectorAll('.job-card button').forEach(button => {
    button.addEventListener('click', () => {
      const jobTitle = button.closest('.job-card')?.querySelector('h3')?.textContent || 'this job';
      alert(`Thanks for your interest! We will connect you with the worker for "${jobTitle}".`);
    });
  });
}

function initProductButtons() {
  document.querySelectorAll('.product-card button').forEach(button => {
    button.addEventListener('click', () => {
      const productName = button.closest('.product-card')?.querySelector('h3')?.textContent || 'this product';
      alert(`Great choice! "${productName}" has been added to your cart (demo).`);
    });
  });
}

function initAuthForms() {
  const loginForm = document.querySelector('#login-form');
  const registerForm = document.querySelector('#register-form');
  const authMessage = document.querySelector('#auth-message');

  if (authMessage) {
    if (getAuthToken()) {
      authMessage.textContent = 'You are already logged in. You can now use the AI assistant on the home page.';
      authMessage.classList.add('auth-success');
    } else {
      authMessage.textContent = 'Register or log in to access the AI assistant and upload waste images.';
      authMessage.classList.add('auth-note');
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      const email = loginForm.querySelector('#login-email')?.value.trim();
      const password = loginForm.querySelector('#login-password')?.value.trim();

      if (!email || !password) {
        alert('Please enter both email and password to log in.');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Unable to log in');
        }

        setAuthToken(result.token);
        alert(`Welcome back! You are signed in as ${email}.`);
        loginForm.reset();
        window.location.href = 'index.html';
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async event => {
      event.preventDefault();
      const name = registerForm.querySelector('#register-name')?.value.trim();
      const email = registerForm.querySelector('#register-email')?.value.trim();
      const password = registerForm.querySelector('#register-password')?.value.trim();
      const role = registerForm.querySelector('#register-role')?.value;

      if (!name || !email || !password || !role) {
        alert('Please fill in all registration fields.');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, password, role }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Unable to register');
        }

        setAuthToken(result.token);
        alert(`Thank you for registering, ${name}! You are now signed in.`);
        registerForm.reset();
        window.location.href = 'index.html';
      } catch (error) {
        alert(error.message);
      }
    });
  }
}

function initAiChat() {
  const chatForm = document.querySelector('#ai-chat-form');
  const chatWindow = document.querySelector('#chat-window');
  const status = document.querySelector('#chat-status');
  const fileInput = document.querySelector('#waste-image');

  if (!chatForm || !chatWindow || !status) {
    return;
  }

  const token = getAuthToken();
  if (!token) {
    status.textContent = 'You must log in first on the Login page to ask the AI assistant for waste suggestions.';
    chatForm.querySelector('button')?.setAttribute('disabled', 'disabled');
    return;
  }

  status.textContent = 'AI assistant ready. Upload a photo if you want and ask for a waste transformation idea.';

  chatForm.addEventListener('submit', async event => {
    event.preventDefault();
    const messageInput = document.querySelector('#chat-input');
    const message = messageInput?.value.trim();

    if (!message) {
      alert('Please enter a question or description for the AI.');
      return;
    }

    const userMessage = `Waste request: ${message}`;
    appendChatMessage('user', userMessage);
    status.textContent = 'Sending your request to the AI...';
    chatForm.querySelector('button')?.setAttribute('disabled', 'disabled');

    try {
      let imageUrl = null;
      const file = fileInput?.files?.[0];
      if (file) {
        const uploadResult = await uploadWasteImage(file);
        imageUrl = uploadResult.imageUrl;
        appendChatMessage('user', `Uploaded image: ${uploadResult.filename}`);
      }

      const aiResponse = await sendAiChatMessage(message, imageUrl);
      appendChatMessage('ai', aiResponse);
      status.textContent = 'AI assistant replied. You can continue the conversation or upload another photo.';
      messageInput.value = '';
      fileInput.value = '';
    } catch (error) {
      status.textContent = 'Unable to reach the AI assistant. Please try again later.';
      appendChatMessage('ai', `Error: ${error.message}`);
    } finally {
      chatForm.querySelector('button')?.removeAttribute('disabled');
    }
  });
}

function appendChatMessage(role, text) {
  const chatWindow = document.querySelector('#chat-window');
  if (!chatWindow) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function uploadWasteImage(file) {
  const formData = new FormData();
  formData.append('wasteImage', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Image upload failed.');
  }
  return result;
}

async function sendAiChatMessage(message, imageUrl) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ message, imageUrl }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'AI request failed.');
  }

  return result.reply;
}
